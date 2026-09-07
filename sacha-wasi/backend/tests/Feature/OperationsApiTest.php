<?php

namespace Tests\Feature;

use App\Domain\Cash\CashService;
use App\Domain\Inventory\KardexService;
use App\Models\CashRegister;
use App\Models\DiningArea;
use App\Models\DiningTable;
use App\Models\FiscalDocument;
use App\Models\Order;
use App\Models\StockItem;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OperationsApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createContext();
    }

    public function test_quick_sale_deducts_recipe_stock_and_issues_simulated_invoice(): void
    {
        $this->actingAsAdmin();
        [$soup, $tomato] = $this->seedSellableSoup();
        $this->openCash();

        $response = $this->postJson('/api/v1/orders/quick-sale', [
            'items' => [['product_id' => $soup->id, 'quantity' => 1]],
            'payments' => [['method' => 'cash', 'amount' => 8.5]],
            'document_type' => 'invoice',
        ])->assertCreated();

        $orderId = $response->json('id');
        $this->assertSame('billed', $response->json('status'));
        $this->assertNotEmpty($response->json('latest_fiscal_document.access_key'));
        $this->assertSame('authorized', $response->json('latest_fiscal_document.sri_status'));
        $this->assertTrue($response->json('latest_fiscal_document.is_contingency') === false);
        $this->assertStringContainsString('simulador', strtolower((string) $response->json('latest_fiscal_document.sri_message')));

        $stock = StockItem::query()->where('product_id', $tomato->id)->first();
        $this->assertSame('9.8000', (string) $stock->qty_on_hand);

        $this->assertTrue(Order::query()->whereKey($orderId)->where('inventory_committed', true)->exists());
        $this->assertTrue(FiscalDocument::query()->where('order_id', $orderId)->where('sri_status', 'authorized')->exists());
        $this->assertSame(49, strlen((string) FiscalDocument::query()->where('order_id', $orderId)->value('access_key')));
    }

    public function test_waiter_cannot_void_and_void_restores_stock(): void
    {
        $this->actingAsAdmin();
        [$soup, $tomato] = $this->seedSellableSoup();
        $this->openCash();

        $order = $this->postJson('/api/v1/orders/quick-sale', [
            'items' => [['product_id' => $soup->id, 'quantity' => 1]],
            'payments' => [['method' => 'cash', 'amount' => 8.5]],
        ])->assertCreated()->json();

        $waiter = $this->userWithRole('mesero');
        Sanctum::actingAs($waiter, ['*']);
        $this->postJson("/api/v1/orders/{$order['id']}/void", ['reason' => 'cliente se fue'])
            ->assertForbidden();

        $this->actingAsAdmin();
        $this->postJson("/api/v1/orders/{$order['id']}/void", ['reason' => 'error de captura'])
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');

        $stock = StockItem::query()->where('product_id', $tomato->id)->first();
        $this->assertSame('10.0000', (string) $stock->qty_on_hand);
    }

    public function test_pay_requires_open_cash_session(): void
    {
        $this->actingAsAdmin();
        [$soup] = $this->seedSellableSoup();

        $this->postJson('/api/v1/orders/quick-sale', [
            'items' => [['product_id' => $soup->id, 'quantity' => 1]],
            'payments' => [['method' => 'cash', 'amount' => 8.5]],
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'Debe abrir una sesión de caja antes de cobrar.']);
    }

    public function test_cash_close_records_difference(): void
    {
        $this->actingAsAdmin();
        $session = $this->openCash('100');

        $closed = $this->postJson("/api/v1/cash/sessions/{$session->id}/close", [
            'denominations' => ['100' => 1, '1' => 2],
            'notes' => 'faltante de prueba',
        ])->assertOk()->json();

        $this->assertSame('closed', $closed['status']);
        $this->assertEquals(102.0, (float) $closed['counted_cash']);
        $this->assertEquals(100.0, (float) $closed['system_cash']);
        $this->assertEquals(2.0, (float) $closed['difference']);
    }

    public function test_kitchen_can_advance_ticket_status(): void
    {
        $this->actingAsAdmin();
        [$soup] = $this->seedSellableSoup();
        $this->openCash();

        $order = $this->postJson('/api/v1/orders', [
            'channel' => 'salon',
        ])->assertCreated()->json();

        $this->postJson("/api/v1/orders/{$order['id']}/items", [
            'product_id' => $soup->id,
            'quantity' => 1,
        ])->assertOk();

        $sent = $this->postJson("/api/v1/orders/{$order['id']}/send-to-kitchen")->assertOk()->json();
        $itemId = $sent['items'][0]['id'];

        $cook = $this->userWithRole('cocina');
        Sanctum::actingAs($cook, ['*']);

        $this->getJson('/api/v1/kitchen/tickets')->assertOk()->assertJsonFragment(['id' => $itemId]);
        $this->postJson("/api/v1/kitchen/items/{$itemId}/advance", ['status' => 'preparing'])->assertOk();
        $this->postJson("/api/v1/kitchen/items/{$itemId}/advance", ['status' => 'ready'])
            ->assertOk()
            ->assertJsonPath('status', 'ready');
    }

    public function test_public_qr_menu_creates_kitchen_order(): void
    {
        $this->actingAsAdmin();
        [$soup] = $this->seedSellableSoup();

        $area = DiningArea::query()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'name' => 'Salón',
        ]);
        $table = DiningTable::query()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'dining_area_id' => $area->id,
            'name' => 'Mesa 1',
            'code' => 'M1',
            'qr_token' => 'test-m1',
            'seats' => 2,
        ]);

        $this->getJson('/api/v1/public/menu/test-m1')
            ->assertOk()
            ->assertJsonPath('table.code', 'M1');

        $this->postJson('/api/v1/public/menu/test-m1/orders', [
            'guest_name' => 'Invitado QR',
            'items' => [['product_id' => $soup->id, 'quantity' => 1]],
        ])->assertCreated()
            ->assertJsonPath('status', 'in_kitchen')
            ->assertJsonPath('channel', 'qr_menu');

        $this->assertSame('waiting_food', $table->fresh()->status->value);
    }

    public function test_offline_client_ulid_is_idempotent(): void
    {
        $this->actingAsAdmin();
        [$soup] = $this->seedSellableSoup();
        $this->openCash();

        $payload = [
            'client_ulid' => '01TESTCLIENTULID000000001',
            'items' => [['product_id' => $soup->id, 'quantity' => 1]],
            'payments' => [['method' => 'cash', 'amount' => 8.5]],
        ];

        $first = $this->postJson('/api/v1/orders/quick-sale', $payload)->assertCreated()->json('id');
        $second = $this->postJson('/api/v1/orders/quick-sale', $payload)->assertCreated()->json('id');

        $this->assertSame($first, $second);
        $this->assertSame(1, Order::query()->count());
    }

    public function test_reports_include_expenses_in_net_profit(): void
    {
        $this->actingAsAdmin();
        \App\Models\Expense::query()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'user_id' => $this->admin->id,
            'category' => 'servicios',
            'description' => 'Gas',
            'amount' => 10,
            'incurred_on' => now()->toDateString(),
        ]);

        $this->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonPath('expenses', 10)
            ->assertJsonPath('net_profit', -10);
    }

    public function test_split_cash_and_transfer_records_change(): void
    {
        $this->actingAsAdmin();
        [$soup] = $this->seedSellableSoup();
        $this->openCash();

        $order = $this->postJson('/api/v1/orders/quick-sale', [
            'items' => [['product_id' => $soup->id, 'quantity' => 1]],
            'payments' => [
                [
                    'method' => 'cash',
                    'amount' => 5,
                    'tendered_amount' => 10,
                    'guest_label' => 'Mesa A',
                ],
                [
                    'method' => 'transfer',
                    'amount' => 3.5,
                    'reference' => 'BANCO-001',
                    'guest_label' => 'Mesa B',
                ],
            ],
        ])->assertCreated();

        $order->assertJsonPath('status', 'billed');
        $this->assertSame('10.00', $order->json('payments.0.tendered_amount'));
        $this->assertSame('5.00', $order->json('payments.0.change_amount'));
        $this->assertSame('Mesa A', $order->json('payments.0.guest_label'));
        $this->assertSame('transfer', $order->json('payments.1.method'));
        $this->assertNotEmpty($order->json('latest_fiscal_document.id'));
    }

    public function test_cash_tendered_above_total_is_treated_as_change(): void
    {
        $this->actingAsAdmin();
        [$soup] = $this->seedSellableSoup();
        $this->openCash();

        $this->postJson('/api/v1/orders/quick-sale', [
            'items' => [['product_id' => $soup->id, 'quantity' => 1]],
            'payments' => [[
                'method' => 'cash',
                'amount' => 20,
                'guest_label' => 'Cliente',
            ]],
        ])->assertCreated()
            ->assertJsonPath('payments.0.amount', '8.50')
            ->assertJsonPath('payments.0.tendered_amount', '20.00')
            ->assertJsonPath('payments.0.change_amount', '11.50');
    }

    /**
     * @return array{0: \App\Models\Product, 1: \App\Models\Product}
     */
    private function seedSellableSoup(): array
    {
        $tomato = $this->ingredient('Tomate', '2.00');
        $soup = $this->prepared('Locro prueba', '8.50');

        app(KardexService::class)->receive(
            warehouse: $this->warehouse,
            product: $tomato,
            quantity: '10',
            unitCost: '2.00',
            lotCode: 'TOM-01',
            user: $this->admin,
        );

        $this->postJson('/api/v1/recipes', [
            'product_id' => $soup->id,
            'yield_unit_id' => $this->units['porcion']->id,
            'name' => 'Locro v1',
            'yield_quantity' => 1,
            'is_active' => true,
            'items' => [[
                'component_product_id' => $tomato->id,
                'unit_id' => $this->units['kg']->id,
                'quantity' => 0.2,
                'waste_percent' => 0,
            ]],
        ])->assertCreated();

        return [$soup->fresh(), $tomato->fresh()];
    }

    private function openCash(string $amount = '100')
    {
        $register = CashRegister::query()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'name' => 'Caja test',
            'code' => 'T1',
        ]);

        return app(CashService::class)->open($register, $this->admin, $amount);
    }
}
