<?php

namespace Database\Factories;

use App\Enums\InventoryBehavior;
use App\Enums\ProductStatus;
use App\Enums\ProductType;
use App\Models\Company;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'company_id' => Company::factory(),
            'base_unit_id' => Unit::factory(),
            'type' => ProductType::Ingredient,
            'status' => ProductStatus::Active,
            'inventory_behavior' => InventoryBehavior::Tracked,
            'name' => ucfirst($name),
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'sku' => 'SW-'.strtoupper(Str::random(8)),
            'default_cost' => 1.5,
            'default_price' => 0,
            'tracks_lots' => true,
            'is_sellable' => false,
            'is_purchasable' => true,
        ];
    }

    public function prepared(): static
    {
        return $this->state(fn () => [
            'type' => ProductType::Prepared,
            'inventory_behavior' => InventoryBehavior::RecipeExploded,
            'is_sellable' => true,
            'is_purchasable' => false,
            'tracks_lots' => false,
            'default_price' => 8.5,
        ]);
    }
}
