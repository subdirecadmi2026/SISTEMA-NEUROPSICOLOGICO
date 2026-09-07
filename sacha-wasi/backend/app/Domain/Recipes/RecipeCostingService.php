<?php

namespace App\Domain\Recipes;

use App\Enums\InventoryBehavior;
use App\Models\Product;
use App\Models\Recipe;
use App\Support\Decimal;

class RecipeCostingService
{
    public function __construct(private readonly UnitConversionService $units) {}

    /**
     * Costo unitario del producto en su unidad base (incluye mermas de ítem y de proceso).
     *
     * @param  array<string, true>  $visiting
     */
    public function unitCost(Product $product, array $visiting = []): string
    {
        if (isset($visiting[$product->id])) {
            throw new CircularRecipeException($product->id);
        }

        $recipe = $this->activeRecipe($product);

        if (! $recipe) {
            return Decimal::of((string) $product->default_cost);
        }

        $visiting[$product->id] = true;
        $batchCost = '0';

        foreach ($recipe->items as $item) {
            $item->loadMissing('component.baseUnit', 'unit');
            $component = $item->component;
            $qtyWithWaste = $item->quantityWithWaste();
            $qtyInComponentBase = $this->units->convert($qtyWithWaste, $item->unit, $component->baseUnit);
            $componentCost = $this->unitCost($component, $visiting);
            $batchCost = Decimal::add($batchCost, Decimal::mul($qtyInComponentBase, $componentCost));
        }

        $yield = Decimal::of((string) $recipe->yield_quantity);

        if (Decimal::isZero($yield)) {
            return '0';
        }

        $unitCost = Decimal::div($batchCost, $yield);

        if (Decimal::cmp((string) $recipe->process_waste_percent, '0') > 0) {
            $keepRatio = Decimal::div(
                Decimal::sub('100', (string) $recipe->process_waste_percent),
                '100'
            );
            $unitCost = Decimal::div($unitCost, $keepRatio);
        }

        return Decimal::stock($unitCost);
    }

    public function refreshCachedCost(Recipe $recipe): string
    {
        $recipe->loadMissing('product', 'items.component.baseUnit', 'items.unit');
        $cost = $this->unitCost($recipe->product);
        $recipe->update(['cached_unit_cost' => $cost]);
        $recipe->product->update(['default_cost' => $cost]);

        return $cost;
    }

    public function costBreakdown(Product $product): array
    {
        $recipe = $this->activeRecipe($product);
        $unitCost = $this->unitCost($product);
        $price = Decimal::of((string) $product->default_price);
        $profit = Decimal::sub($price, $unitCost);
        $margin = Decimal::isZero($price) ? '0' : Decimal::mul(Decimal::div($profit, $price), '100', 2);

        $items = [];

        if ($recipe) {
            foreach ($recipe->items as $item) {
                $item->loadMissing('component.baseUnit', 'unit');
                $qty = $this->units->convert(
                    $item->quantityWithWaste(),
                    $item->unit,
                    $item->component->baseUnit
                );
                $componentCost = $this->unitCost($item->component);
                $lineCost = Decimal::stock(Decimal::mul($qty, $componentCost));

                $items[] = [
                    'product_id' => $item->component_product_id,
                    'name' => $item->component->name,
                    'quantity' => Decimal::stock($qty),
                    'unit' => $item->component->baseUnit->symbol,
                    'unit_cost' => $componentCost,
                    'line_cost' => $lineCost,
                    'waste_percent' => (string) $item->waste_percent,
                    'is_subrecipe' => $item->component->inventory_behavior === InventoryBehavior::RecipeExploded
                        && $item->component->activeRecipe()->exists(),
                ];
            }
        }

        return [
            'product_id' => $product->id,
            'unit_cost' => $unitCost,
            'sale_price' => Decimal::round($price, 2),
            'profit' => Decimal::round($profit, 4),
            'margin_percent' => $margin,
            'process_waste_percent' => $recipe?->process_waste_percent,
            'items' => $items,
        ];
    }

    private function activeRecipe(Product $product): ?Recipe
    {
        $product->loadMissing(['activeRecipe.items.component.baseUnit', 'activeRecipe.items.unit', 'baseUnit']);

        return $product->activeRecipe;
    }
}
