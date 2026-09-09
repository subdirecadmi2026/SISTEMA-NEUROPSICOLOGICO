<?php

namespace Tests\Unit;

use App\Domain\Recipes\CircularRecipeException;
use App\Domain\Recipes\RecipeCostingService;
use App\Models\Recipe;
use App\Support\Decimal;
use Tests\TestCase;

class RecipeCostingServiceTest extends TestCase
{
    private RecipeCostingService $costing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createContext();
        $this->costing = app(RecipeCostingService::class);
    }

    public function test_ingredient_cost_is_the_default_cost(): void
    {
        $tomato = $this->ingredient('Tomate', '2.0000');

        $this->assertSame('2.0000', $this->costing->unitCost($tomato));
    }

    public function test_recipe_cost_includes_item_waste_and_unit_conversion(): void
    {
        $tomato = $this->ingredient('Tomate', '2.0000', 'kg');
        $soup = $this->prepared('Sopa de tomate', '5.00');

        $recipe = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $soup->id,
            'yield_unit_id' => $this->units['porcion']->id,
            'yield_quantity' => 1,
            'process_waste_percent' => 0,
        ]);
        $recipe->items()->create([
            'component_product_id' => $tomato->id,
            'unit_id' => $this->units['g']->id,
            'quantity' => 200,
            'waste_percent' => 10,
        ]);

        // 200 g * 1.10 merma = 220 g = 0.22 kg * $2 = $0.44
        $this->assertSame('0.4400', $this->costing->unitCost($soup->fresh(['activeRecipe.items.component.baseUnit', 'activeRecipe.items.unit'])));
    }

    public function test_process_waste_increases_unit_cost(): void
    {
        $potato = $this->ingredient('Papa', '1.0000', 'kg');
        $locro = $this->prepared('Locro');

        $recipe = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $locro->id,
            'yield_unit_id' => $this->units['porcion']->id,
            'yield_quantity' => 1,
            'process_waste_percent' => 10,
        ]);
        $recipe->items()->create([
            'component_product_id' => $potato->id,
            'unit_id' => $this->units['kg']->id,
            'quantity' => 0.3,
            'waste_percent' => 0,
        ]);

        $cost = $this->costing->unitCost($locro->fresh(['activeRecipe.items.component.baseUnit', 'activeRecipe.items.unit']));

        // 0.3 kg * $1 / 0.9 merma de proceso = 0.3333
        $this->assertSame('0.3333', $cost);
    }

    public function test_subrecipe_cost_rolls_up(): void
    {
        $cilantro = $this->ingredient('Cilantro', '2.0000', 'kg');
        $salsa = $this->prepared('Salsa', '0');
        $salsa->update(['base_unit_id' => $this->units['g']->id]);

        $salsaRecipe = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $salsa->id,
            'yield_unit_id' => $this->units['g']->id,
            'yield_quantity' => 100,
        ]);
        $salsaRecipe->items()->create([
            'component_product_id' => $cilantro->id,
            'unit_id' => $this->units['g']->id,
            'quantity' => 100,
            'waste_percent' => 0,
        ]);

        $dish = $this->prepared('Plato con salsa', '7.00');
        $dishRecipe = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $dish->id,
            'yield_unit_id' => $this->units['porcion']->id,
            'yield_quantity' => 1,
        ]);
        $dishRecipe->items()->create([
            'component_product_id' => $salsa->id,
            'unit_id' => $this->units['g']->id,
            'quantity' => 50,
            'waste_percent' => 0,
        ]);

        // cilantro $2/kg = $0.002/g; 100 g salsa = $0.20; 50 g en el plato = $0.10
        $this->assertSame('0.1000', $this->costing->unitCost($dish->fresh(['activeRecipe.items.component.baseUnit', 'activeRecipe.items.unit'])));
    }

    public function test_circular_recipe_is_rejected(): void
    {
        $a = $this->prepared('A');
        $b = $this->prepared('B');

        $ra = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $a->id,
            'yield_unit_id' => $this->units['porcion']->id,
        ]);
        $ra->items()->create([
            'component_product_id' => $b->id,
            'unit_id' => $this->units['porcion']->id,
            'quantity' => 1,
        ]);

        $rb = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $b->id,
            'yield_unit_id' => $this->units['porcion']->id,
        ]);
        $rb->items()->create([
            'component_product_id' => $a->id,
            'unit_id' => $this->units['porcion']->id,
            'quantity' => 1,
        ]);

        $this->expectException(CircularRecipeException::class);
        $this->costing->unitCost($a->fresh(['activeRecipe.items.component.baseUnit', 'activeRecipe.items.unit']));
    }

    public function test_margin_breakdown_uses_sale_price(): void
    {
        $flour = $this->ingredient('Harina', '1.0000');
        $bread = $this->prepared('Pan', '4.00');

        $recipe = Recipe::factory()->create([
            'company_id' => $this->company->id,
            'product_id' => $bread->id,
            'yield_unit_id' => $this->units['porcion']->id,
        ]);
        $recipe->items()->create([
            'component_product_id' => $flour->id,
            'unit_id' => $this->units['kg']->id,
            'quantity' => 0.5,
            'waste_percent' => 0,
        ]);

        $breakdown = $this->costing->costBreakdown($bread->fresh(['activeRecipe.items.component.baseUnit', 'activeRecipe.items.unit', 'baseUnit']));

        $this->assertSame('0.5000', $breakdown['unit_cost']);
        $this->assertTrue(Decimal::cmp($breakdown['profit'], '0') > 0);
        $this->assertNotEmpty($breakdown['items']);
    }
}
