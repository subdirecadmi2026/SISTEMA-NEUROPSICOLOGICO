<?php

namespace Tests\Concerns;

use App\Enums\InventoryBehavior;
use App\Enums\ProductType;
use App\Enums\UnitDimension;
use App\Enums\WarehouseType;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Product;
use App\Models\TaxRate;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

trait CreatesSachaContext
{
    protected Company $company;

    protected Branch $branch;

    protected Warehouse $warehouse;

    protected User $admin;

    protected array $units = [];

    protected function createContext(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $this->company = Company::factory()->create();
        $this->branch = Branch::factory()->create(['company_id' => $this->company->id]);
        $this->warehouse = Warehouse::factory()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'type' => WarehouseType::General,
        ]);

        $this->units = [
            'g' => Unit::factory()->create([
                'company_id' => $this->company->id,
                'name' => 'Gramo',
                'symbol' => 'g',
                'dimension' => UnitDimension::Mass,
                'factor_to_base' => 1,
            ]),
            'kg' => Unit::factory()->create([
                'company_id' => $this->company->id,
                'name' => 'Kilogramo',
                'symbol' => 'kg',
                'dimension' => UnitDimension::Mass,
                'factor_to_base' => 1000,
            ]),
            'und' => Unit::factory()->create([
                'company_id' => $this->company->id,
                'name' => 'Unidad',
                'symbol' => 'und',
                'dimension' => UnitDimension::Count,
                'factor_to_base' => 1,
            ]),
            'porcion' => Unit::factory()->create([
                'company_id' => $this->company->id,
                'name' => 'Porción',
                'symbol' => 'porcion',
                'dimension' => UnitDimension::Count,
                'factor_to_base' => 1,
            ]),
        ];

        TaxRate::query()->create([
            'company_id' => $this->company->id,
            'code' => 'IVA15',
            'name' => 'IVA 15%',
            'percent' => 15,
            'sri_code' => '4',
            'is_default' => true,
        ]);

        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
            'current_branch_id' => $this->branch->id,
            'email' => 'admin@test.ec',
        ]);
        $this->admin->assignRole('administrador');
        $this->admin->branches()->attach($this->branch->id, ['is_default' => true]);
    }

    protected function ingredient(string $name, string $cost, string $unit = 'kg'): Product
    {
        return Product::factory()->create([
            'company_id' => $this->company->id,
            'base_unit_id' => $this->units[$unit]->id,
            'type' => ProductType::Ingredient,
            'inventory_behavior' => InventoryBehavior::Tracked,
            'name' => $name,
            'default_cost' => $cost,
            'tracks_lots' => true,
            'is_sellable' => false,
            'is_purchasable' => true,
        ]);
    }

    protected function prepared(string $name, string $price = '8.00'): Product
    {
        return Product::factory()->prepared()->create([
            'company_id' => $this->company->id,
            'base_unit_id' => $this->units['porcion']->id,
            'name' => $name,
            'default_price' => $price,
        ]);
    }

    protected function actingAsAdmin(): User
    {
        Sanctum::actingAs($this->admin, ['*']);

        return $this->admin;
    }

    protected function userWithRole(string $role): User
    {
        $user = User::factory()->create([
            'company_id' => $this->company->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $user->assignRole($role);
        $user->branches()->attach($this->branch->id, ['is_default' => true]);

        return $user;
    }
}
