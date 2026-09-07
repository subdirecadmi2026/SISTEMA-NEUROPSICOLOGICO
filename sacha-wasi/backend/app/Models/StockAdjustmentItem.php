<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'adjustment_id',
    'product_id',
    'lot_id',
    'qty_before',
    'qty_after',
    'reason_code',
])]
class StockAdjustmentItem extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'qty_before' => 'decimal:4',
            'qty_after' => 'decimal:4',
        ];
    }

    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(StockAdjustment::class, 'adjustment_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }
}
