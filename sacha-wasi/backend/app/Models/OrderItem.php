<?php

namespace App\Models;

use App\Enums\KitchenStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'order_id', 'product_id', 'kitchen_station_id', 'name', 'quantity', 'unit_price',
    'discount_amount', 'tax_rate', 'tax_amount', 'line_total', 'unit_cost',
    'line_cost', 'kitchen_status', 'notes', 'modifiers', 'fired_at', 'ready_at',
])]
class OrderItem extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_rate' => 'decimal:4',
            'tax_amount' => 'decimal:2',
            'line_total' => 'decimal:2',
            'unit_cost' => 'decimal:4',
            'line_cost' => 'decimal:4',
            'kitchen_status' => KitchenStatus::class,
            'modifiers' => 'array',
            'fired_at' => 'datetime',
            'ready_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function kitchenStation(): BelongsTo
    {
        return $this->belongsTo(KitchenStation::class);
    }
}
