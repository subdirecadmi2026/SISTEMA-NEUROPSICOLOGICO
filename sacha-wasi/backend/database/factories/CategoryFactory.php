<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'company_id' => Company::factory(),
            'name' => ucfirst($name),
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'color' => '#3D6B4F',
            'sort_order' => 0,
            'is_active' => true,
            'show_on_pos' => true,
            'show_on_qr_menu' => true,
        ];
    }
}
