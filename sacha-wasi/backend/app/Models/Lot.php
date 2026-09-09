<?php

namespace App\Models;

use App\Enums\LotStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id',
    'warehouse_id',
    'product_id',
    'lot_code',
    'expires_at',
    'manufactured_at',
    'qty_on_hand',
    'unit_cost',
    'status',
])]
class Lot extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'expires_at' => 'date',
            'manufactured_at' => 'date',
            'qty_on_hand' => 'decimal:4',
            'unit_cost' => 'decimal:4',
            'status' => LotStatus::class,
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
