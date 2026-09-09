<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Branch>
 */
class BranchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code' => 'MATRIZ',
            'name' => 'Matriz Quito',
            'email' => 'quito@sachawasi.ec',
            'phone' => '+593 2 000 0001',
            'address' => 'La Floresta',
            'city' => 'Quito',
            'sri_establishment_code' => '001',
            'is_production_plant' => false,
            'is_active' => true,
        ];
    }
}
