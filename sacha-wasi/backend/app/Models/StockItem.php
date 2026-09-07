<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id',
    'warehouse_id',
    'product_id',
    'qty_on_hand',
    'qty_reserved',
    'min_qty',
    'max_qty',
    'reorder_qty',
    'avg_cost',
])]
class StockItem extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'qty_on_hand' => 'decimal:4',
            'qty_reserved' => 'decimal:4',
            'min_qty' => 'decimal:4',
            'max_qty' => 'decimal:4',
            'reorder_qty' => 'decimal:4',
            'avg_cost' => 'decimal:4',
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

    public function qtyAvailable(): string
    {
        return bcsub((string) $this->qty_on_hand, (string) $this->qty_reserved, 4);
    }

    public function isBelowMinimum(): bool
    {
        return bccomp((string) $this->qty_on_hand, (string) $this->min_qty, 4) <= 0
            && bccomp((string) $this->min_qty, '0', 4) > 0;
    }
}
