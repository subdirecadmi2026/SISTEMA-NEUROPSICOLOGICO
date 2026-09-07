<?php

namespace App\Domain\Fiscal;

use App\Domain\Audit\AuditLogger;
use App\Enums\DocumentType;
use App\Enums\SriStatus;
use App\Models\Branch;
use App\Models\Company;
use App\Models\FiscalDocument;
use App\Models\FiscalSequence;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FiscalService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function issueFromOrder(Order $order, User $user, DocumentType $type = DocumentType::Invoice): FiscalDocument
    {
        return DB::transaction(function () use ($order, $user, $type) {
            $order->loadMissing(['items', 'customer', 'branch.company', 'payments']);
            $branch = $order->branch;
            $company = $branch->company ?? Company::query()->findOrFail($order->company_id);
            $sequence = $this->nextSequence($branch, $type);
            $sequential = str_pad((string) $sequence, 9, '0', STR_PAD_LEFT);
            $establishment = $branch->sri_establishment_code ?: '001';
            $emissionPoint = '001';
            $ruc = preg_replace('/\D+/', '', (string) $company->ruc) ?: '0000000000001';
            $accessKey = $this->accessKey($ruc, $type, $establishment, $emissionPoint, $sequential);
            $contingency = (bool) data_get($company->settings, 'sri_contingency', false);

            $customer = $order->customer;
            $payload = $this->payload($order, $company, $branch, $type, $establishment, $emissionPoint, $sequential, $accessKey);
            $xml = $this->xml($payload);

            $document = FiscalDocument::query()->create([
                'company_id' => $order->company_id,
                'branch_id' => $order->branch_id,
                'order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'issued_by' => $user->id,
                'document_type' => $type,
                'establishment_code' => $establishment,
                'emission_point' => $emissionPoint,
                'sequential' => $sequential,
                'access_key' => $accessKey,
                'is_contingency' => $contingency,
                'sri_status' => $contingency ? SriStatus::Contingency : SriStatus::Pending,
                'sri_message' => $contingency
                    ? 'Emitido en contingencia. Reintentar autorización cuando el SRI esté disponible (simulador).'
                    : 'En cola del simulador SRI (ambiente de pruebas).',
                'customer_name' => $customer?->name ?? $order->guest_name ?? 'CONSUMIDOR FINAL',
                'customer_document' => $customer?->document_number ?? '9999999999999',
                'customer_email' => $customer?->email,
                'subtotal' => $order->subtotal,
                'tax_amount' => $order->tax_amount,
                'total' => $order->total,
                'xml_payload' => $xml,
                'payload' => $payload,
            ]);

            if (! $contingency) {
                $this->simulateAuthorize($document);
            }

            $this->audit->record('fiscal.issue', $document, $user, new: [
                'number' => $document->formattedNumber(),
                'sri_status' => $document->sri_status->value,
                'simulator' => true,
            ]);

            return $document->fresh();
        });
    }

    public function retry(FiscalDocument $document, User $user): FiscalDocument
    {
        if ($document->sri_status === SriStatus::Authorized) {
            return $document;
        }

        if ($document->sri_status === SriStatus::Voided) {
            throw new \InvalidArgumentException('No se puede autorizar un comprobante anulado.');
        }

        $document->is_contingency = false;
        $this->simulateAuthorize($document);
        $this->audit->record('fiscal.retry', $document, $user);

        return $document->fresh();
    }

    public function void(FiscalDocument $document, User $user, string $reason): FiscalDocument
    {
        $document->sri_status = SriStatus::Voided;
        $document->void_reason = $reason;
        $document->voided_at = now();
        $document->sri_message = 'Anulado en simulador SRI.';
        $document->save();

        $this->audit->record('fiscal.void', $document, $user, new: ['reason' => $reason]);

        return $document->fresh();
    }

    private function simulateAuthorize(FiscalDocument $document): void
    {
        $document->sri_status = SriStatus::Authorized;
        $document->sri_authorization = 'SIM-'.now()->format('YmdHis').'-'.substr($document->access_key, -8);
        $document->sri_authorized_at = now();
        $document->sri_message = 'Autorizado por el simulador SRI (ambiente de pruebas). No es un comprobante real del SRI.';
        $document->save();
    }

    private function nextSequence(Branch $branch, DocumentType $type): int
    {
        $row = FiscalSequence::query()
            ->where('branch_id', $branch->id)
            ->where('document_type', $type)
            ->lockForUpdate()
            ->first();

        if (! $row) {
            $row = FiscalSequence::query()->create([
                'company_id' => $branch->company_id,
                'branch_id' => $branch->id,
                'document_type' => $type,
                'establishment_code' => $branch->sri_establishment_code ?: '001',
                'emission_point' => '001',
                'next_number' => 1,
            ]);
            $row = FiscalSequence::query()->lockForUpdate()->findOrFail($row->id);
        }

        $number = $row->next_number;
        $row->next_number = $number + 1;
        $row->save();

        return $number;
    }

    private function accessKey(
        string $ruc,
        DocumentType $type,
        string $establishment,
        string $emissionPoint,
        string $sequential,
    ): string {
        $date = now()->timezone('America/Guayaquil')->format('dmY');
        $ruc = str_pad(substr($ruc, 0, 13), 13, '0', STR_PAD_LEFT);
        $numeric = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
        $body = $date
            .$type->sriCode()
            .$ruc
            .'1'
            .str_pad($establishment, 3, '0', STR_PAD_LEFT)
            .str_pad($emissionPoint, 3, '0', STR_PAD_LEFT)
            .$sequential
            .$numeric
            .'1';

        return $body.$this->checkDigit($body);
    }

    private function checkDigit(string $body): string
    {
        $factors = [2, 3, 4, 5, 6, 7];
        $sum = 0;
        $factorIndex = 0;
        for ($i = strlen($body) - 1; $i >= 0; $i--) {
            $sum += ((int) $body[$i]) * $factors[$factorIndex % 6];
            $factorIndex++;
        }
        $mod = 11 - ($sum % 11);
        if ($mod === 11) {
            return '0';
        }
        if ($mod === 10) {
            return '1';
        }

        return (string) $mod;
    }

    private function payload(
        Order $order,
        Company $company,
        Branch $branch,
        DocumentType $type,
        string $establishment,
        string $emissionPoint,
        string $sequential,
        string $accessKey,
    ): array {
        return [
            'ambiente' => '1',
            'simulador' => true,
            'aviso' => 'Comprobante generado por el simulador Sacha Wasi. No tiene validez tributaria real.',
            'tipo' => $type->value,
            'sri_code' => $type->sriCode(),
            'clave_acceso' => $accessKey,
            'establecimiento' => $establishment,
            'punto_emision' => $emissionPoint,
            'secuencial' => $sequential,
            'emisor' => [
                'ruc' => $company->ruc,
                'razon_social' => $company->legal_name ?: $company->name,
                'nombre_comercial' => $company->trade_name,
                'direccion' => $branch->address,
            ],
            'items' => $order->items->map(fn ($item) => [
                'descripcion' => $item->name,
                'cantidad' => $item->quantity,
                'precio' => $item->unit_price,
                'total' => $item->line_total,
            ])->all(),
            'totales' => [
                'subtotal' => $order->subtotal,
                'iva' => $order->tax_amount,
                'total' => $order->total,
            ],
        ];
    }

    private function xml(array $payload): string
    {
        $esc = fn ($v) => htmlspecialchars((string) $v, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $items = '';
        foreach ($payload['items'] as $item) {
            $items .= '<detalle>'
                .'<descripcion>'.$esc($item['descripcion']).'</descripcion>'
                .'<cantidad>'.$esc($item['cantidad']).'</cantidad>'
                .'<precioUnitario>'.$esc($item['precio']).'</precioUnitario>'
                .'<precioTotalSinImpuesto>'.$esc($item['total']).'</precioTotalSinImpuesto>'
                .'</detalle>';
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<factura id="comprobante" version="1.1.0">'
            .'<infoTributaria>'
            .'<ambiente>1</ambiente>'
            .'<tipoEmision>1</tipoEmision>'
            .'<razonSocial>'.$esc($payload['emisor']['razon_social']).'</razonSocial>'
            .'<nombreComercial>'.$esc($payload['emisor']['nombre_comercial']).'</nombreComercial>'
            .'<ruc>'.$esc($payload['emisor']['ruc']).'</ruc>'
            .'<claveAcceso>'.$esc($payload['clave_acceso']).'</claveAcceso>'
            .'<codDoc>'.$esc($payload['sri_code']).'</codDoc>'
            .'<estab>'.$esc($payload['establecimiento']).'</estab>'
            .'<ptoEmi>'.$esc($payload['punto_emision']).'</ptoEmi>'
            .'<secuencial>'.$esc($payload['secuencial']).'</secuencial>'
            .'</infoTributaria>'
            .'<detalles>'.$items.'</detalles>'
            .'<infoAdicional><campoAdicional nombre="aviso">'.$esc($payload['aviso']).'</campoAdicional></infoAdicional>'
            .'</factura>';
    }
}
