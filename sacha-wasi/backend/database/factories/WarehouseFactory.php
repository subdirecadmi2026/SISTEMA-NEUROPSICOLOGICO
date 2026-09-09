<?php

namespace Database\Factories;

use App\Enums\WarehouseType;
use App\Models\Branch;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Warehouse>
 */
class WarehouseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'company_id' => fn (array $attributes) => Branch::query()->find($attributes['branch_id'])?->company_id,
            'code' => 'BOD',
            'name' => 'Bodega principal',
            'type' => WarehouseType::General,
            'is_default' => true,
            'is_active' => true,
        ];
    }
}
