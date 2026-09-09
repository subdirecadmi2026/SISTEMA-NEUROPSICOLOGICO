<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'recipe_id',
    'component_product_id',
    'unit_id',
    'quantity',
    'waste_percent',
    'sort_order',
    'notes',
])]
class RecipeItem extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'waste_percent' => 'decimal:4',
            'sort_order' => 'integer',
        ];
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'component_product_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function quantityWithWaste(): string
    {
        $factor = bcadd('1', bcdiv((string) $this->waste_percent, '100', 8), 8);

        return bcmul((string) $this->quantity, $factor, 8);
    }
}
