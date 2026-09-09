<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'combo_product_id',
    'component_product_id',
    'quantity',
    'is_optional',
    'sort_order',
])]
class ProductComboItem extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'is_optional' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function combo(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'combo_product_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'component_product_id');
    }
}
