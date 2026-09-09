<?php

namespace Tests\Unit;

use App\Domain\Inventory\ImmutableKardexException;
use App\Domain\Inventory\InsufficientStockException;
use App\Domain\Inventory\KardexService;
use App\Domain\Recipes\RecipeExplosionService;
use App\Enums\InventoryBehavior;
use App\Enums\ProductType;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\StockMovement;
use App\Support\Decimal;
use Tests\TestCase;

class KardexServiceTest extends TestCase
{
    private KardexService $kardex;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createContext();
        $this->kardex = app(KardexService::class);
    }

    public function test_receive_increases_stock_and_writes_kardex(): void
    {
        $tomato = $this->ingredient('Tomate', '2.00');

        $this->kardex->receive($this->warehouse, $tomato, '10', '2.00', 'L-01', '2026-12-01', user: $this->admin);

        $this->assertSame('10.0000', $tomato->stockItems()->where('warehouse_id', $this->warehouse->id)->first()->qty_on_hand);
        $this->assertSame(1, StockMovement::query()->count());
        $this->assertSame('in', StockMovement::query()->first()->direction);
    }

    public function test_fefo_consumes_the_lot_that_expires_first(): void
    {
        $milk = $this->ingredient('Leche', '1.10');

        $this->kardex->receive($this->warehouse, $milk, '5', '1.10', 'L-TARDE', '2026-10-01');
        $this->kardex->receive($this->warehouse, $milk, '5', '1.05', 'L-PRONTO', '2026-09-15');

        $this->kardex->consume($this->warehouse, $milk, '3', user: $this->admin);

        $soon = $milk->lots()->where('lot_code', 'L-PRONTO')->first();
        $later = $milk->lots()->where('lot_code', 'L-TARDE')->first();

        $this->assertSame('2.0000', $soon->qty_on_hand);
        $this->assertSame('5.0000', $later->qty_on_hand);
        $this->assertSame('7.0000', $milk->stockItems()->first()->qty_on_hand);
    }

    public function test_expired_lots_are_not_consumed(): void
    {
        $cheese = $this->ingredient('Queso', '4.80');
        $this->kardex->receive($this->warehouse, $cheese, '2', '4.80', 'L-VIEJO', '2020-01-01');
        $this->kardex->receive($this->warehouse, $cheese, '2', '4.80', 'L-NUEVO', '2026-12-01');

        $this->kardex->consume($this->warehouse, $cheese, '1');

        $this->assertSame('2.0000', $cheese->lots()->where('lot_code', 'L-VIEJO')->first()->qty_on_hand);
        $this->assertSame('1.0000', $cheese->lots()->where('lot_code', 'L-NUEVO')->first()->qty_on_hand);
    }

    public function test_insufficient_stock_is_rejected(): void
    {
        $rice = $this->ingredient('Arroz', '1.20');
        $this->kardex->receive($this->warehouse, $rice, '1', '1.20', 'L-1');

        $this->expectException(InsufficientStockException::class);
        $this->kardex->consume($this->warehouse, $rice, '5');
    }

    public function test_kardex_is_immutable(): void
    {
        $onion = $this->ingredient('Cebolla', '0.90');
        $movement = $this->kardex->receive($this->warehouse, $onion, '4', '0.90', 'L-1');

        $this->expectException(ImmutableKardexException::class);
        $movement->update(['notes' => 'hack']);
    }

    public function test_selling_a_prepared_dish_explodes_the_recipe(): void
    {
        $potato = $this->ingredient('Papa', '1.00');
        $this->kardex->receive($this->warehouse, $potato, '5', '1.00', 'L-PAPA', '2026-11-01');

        $locro = $this->prepared('Locro de papa', '6.50');
        $recipe = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $locro->id,
            'yield_unit_id' => $this->units['porcion']->id,
            'yield_quantity' => 1,
        ]);
        $recipe->items()->create([
            'component_product_id' => $potato->id,
            'unit_id' => $this->units['g']->id,
            'quantity' => 250,
            'waste_percent' => 0,
        ]);

        $this->kardex->consumeForSale($this->warehouse, $locro->fresh(), '2', $this->admin);

        // 2 porciones * 250 g = 0.5 kg
        $this->assertSame('4.5000', $potato->stockItems()->first()->qty_on_hand);
        $this->assertTrue(
            StockMovement::query()->where('product_id', $potato->id)->where('direction', 'out')->exists()
        );
    }

    public function test_combo_explodes_each_component(): void
    {
        $water = Product::factory()->create([
            'company_id' => $this->company->id,
            'base_unit_id' => $this->units['und']->id,
            'type' => ProductType::Simple,
            'inventory_behavior' => InventoryBehavior::Tracked,
            'name' => 'Agua embotellada',
            'default_cost' => '0.40',
            'tracks_lots' => true,
            'is_sellable' => true,
        ]);
        $this->kardex->receive($this->warehouse, $water, '10', '0.40', 'L-AGUA');

        $soup = $this->prepared('Sopa');
        $potato = $this->ingredient('Papa', '1.00');
        $this->kardex->receive($this->warehouse, $potato, '3', '1.00', 'L-P');
        $recipe = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $soup->id,
            'yield_unit_id' => $this->units['porcion']->id,
        ]);
        $recipe->items()->create([
            'component_product_id' => $potato->id,
            'unit_id' => $this->units['kg']->id,
            'quantity' => 0.2,
        ]);

        $combo = Product::factory()->create([
            'company_id' => $this->company->id,
            'base_unit_id' => $this->units['und']->id,
            'type' => ProductType::Combo,
            'inventory_behavior' => InventoryBehavior::RecipeExploded,
            'name' => 'Almuerzo ejecutivo',
            'is_sellable' => true,
            'tracks_lots' => false,
        ]);
        $combo->comboItems()->create(['component_product_id' => $soup->id, 'quantity' => 1]);
        $combo->comboItems()->create(['component_product_id' => $water->id, 'quantity' => 1]);

        $lines = app(RecipeExplosionService::class)->explodeForSale($combo->fresh(['comboItems.component']), '1');
        $ids = collect($lines)->map(fn ($line) => $line['product']->id)->sort()->values();

        $this->assertTrue($ids->contains($potato->id));
        $this->assertTrue($ids->contains($water->id));
        $this->assertTrue(Decimal::cmp(collect($lines)->firstWhere(fn ($l) => $l['product']->id === $water->id)['quantity'], '1') === 0);
    }

    public function test_weighted_average_cost_updates_on_receive(): void
    {
        $sugar = $this->ingredient('Azúcar', '1.00');
        $this->kardex->receive($this->warehouse, $sugar, '10', '1.00', 'A');
        $this->kardex->receive($this->warehouse, $sugar, '10', '2.00', 'B');

        $this->assertSame('1.5000', $sugar->stockItems()->first()->avg_cost);
    }
}
