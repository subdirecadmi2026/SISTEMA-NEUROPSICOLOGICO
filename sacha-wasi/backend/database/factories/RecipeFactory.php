<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Recipe;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Recipe>
 */
class RecipeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory()->prepared(),
            'company_id' => fn (array $attributes) => Product::query()->find($attributes['product_id'])?->company_id,
            'yield_unit_id' => fn (array $attributes) => Product::query()->find($attributes['product_id'])?->base_unit_id
                ?? Unit::factory(),
            'name' => 'Receta estándar',
            'version' => 1,
            'yield_quantity' => 1,
            'process_waste_percent' => 0,
            'is_active' => true,
        ];
    }
}
