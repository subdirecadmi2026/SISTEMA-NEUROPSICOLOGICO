<?php

namespace Database\Seeders;

use App\Enums\DocumentType;
use App\Enums\InventoryBehavior;
use App\Enums\ProductType;
use App\Enums\UnitDimension;
use App\Enums\WarehouseType;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\Category;
use App\Models\Company;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\DeliveryZone;
use App\Models\DiningArea;
use App\Models\DiningTable;
use App\Models\Expense;
use App\Models\FiscalSequence;
use App\Models\GiftCard;
use App\Models\KitchenStation;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\Reservation;
use App\Models\Rider;
use App\Models\Supplier;
use App\Models\TaxRate;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Domain\Inventory\KardexService;
use App\Domain\Recipes\RecipeCostingService;
use App\Domain\Sales\SaleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoRestaurantSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::query()->create([
            'name' => 'Sacha Wasi',
            'trade_name' => 'Sacha Wasi — Cocina de la Sierra',
            'ruc' => '1790012345001',
            'legal_name' => 'Sacha Wasi Gastronomía SAS',
            'email' => 'hola@sachawasi.ec',
            'phone' => '+593 2 394 0100',
            'address' => 'Av. 12 de Octubre y Veintimilla',
            'city' => 'Quito',
            'province' => 'Pichincha',
            'country_code' => 'EC',
            'timezone' => 'America/Guayaquil',
            'currency_code' => 'USD',
        ]);

        $matriz = Branch::query()->create([
            'company_id' => $company->id,
            'code' => 'UIO-01',
            'name' => 'Matriz La Floresta',
            'email' => 'floresta@sachawasi.ec',
            'phone' => '+593 2 394 0101',
            'address' => 'Calle Guipuzcoa y Valladolid, La Floresta',
            'city' => 'Quito',
            'sri_establishment_code' => '001',
            'opens_at' => '12:00:00',
            'closes_at' => '23:00:00',
        ]);

        $valle = Branch::query()->create([
            'company_id' => $company->id,
            'code' => 'UIO-02',
            'name' => 'Sucursal Cumbayá',
            'email' => 'cumbaya@sachawasi.ec',
            'address' => 'Plaza Cumbayá',
            'city' => 'Quito',
            'sri_establishment_code' => '002',
            'opens_at' => '12:00:00',
            'closes_at' => '22:30:00',
        ]);

        $bodega = Warehouse::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'code' => 'BOD',
            'name' => 'Bodega seca',
            'type' => WarehouseType::Dry,
            'is_default' => true,
        ]);

        Warehouse::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'code' => 'COC',
            'name' => 'Cocina',
            'type' => WarehouseType::Kitchen,
        ]);

        Warehouse::query()->create([
            'company_id' => $company->id,
            'branch_id' => $valle->id,
            'code' => 'BOD',
            'name' => 'Bodega Cumbayá',
            'type' => WarehouseType::General,
            'is_default' => true,
        ]);

        $admin = User::query()->create([
            'company_id' => $company->id,
            'current_branch_id' => $matriz->id,
            'name' => 'Camila Ayala',
            'email' => 'admin@sachawasi.ec',
            'phone' => '+593 99 000 0001',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('administrador');
        $admin->branches()->sync([
            $matriz->id => ['is_default' => true],
            $valle->id => ['is_default' => false],
        ]);

        $bodeguero = User::query()->create([
            'company_id' => $company->id,
            'current_branch_id' => $matriz->id,
            'name' => 'Luis Paredes',
            'email' => 'bodega@sachawasi.ec',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $bodeguero->assignRole('bodega');
        $bodeguero->branches()->sync([$matriz->id => ['is_default' => true]]);

        $mesero = User::query()->create([
            'company_id' => $company->id,
            'current_branch_id' => $matriz->id,
            'name' => 'Ana Quishpe',
            'email' => 'mesero@sachawasi.ec',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $mesero->assignRole('mesero');
        $mesero->branches()->sync([$matriz->id => ['is_default' => true]]);

        $cajero = User::query()->create([
            'company_id' => $company->id,
            'current_branch_id' => $matriz->id,
            'name' => 'Sofía Cárdenas',
            'email' => 'cajero@sachawasi.ec',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $cajero->assignRole('cajero');
        $cajero->branches()->sync([$matriz->id => ['is_default' => true]]);

        $cocinero = User::query()->create([
            'company_id' => $company->id,
            'current_branch_id' => $matriz->id,
            'name' => 'Marco Iza',
            'email' => 'cocina@sachawasi.ec',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $cocinero->assignRole('cocina');
        $cocinero->branches()->sync([$matriz->id => ['is_default' => true]]);

        $this->seedTaxes($company->id);
        $units = $this->seedUnits($company->id);
        $this->seedStations($company->id, $matriz->id);
        $categories = $this->seedCategories($company->id);
        $iva = TaxRate::query()->where('company_id', $company->id)->where('code', 'IVA15')->first();

        $ingredients = $this->seedIngredients($company->id, $categories['insumos']->id, $units, $iva?->id);
        $dishes = $this->seedDishes($company->id, $categories, $units, $iva?->id);
        $this->seedRecipes($company->id, $dishes, $ingredients, $units);
        $this->seedOpeningStock($bodega, $ingredients, $admin);

        app(RecipeCostingService::class)->refreshCachedCost($dishes['salsa']->fresh()->activeRecipe);
        app(RecipeCostingService::class)->refreshCachedCost($dishes['locro']->fresh()->activeRecipe);
        app(RecipeCostingService::class)->refreshCachedCost($dishes['seco']->fresh()->activeRecipe);
        app(RecipeCostingService::class)->refreshCachedCost($dishes['jugo']->fresh()->activeRecipe);

        $this->seedOperations($company, $matriz, $bodega, $admin, $cajero, $ingredients, $dishes);
    }

    private function seedTaxes(string $companyId): void
    {
        foreach ([
            ['IVA0', 'IVA 0%', '0', '0', false],
            ['IVA5', 'IVA 5%', '5', '5', false],
            ['IVA15', 'IVA 15%', '15', '4', true],
        ] as [$code, $name, $percent, $sri, $default]) {
            TaxRate::query()->create([
                'company_id' => $companyId,
                'code' => $code,
                'name' => $name,
                'percent' => $percent,
                'sri_code' => $sri,
                'is_default' => $default,
            ]);
        }
    }

    private function seedUnits(string $companyId): array
    {
        $defs = [
            'g' => ['Gramo', UnitDimension::Mass, 1],
            'kg' => ['Kilogramo', UnitDimension::Mass, 1000],
            'ml' => ['Mililitro', UnitDimension::Volume, 1],
            'l' => ['Litro', UnitDimension::Volume, 1000],
            'und' => ['Unidad', UnitDimension::Count, 1],
            'porcion' => ['Porción', UnitDimension::Count, 1],
        ];

        $units = [];
        foreach ($defs as $symbol => [$name, $dimension, $factor]) {
            $units[$symbol] = Unit::query()->create([
                'company_id' => $companyId,
                'name' => $name,
                'symbol' => $symbol,
                'dimension' => $dimension,
                'factor_to_base' => $factor,
                'is_system' => true,
            ]);
        }

        return $units;
    }

    private function seedStations(string $companyId, string $branchId): void
    {
        foreach ([
            ['Fogón', '#C45C26', 18, 1],
            ['Plancha', '#B45309', 12, 2],
            ['Parrilla', '#9A3412', 20, 3],
            ['Bebidas', '#1D4E89', 5, 4],
            ['Postres', '#7C3AED', 10, 5],
        ] as [$name, $color, $sla, $order]) {
            KitchenStation::query()->create([
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'name' => $name,
                'color' => $color,
                'sla_minutes' => $sla,
                'sort_order' => $order,
            ]);
        }
    }

    private function seedCategories(string $companyId): array
    {
        $rows = [
            'entradas' => ['Entradas', '#C45C26', 1, true],
            'fuertes' => ['Platos fuertes', '#1B4D3E', 2, true],
            'bebidas' => ['Bebidas', '#1D4E89', 3, true],
            'postres' => ['Postres', '#7C3AED', 4, true],
            'insumos' => ['Insumos', '#57534E', 90, false],
        ];

        $categories = [];
        foreach ($rows as $key => [$name, $color, $order, $pos]) {
            $categories[$key] = Category::query()->create([
                'company_id' => $companyId,
                'name' => $name,
                'slug' => Str::slug($name),
                'color' => $color,
                'sort_order' => $order,
                'show_on_pos' => $pos,
                'show_on_qr_menu' => $pos,
            ]);
        }

        Category::query()->create([
            'company_id' => $companyId,
            'parent_id' => $categories['fuertes']->id,
            'name' => 'Sopas de la sierra',
            'slug' => 'sopas-de-la-sierra',
            'color' => '#3D6B4F',
            'sort_order' => 1,
        ]);

        return $categories;
    }

    private function seedIngredients(string $companyId, string $categoryId, array $units, ?string $taxId): array
    {
        $items = [
            'papa' => ['Papa chaucha', 'kg', 0.80, 0],
            'leche' => ['Leche entera', 'l', 1.10, 0],
            'queso' => ['Queso fresco', 'kg', 4.80, 0],
            'cebolla' => ['Cebolla blanca', 'kg', 0.90, 0],
            'ajo' => ['Ajo', 'kg', 3.50, 0],
            'cilantro' => ['Cilantro', 'kg', 2.40, 0],
            'pollo' => ['Pollo (pieza)', 'kg', 3.60, 0],
            'comino' => ['Comino', 'g', 0.012, 0],
            'arroz' => ['Arroz flor', 'kg', 1.20, 0],
            'naranjilla' => ['Naranjilla', 'kg', 2.10, 0],
            'azucar' => ['Azúcar', 'kg', 1.15, 0],
            'agua' => ['Agua', 'l', 0.00, 0],
        ];

        $products = [];
        foreach ($items as $key => [$name, $unit, $cost, $price]) {
            $products[$key] = Product::query()->create([
                'company_id' => $companyId,
                'category_id' => $categoryId,
                'base_unit_id' => $units[$unit]->id,
                'purchase_unit_id' => $units[$unit]->id,
                'tax_rate_id' => $taxId,
                'type' => ProductType::Ingredient,
                'inventory_behavior' => InventoryBehavior::Tracked,
                'name' => $name,
                'sku' => 'INS-'.strtoupper($key),
                'default_cost' => $cost,
                'default_price' => $price,
                'tracks_lots' => true,
                'is_sellable' => false,
                'is_purchasable' => true,
            ]);
        }

        return $products;
    }

    private function seedDishes(string $companyId, array $categories, array $units, ?string $taxId): array
    {
        $fogon = KitchenStation::query()->where('company_id', $companyId)->where('name', 'Fogón')->first();
        $bebidas = KitchenStation::query()->where('company_id', $companyId)->where('name', 'Bebidas')->first();

        $salsa = Product::query()->create([
            'company_id' => $companyId,
            'category_id' => $categories['insumos']->id,
            'base_unit_id' => $units['ml']->id,
            'type' => ProductType::Prepared,
            'inventory_behavior' => InventoryBehavior::RecipeExploded,
            'kitchen_station_id' => $fogon?->id,
            'name' => 'Salsa de cilantro',
            'sku' => 'PREP-SALSA',
            'default_price' => 0,
            'tracks_lots' => false,
            'is_sellable' => false,
            'is_purchasable' => false,
            'prep_time_minutes' => 10,
        ]);

        $locro = Product::query()->create([
            'company_id' => $companyId,
            'category_id' => $categories['fuertes']->id,
            'base_unit_id' => $units['porcion']->id,
            'tax_rate_id' => $taxId,
            'type' => ProductType::Prepared,
            'inventory_behavior' => InventoryBehavior::RecipeExploded,
            'kitchen_station_id' => $fogon?->id,
            'name' => 'Locro de papa',
            'sku' => 'PLT-LOCRO',
            'default_price' => 6.50,
            'tracks_lots' => false,
            'is_sellable' => true,
            'prep_time_minutes' => 18,
            'allergens' => ['lácteos'],
            'image_path' => 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=800&q=80',
        ]);

        $seco = Product::query()->create([
            'company_id' => $companyId,
            'category_id' => $categories['fuertes']->id,
            'base_unit_id' => $units['porcion']->id,
            'tax_rate_id' => $taxId,
            'type' => ProductType::Prepared,
            'inventory_behavior' => InventoryBehavior::RecipeExploded,
            'kitchen_station_id' => $fogon?->id,
            'name' => 'Seco de pollo',
            'sku' => 'PLT-SECO',
            'default_price' => 8.90,
            'tracks_lots' => false,
            'is_sellable' => true,
            'prep_time_minutes' => 22,
            'image_path' => 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
        ]);

        $jugo = Product::query()->create([
            'company_id' => $companyId,
            'category_id' => $categories['bebidas']->id,
            'base_unit_id' => $units['und']->id,
            'tax_rate_id' => $taxId,
            'type' => ProductType::Prepared,
            'inventory_behavior' => InventoryBehavior::RecipeExploded,
            'kitchen_station_id' => $bebidas?->id,
            'name' => 'Jugo de naranjilla',
            'sku' => 'BEB-NARA',
            'default_price' => 2.50,
            'tracks_lots' => false,
            'is_sellable' => true,
            'prep_time_minutes' => 4,
            'image_path' => 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=800&q=80',
        ]);

        return compact('salsa', 'locro', 'seco', 'jugo');
    }

    private function seedRecipes(string $companyId, array $dishes, array $ins, array $units): void
    {
        $salsa = Recipe::query()->create([
            'company_id' => $companyId,
            'product_id' => $dishes['salsa']->id,
            'yield_unit_id' => $units['ml']->id,
            'name' => 'Salsa de cilantro',
            'yield_quantity' => 100,
            'process_waste_percent' => 5,
            'is_active' => true,
        ]);
        $salsa->items()->createMany([
            ['component_product_id' => $ins['cilantro']->id, 'unit_id' => $units['g']->id, 'quantity' => 40, 'waste_percent' => 8, 'sort_order' => 1],
            ['component_product_id' => $ins['ajo']->id, 'unit_id' => $units['g']->id, 'quantity' => 10, 'waste_percent' => 5, 'sort_order' => 2],
            ['component_product_id' => $ins['agua']->id, 'unit_id' => $units['ml']->id, 'quantity' => 50, 'waste_percent' => 0, 'sort_order' => 3],
        ]);

        $locro = Recipe::query()->create([
            'company_id' => $companyId,
            'product_id' => $dishes['locro']->id,
            'yield_unit_id' => $units['porcion']->id,
            'name' => 'Locro de papa porción',
            'yield_quantity' => 1,
            'process_waste_percent' => 3,
            'is_active' => true,
        ]);
        $locro->items()->createMany([
            ['component_product_id' => $ins['papa']->id, 'unit_id' => $units['g']->id, 'quantity' => 280, 'waste_percent' => 12, 'sort_order' => 1],
            ['component_product_id' => $ins['leche']->id, 'unit_id' => $units['ml']->id, 'quantity' => 180, 'waste_percent' => 0, 'sort_order' => 2],
            ['component_product_id' => $ins['queso']->id, 'unit_id' => $units['g']->id, 'quantity' => 40, 'waste_percent' => 2, 'sort_order' => 3],
            ['component_product_id' => $ins['cebolla']->id, 'unit_id' => $units['g']->id, 'quantity' => 30, 'waste_percent' => 8, 'sort_order' => 4],
            ['component_product_id' => $dishes['salsa']->id, 'unit_id' => $units['ml']->id, 'quantity' => 20, 'waste_percent' => 0, 'sort_order' => 5],
        ]);

        $seco = Recipe::query()->create([
            'company_id' => $companyId,
            'product_id' => $dishes['seco']->id,
            'yield_unit_id' => $units['porcion']->id,
            'name' => 'Seco de pollo porción',
            'yield_quantity' => 1,
            'process_waste_percent' => 4,
            'is_active' => true,
        ]);
        $seco->items()->createMany([
            ['component_product_id' => $ins['pollo']->id, 'unit_id' => $units['g']->id, 'quantity' => 220, 'waste_percent' => 8, 'sort_order' => 1],
            ['component_product_id' => $ins['arroz']->id, 'unit_id' => $units['g']->id, 'quantity' => 90, 'waste_percent' => 2, 'sort_order' => 2],
            ['component_product_id' => $ins['cebolla']->id, 'unit_id' => $units['g']->id, 'quantity' => 40, 'waste_percent' => 8, 'sort_order' => 3],
            ['component_product_id' => $ins['comino']->id, 'unit_id' => $units['g']->id, 'quantity' => 2, 'waste_percent' => 0, 'sort_order' => 4],
            ['component_product_id' => $dishes['salsa']->id, 'unit_id' => $units['ml']->id, 'quantity' => 15, 'waste_percent' => 0, 'sort_order' => 5],
        ]);

        $jugo = Recipe::query()->create([
            'company_id' => $companyId,
            'product_id' => $dishes['jugo']->id,
            'yield_unit_id' => $units['und']->id,
            'name' => 'Jugo de naranjilla 12 oz',
            'yield_quantity' => 1,
            'is_active' => true,
        ]);
        $jugo->items()->createMany([
            ['component_product_id' => $ins['naranjilla']->id, 'unit_id' => $units['g']->id, 'quantity' => 180, 'waste_percent' => 18, 'sort_order' => 1],
            ['component_product_id' => $ins['azucar']->id, 'unit_id' => $units['g']->id, 'quantity' => 15, 'waste_percent' => 0, 'sort_order' => 2],
            ['component_product_id' => $ins['agua']->id, 'unit_id' => $units['ml']->id, 'quantity' => 200, 'waste_percent' => 0, 'sort_order' => 3],
        ]);
    }

    private function seedOpeningStock(Warehouse $warehouse, array $ingredients, User $user): void
    {
        $kardex = app(KardexService::class);
        $opening = [
            'papa' => ['25', '0.80', '2026-10-01', 'LOTE-PAPA-01'],
            'leche' => ['20', '1.10', '2026-09-14', 'LOTE-LECHE-01'],
            'queso' => ['8', '4.80', '2026-09-20', 'LOTE-QUESO-01'],
            'cebolla' => ['10', '0.90', '2026-09-25', 'LOTE-CEB-01'],
            'ajo' => ['3', '3.50', '2026-11-01', 'LOTE-AJO-01'],
            'cilantro' => ['2', '2.40', '2026-09-12', 'LOTE-CIL-01'],
            'pollo' => ['18', '3.60', '2026-09-11', 'LOTE-POLLO-01'],
            'arroz' => ['30', '1.20', null, 'LOTE-ARROZ-01'],
            'naranjilla' => ['12', '2.10', '2026-09-16', 'LOTE-NARA-01'],
            'azucar' => ['15', '1.15', null, 'LOTE-AZU-01'],
            'agua' => ['100', '0', null, 'LOTE-AGUA-01'],
            'comino' => ['500', '0.012', null, 'LOTE-COM-01'],
        ];

        foreach ($opening as $key => [$qty, $cost, $expires, $lot]) {
            $kardex->receive(
                warehouse: $warehouse,
                product: $ingredients[$key],
                quantity: $qty,
                unitCost: $cost,
                lotCode: $lot,
                expiresAt: $expires,
                user: $user,
                notes: 'Inventario inicial de demostración',
            );

            $ingredients[$key]->stockItems()
                ->where('warehouse_id', $warehouse->id)
                ->update(['min_qty' => max(1, ((float) $qty) * 0.2)]);
        }
    }

    private function seedOperations(
        Company $company,
        Branch $matriz,
        Warehouse $bodega,
        User $admin,
        User $cajero,
        array $ingredients,
        array $dishes,
    ): void {
        $salon = DiningArea::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'name' => 'Salón principal',
            'sort_order' => 1,
        ]);

        $tables = [];
        foreach ([
            ['M1', 2, 40, 40],
            ['M2', 2, 180, 40],
            ['M3', 4, 40, 160],
            ['M4', 4, 180, 160],
            ['M5', 4, 320, 40],
            ['M6', 6, 320, 160],
            ['M7', 4, 40, 280],
            ['M8', 8, 180, 280],
        ] as [$code, $seats, $x, $y]) {
            $tables[$code] = DiningTable::query()->create([
                'company_id' => $company->id,
                'branch_id' => $matriz->id,
                'dining_area_id' => $salon->id,
                'name' => 'Mesa '.$code,
                'code' => $code,
                'qr_token' => 'floresta-'.strtolower($code),
                'seats' => $seats,
                'pos_x' => $x,
                'pos_y' => $y,
            ]);
        }

        $register = CashRegister::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'name' => 'Caja 1',
            'code' => 'C1',
        ]);

        app(\App\Domain\Cash\CashService::class)->open($register, $cajero, '150.00');

        FiscalSequence::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'document_type' => \App\Enums\DocumentType::Invoice,
            'establishment_code' => '001',
            'emission_point' => '001',
            'next_number' => 1,
        ]);

        $supplier = Supplier::query()->create([
            'company_id' => $company->id,
            'name' => 'Mercado Mayorista de Quito',
            'trade_name' => 'Mayorista Sierra',
            'ruc' => '1790456789001',
            'city' => 'Quito',
            'phone' => '+593 2 250 0000',
        ]);

        $po = app(\App\Domain\Purchasing\PurchaseService::class)->create([
            'branch_id' => $matriz->id,
            'warehouse_id' => $bodega->id,
            'supplier_id' => $supplier->id,
            'notes' => 'Reposición semanal de papa y pollo',
            'items' => [
                ['product_id' => $ingredients['papa']->id, 'quantity_ordered' => 10, 'unit_cost' => 0.78, 'lot_code' => 'PO-PAPA'],
                ['product_id' => $ingredients['pollo']->id, 'quantity_ordered' => 8, 'unit_cost' => 3.55, 'lot_code' => 'PO-POLLO'],
            ],
        ], $admin);
        app(\App\Domain\Purchasing\PurchaseService::class)->approve($po, $admin);
        app(\App\Domain\Purchasing\PurchaseService::class)->receive($po, $admin);

        $ana = Customer::query()->create([
            'company_id' => $company->id,
            'name' => 'Ana Lucía Benítez',
            'document_type' => 'cedula',
            'document_number' => '1712345678',
            'phone' => '0991112233',
            'email' => 'ana.benitez@example.com',
            'segment' => 'frecuente',
            'points' => 40,
            'lifetime_spend' => 86,
        ]);
        Customer::query()->create([
            'company_id' => $company->id,
            'name' => 'Diego Morales',
            'document_type' => 'cedula',
            'document_number' => '1709876543',
            'phone' => '0987654321',
            'segment' => 'nuevo',
        ]);

        Coupon::query()->create([
            'company_id' => $company->id,
            'code' => 'SIERRA10',
            'name' => '10% sierra',
            'type' => 'percent',
            'value' => 10,
            'min_ticket' => 5,
            'is_active' => true,
        ]);

        GiftCard::query()->create([
            'company_id' => $company->id,
            'customer_id' => $ana->id,
            'code' => 'GIFT-SW-50',
            'balance' => 50,
            'status' => 'active',
        ]);

        Reservation::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'dining_table_id' => $tables['M6']->id,
            'customer_id' => $ana->id,
            'guest_name' => 'Ana Lucía Benítez',
            'guest_phone' => '0991112233',
            'party_size' => 4,
            'reserved_at' => now()->setTime(20, 0),
            'status' => 'confirmed',
            'channel' => 'phone',
            'notes' => 'Cumpleaños, mesa junto a la ventana',
        ]);

        $rider = Rider::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'name' => 'Kevin Toapanta',
            'phone' => '0998887766',
            'vehicle' => 'moto',
            'is_available' => true,
        ]);

        $zona = DeliveryZone::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'name' => 'La Floresta',
            'fee' => 1.50,
            'eta_minutes' => 25,
        ]);

        Expense::query()->create([
            'company_id' => $company->id,
            'branch_id' => $matriz->id,
            'user_id' => $admin->id,
            'category' => 'servicios',
            'description' => 'Gas y energía del día',
            'amount' => 18.40,
            'incurred_on' => now()->toDateString(),
            'vendor' => 'CNEL / Gasnor',
        ]);

        app()->instance('currentCompanyId', $company->id);
        app()->instance('currentBranchId', $matriz->id);

        $sales = app(SaleService::class);
        $sales->quickSale([
            'branch_id' => $matriz->id,
            'warehouse_id' => $bodega->id,
            'dining_table_id' => $tables['M3']->id,
            'customer_id' => $ana->id,
            'channel' => 'salon',
            'covers' => 2,
            'guest_name' => 'Ana Lucía Benítez',
            'document_type' => DocumentType::Invoice->value,
            'items' => [
                ['product_id' => $dishes['locro']->id, 'quantity' => 1],
                ['product_id' => $dishes['jugo']->id, 'quantity' => 1],
            ],
            'payments' => [
                ['method' => 'cash', 'amount' => 9.00],
            ],
        ], $cajero);

        $delivery = $sales->open([
            'branch_id' => $matriz->id,
            'warehouse_id' => $bodega->id,
            'channel' => 'delivery',
            'customer_id' => $ana->id,
            'guest_name' => 'Ana Lucía Benítez',
            'delivery_address' => 'Guipuzcoa y Valladolid',
            'delivery_zone_id' => $zona->id,
            'delivery_fee' => 1.50,
            'rider_id' => $rider->id,
        ], $cajero);
        $sales->addItem($delivery, ['product_id' => $dishes['seco']->id, 'quantity' => 1]);
        $sales->sendToKitchen($delivery, $cajero);
    }
}
