<?php

namespace App\Models;

use App\Enums\DocumentType;
use App\Enums\SriStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id', 'branch_id', 'order_id', 'customer_id', 'issued_by', 'document_type',
    'establishment_code', 'emission_point', 'sequential', 'access_key', 'sri_status',
    'sri_authorization', 'sri_authorized_at', 'sri_message', 'is_contingency',
    'customer_name', 'customer_document', 'customer_email', 'subtotal', 'tax_amount',
    'total', 'xml_payload', 'payload', 'void_reason', 'voided_at',
])]
class FiscalDocument extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'sri_status' => SriStatus::class,
            'sri_authorized_at' => 'datetime',
            'is_contingency' => 'boolean',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total' => 'decimal:2',
            'payload' => 'array',
            'voided_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function formattedNumber(): string
    {
        return "{$this->establishment_code}-{$this->emission_point}-{$this->sequential}";
    }
}
