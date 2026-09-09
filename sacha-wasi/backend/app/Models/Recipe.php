<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\RecipeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id',
    'product_id',
    'yield_unit_id',
    'name',
    'version',
    'yield_quantity',
    'process_waste_percent',
    'cached_unit_cost',
    'notes',
    'is_active',
])]
class Recipe extends Model
{
    /** @use HasFactory<RecipeFactory> */
    use BelongsToCompany, HasFactory, HasUlids;

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'yield_quantity' => 'decimal:4',
            'process_waste_percent' => 'decimal:4',
            'cached_unit_cost' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function yieldUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'yield_unit_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RecipeItem::class)->orderBy('sort_order');
    }
}
