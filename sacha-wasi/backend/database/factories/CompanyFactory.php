<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        $ruc = fake()->numerify('17##########');

        return [
            'name' => 'Sacha Wasi',
            'trade_name' => 'Sacha Wasi',
            'ruc' => $ruc,
            'legal_name' => 'Sacha Wasi Gastronomía SAS',
            'email' => 'hola@sachawasi.ec',
            'phone' => '+593 2 000 0000',
            'address' => 'Av. Amazonas y Naciones Unidas',
            'city' => 'Quito',
            'province' => 'Pichincha',
            'country_code' => 'EC',
            'timezone' => 'America/Guayaquil',
            'currency_code' => 'USD',
            'is_active' => true,
        ];
    }
}
