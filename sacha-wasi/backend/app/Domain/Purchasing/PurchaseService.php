<?php

namespace App\Domain\Purchasing;

use App\Domain\Audit\AuditLogger;
use App\Domain\Inventory\KardexService;
use App\Enums\PurchaseStatus;
use App\Enums\StockMovementType;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseService
{
    public function __construct(
        private readonly KardexService $kardex,
        private readonly AuditLogger $audit,
    ) {}

    public function create(array $data, User $user): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $user) {
            $items = $data['items'] ?? [];
            unset($data['items']);
            $data['company_id'] = $user->company_id;
            $data['requested_by'] = $user->id;
            $data['status'] = PurchaseStatus::Draft;
            $data['number'] ??= $this->nextNumber($user->company_id);

            $order = PurchaseOrder::query()->create($data);

            foreach ($items as $item) {
                $order->items()->create($item);
            }

            $this->recalculate($order);
            $this->audit->record('purchase.create', $order, $user);

            return $order->fresh(['items.product', 'supplier', 'warehouse']);
        });
    }

    public function approve(PurchaseOrder $order, User $user): PurchaseOrder
    {
        if ($order->status !== PurchaseStatus::Draft) {
            throw new InvalidArgumentException('Solo se aprueban órdenes en borrador.');
        }

        $order->status = PurchaseStatus::Approved;
        $order->approved_by = $user->id;
        $order->approved_at = now();
        $order->save();
        $this->audit->record('purchase.approve', $order, $user);

        return $order->fresh(['items.product', 'supplier']);
    }

    public function receive(PurchaseOrder $order, User $user): PurchaseOrder
    {
        if (! in_array($order->status, [PurchaseStatus::Approved, PurchaseStatus::Draft], true)) {
            throw new InvalidArgumentException('Esta orden no puede recibirse.');
        }

        return DB::transaction(function () use ($order, $user) {
            $order->loadMissing(['items.product', 'warehouse']);

            foreach ($order->items as $item) {
                $qty = Decimal::sub((string) $item->quantity_ordered, (string) $item->quantity_received, 4);
                if (Decimal::cmp($qty, '0', 4) <= 0) {
                    continue;
                }

                $this->kardex->receive(
                    warehouse: $order->warehouse,
                    product: $item->product,
                    quantity: $qty,
                    unitCost: (string) $item->unit_cost,
                    lotCode: $item->lot_code ?: ('OC-'.$order->number),
                    expiresAt: $item->expires_at?->toDateString(),
                    type: StockMovementType::PurchaseReceipt,
                    user: $user,
                    notes: "Recepción OC {$order->number}",
                    referenceType: $order->getMorphClass(),
                    referenceId: $order->id,
                );

                $item->quantity_received = $item->quantity_ordered;
                $item->save();
            }

            $order->status = PurchaseStatus::Received;
            $order->received_at = now();
            if (! $order->approved_at) {
                $order->approved_by = $user->id;
                $order->approved_at = now();
            }
            $order->save();
            $this->audit->record('purchase.receive', $order, $user);

            return $order->fresh(['items.product', 'supplier', 'warehouse']);
        });
    }

    public function recalculate(PurchaseOrder $order): void
    {
        $order->loadMissing('items');
        $subtotal = '0';
        foreach ($order->items as $item) {
            $subtotal = Decimal::add($subtotal, Decimal::mul((string) $item->quantity_ordered, (string) $item->unit_cost), 2);
        }
        $tax = Decimal::mul($subtotal, '0.15', 2);
        $order->subtotal = $subtotal;
        $order->tax = $tax;
        $order->total = Decimal::add($subtotal, $tax, 2);
        $order->save();
    }

    private function nextNumber(string $companyId): string
    {
        $count = PurchaseOrder::query()->where('company_id', $companyId)->count() + 1;

        return 'OC-'.now()->format('Ymd').'-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }
}
