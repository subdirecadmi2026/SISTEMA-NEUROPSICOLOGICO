<?php

namespace App\Models;

use App\Enums\InventoryBehavior;
use App\Enums\ProductStatus;
use App\Enums\ProductType;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

#[Fillable([
    'company_id',
    'category_id',
    'base_unit_id',
    'purchase_unit_id',
    'tax_rate_id',
    'kitchen_station_id',
    'type',
    'status',
    'inventory_behavior',
    'name',
    'slug',
    'description',
    'sku',
    'barcode',
    'image_path',
    'default_cost',
    'default_price',
    'prep_time_minutes',
    'tracks_lots',
    'is_sellable',
    'is_purchasable',
    'allergens',
    'metadata',
])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use BelongsToCompany, HasFactory, HasUlids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => ProductType::class,
            'status' => ProductStatus::class,
            'inventory_behavior' => InventoryBehavior::class,
            'default_cost' => 'decimal:4',
            'default_price' => 'decimal:2',
            'prep_time_minutes' => 'integer',
            'tracks_lots' => 'boolean',
            'is_sellable' => 'boolean',
            'is_purchasable' => 'boolean',
            'allergens' => 'array',
            'metadata' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Product $product): void {
            if (! $product->slug) {
                $product->slug = Str::slug($product->name).'-'.Str::lower(Str::random(4));
            }

            if (! $product->sku) {
                $product->sku = 'SW-'.strtoupper(Str::random(8));
            }

            if ($product->type instanceof ProductType) {
                $product->inventory_behavior ??= $product->type->defaultInventoryBehavior();
                $product->is_sellable ??= $product->type->defaultSellable();
                $product->is_purchasable ??= $product->type->defaultPurchasable();
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'base_unit_id');
    }

    public function purchaseUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'purchase_unit_id');
    }

    public function taxRate(): BelongsTo
    {
        return $this->belongsTo(TaxRate::class);
    }

    public function kitchenStation(): BelongsTo
    {
        return $this->belongsTo(KitchenStation::class);
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class);
    }

    public function activeRecipe(): HasOne
    {
        return $this->hasOne(Recipe::class)->where('is_active', true)->latestOfMany('version');
    }

    public function optionGroups(): HasMany
    {
        return $this->hasMany(ProductOptionGroup::class)->orderBy('sort_order');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function comboItems(): HasMany
    {
        return $this->hasMany(ProductComboItem::class, 'combo_product_id')->orderBy('sort_order');
    }

    public function channelPrices(): HasMany
    {
        return $this->hasMany(ProductChannelPrice::class);
    }

    public function branchSettings(): HasMany
    {
        return $this->hasMany(ProductBranchSetting::class);
    }

    public function availabilityWindows(): HasMany
    {
        return $this->hasMany(ProductAvailabilityWindow::class);
    }

    public function stockItems(): HasMany
    {
        return $this->hasMany(StockItem::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    public function marginPercent(): ?string
    {
        if ((float) $this->default_price <= 0) {
            return null;
        }

        $profit = (float) $this->default_price - (float) $this->default_cost;

        return number_format(($profit / (float) $this->default_price) * 100, 2, '.', '');
    }
}
