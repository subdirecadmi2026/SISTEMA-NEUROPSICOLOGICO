<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'product_id',
    'name',
    'sku',
    'barcode',
    'option_ids',
    'price_override',
    'cost_override',
    'is_default',
    'is_active',
])]
class ProductVariant extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'option_ids' => 'array',
            'price_override' => 'decimal:2',
            'cost_override' => 'decimal:4',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
