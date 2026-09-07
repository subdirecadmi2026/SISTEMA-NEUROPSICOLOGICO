<?php

namespace App\Models;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'company_id', 'branch_id', 'warehouse_id', 'dining_table_id', 'customer_id',
    'user_id', 'cash_session_id', 'rider_id', 'delivery_zone_id', 'number',
    'client_ulid', 'channel', 'status', 'guest_name', 'covers', 'subtotal',
    'discount_amount', 'tax_amount', 'tip_amount', 'delivery_fee', 'total',
    'cost_total', 'inventory_committed', 'notes', 'delivery_address',
    'delivery_status', 'sent_to_kitchen_at', 'paid_at', 'cancelled_at', 'cancel_reason',
])]
class Order extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'channel' => OrderChannel::class,
            'status' => OrderStatus::class,
            'covers' => 'integer',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'tip_amount' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'total' => 'decimal:2',
            'cost_total' => 'decimal:4',
            'inventory_committed' => 'boolean',
            'sent_to_kitchen_at' => 'datetime',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function fiscalDocuments(): HasMany
    {
        return $this->hasMany(FiscalDocument::class);
    }

    public function latestFiscalDocument(): HasOne
    {
        return $this->hasOne(FiscalDocument::class)->latestOfMany();
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(DiningTable::class, 'dining_table_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function cashSession(): BelongsTo
    {
        return $this->belongsTo(CashSession::class);
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [OrderStatus::Open, OrderStatus::InKitchen, OrderStatus::Ready, OrderStatus::Delivered], true);
    }
}
