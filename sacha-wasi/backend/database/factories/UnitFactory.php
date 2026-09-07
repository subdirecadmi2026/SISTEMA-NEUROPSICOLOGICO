<?php

namespace Database\Factories;

use App\Enums\UnitDimension;
use App\Models\Company;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'name' => 'Gramo',
            'symbol' => 'g',
            'dimension' => UnitDimension::Mass,
            'factor_to_base' => 1,
            'is_system' => true,
        ];
    }
}
