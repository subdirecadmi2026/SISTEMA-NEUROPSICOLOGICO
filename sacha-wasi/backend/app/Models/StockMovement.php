<?php

namespace App\Models;

use App\Domain\Inventory\ImmutableKardexException;
use App\Enums\StockMovementType;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'company_id',
    'branch_id',
    'warehouse_id',
    'product_id',
    'lot_id',
    'unit_id',
    'user_id',
    'type',
    'direction',
    'quantity',
    'unit_cost',
    'total_cost',
    'balance_after',
    'reference_type',
    'reference_id',
    'notes',
    'occurred_at',
])]
class StockMovement extends Model
{
    use BelongsToCompany, HasUlids;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'quantity' => 'decimal:4',
            'unit_cost' => 'decimal:4',
            'total_cost' => 'decimal:4',
            'balance_after' => 'decimal:4',
            'occurred_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): void {
            throw new ImmutableKardexException;
        });

        static::deleting(function (): void {
            throw new ImmutableKardexException;
        });
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
