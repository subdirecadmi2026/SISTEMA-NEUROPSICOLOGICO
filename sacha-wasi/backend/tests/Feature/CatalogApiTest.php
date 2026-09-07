<?php

namespace Tests\Feature;

use App\Models\LoginAttempt;
use App\Models\Product;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatalogApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createContext();
    }

    public function test_login_returns_token_and_records_attempt(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@test.ec',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'admin@test.ec')
            ->assertJsonStructure(['token', 'user' => ['permissions', 'roles']]);

        $this->assertTrue(LoginAttempt::query()->where('email', 'admin@test.ec')->where('successful', true)->exists());
    }

    public function test_failed_login_is_audited(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@test.ec',
            'password' => 'wrong',
        ])->assertStatus(422);

        $this->assertTrue(LoginAttempt::query()->where('successful', false)->where('reason', 'invalid_credentials')->exists());
        $this->assertSame(1, $this->admin->fresh()->failed_login_count);
    }

    public function test_admin_can_create_category_and_product(): void
    {
        $this->actingAsAdmin();

        $category = $this->postJson('/api/v1/categories', [
            'name' => 'Entradas',
            'color' => '#C45C26',
            'sort_order' => 1,
        ])->assertCreated()->json();

        $product = $this->postJson('/api/v1/products', [
            'category_id' => $category['id'],
            'base_unit_id' => $this->units['porcion']->id,
            'type' => 'prepared',
            'name' => 'Empanada de viento',
            'default_price' => 1.5,
            'is_sellable' => true,
        ])->assertCreated()->json();

        $this->assertSame('Empanada de viento', $product['name']);
        $this->assertSame('prepared', $product['type']);
    }

    public function test_recipe_cost_endpoint(): void
    {
        $this->actingAsAdmin();
        $tomato = $this->ingredient('Tomate', '2.00');
        $soup = $this->prepared('Sopa', '5.00');

        $this->postJson('/api/v1/recipes', [
            'product_id' => $soup->id,
            'yield_unit_id' => $this->units['porcion']->id,
            'name' => 'Sopa v1',
            'yield_quantity' => 1,
            'is_active' => true,
            'items' => [[
                'component_product_id' => $tomato->id,
                'unit_id' => $this->units['kg']->id,
                'quantity' => 0.2,
                'waste_percent' => 0,
            ]],
        ])->assertCreated();

        $this->getJson("/api/v1/products/{$soup->id}/cost")
            ->assertOk()
            ->assertJsonPath('unit_cost', '0.4000');
    }

    public function test_receive_stock_and_list_kardex(): void
    {
        $this->actingAsAdmin();
        $rice = $this->ingredient('Arroz', '1.20');

        $this->postJson('/api/v1/inventory/receive', [
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $rice->id,
            'quantity' => 12,
            'unit_cost' => 1.2,
            'lot_code' => 'AR-01',
            'min_qty' => 4,
        ])->assertCreated();

        $this->getJson('/api/v1/inventory/stock')
            ->assertOk()
            ->assertJsonFragment(['product_id' => $rice->id]);

        $this->getJson('/api/v1/inventory/kardex?product_id='.$rice->id)
            ->assertOk()
            ->assertJsonPath('data.0.direction', 'in');
    }

    public function test_waiter_cannot_adjust_inventory(): void
    {
        $waiter = $this->userWithRole('mesero');
        Sanctum::actingAs($waiter, ['*']);
        $rice = $this->ingredient('Arroz', '1.20');

        $this->postJson('/api/v1/inventory/adjust', [
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $rice->id,
            'qty_after' => 1,
            'reason_code' => 'waste',
            'notes' => 'intento no autorizado',
        ])->assertForbidden();
    }

    public function test_search_products_by_sku(): void
    {
        $this->actingAsAdmin();
        Product::factory()->create([
            'company_id' => $this->company->id,
            'base_unit_id' => $this->units['g']->id,
            'sku' => 'SW-LOCRO-001',
            'name' => 'Locro de papa',
        ]);

        $this->getJson('/api/v1/products?search=LOCRO')
            ->assertOk()
            ->assertJsonPath('data.0.sku', 'SW-LOCRO-001');
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/v1/products')->assertUnauthorized();
    }
}
