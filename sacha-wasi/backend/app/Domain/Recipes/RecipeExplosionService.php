<?php

namespace App\Domain\Recipes;

use App\Enums\InventoryBehavior;
use App\Enums\ProductType;
use App\Models\Product;
use App\Support\Decimal;

class RecipeExplosionService
{
    public function __construct(private readonly UnitConversionService $units) {}

    /**
     * Explota un producto vendido a insumos hoja (FEFO se aplica después en kardex).
     *
     * Combos recorren su composición comercial; platos preparados recorren la receta.
     *
     * @return list<array{product: Product, quantity: string}>
     */
    public function explodeForSale(Product $product, string $quantity, array $visiting = []): array
    {
        if (isset($visiting[$product->id])) {
            throw new CircularRecipeException($product->id);
        }

        $visiting[$product->id] = true;

        if ($product->type === ProductType::Combo) {
            return $this->explodeCombo($product, $quantity, $visiting);
        }

        return $this->explodeRecipe($product, $quantity, $visiting);
    }

    /**
     * Explota la receta de producción (sin recorrer combos).
     *
     * @return list<array{product: Product, quantity: string}>
     */
    public function explodeForProduction(Product $product, string $quantity, array $visiting = []): array
    {
        return $this->explodeRecipe($product, $quantity, $visiting, forceRecipe: true);
    }

    /**
     * @param  array<string, true>  $visiting
     * @return list<array{product: Product, quantity: string}>
     */
    private function explodeCombo(Product $product, string $quantity, array $visiting): array
    {
        $product->loadMissing('comboItems.component');
        $lines = [];

        foreach ($product->comboItems as $item) {
            if ($item->is_optional) {
                continue;
            }

            $componentQty = Decimal::mul($quantity, (string) $item->quantity);
            $lines = array_merge(
                $lines,
                $this->explodeForSale($item->component, $componentQty, $visiting)
            );
        }

        return $this->merge($lines);
    }

    /**
     * @param  array<string, true>  $visiting
     * @return list<array{product: Product, quantity: string}>
     */
    private function explodeRecipe(Product $product, string $quantity, array $visiting, bool $forceRecipe = false): array
    {
        $behavior = $product->inventory_behavior;

        if ($behavior === InventoryBehavior::None) {
            return [];
        }

        $product->loadMissing(['activeRecipe.items.component.baseUnit', 'activeRecipe.items.unit', 'baseUnit']);
        $recipe = $product->activeRecipe;

        $shouldExplode = $forceRecipe || $behavior === InventoryBehavior::RecipeExploded;

        if (! $shouldExplode || ! $recipe) {
            if ($behavior === InventoryBehavior::Tracked || ($forceRecipe === false && ! $recipe)) {
                return [['product' => $product, 'quantity' => Decimal::of($quantity)]];
            }

            return [];
        }

        $factor = Decimal::div($quantity, (string) $recipe->yield_quantity);

        if (Decimal::cmp((string) $recipe->process_waste_percent, '0') > 0) {
            $keepRatio = Decimal::div(
                Decimal::sub('100', (string) $recipe->process_waste_percent),
                '100'
            );
            $factor = Decimal::div($factor, $keepRatio);
        }

        $lines = [];

        foreach ($recipe->items as $item) {
            $qtyWithWaste = Decimal::mul($factor, $item->quantityWithWaste());
            $qtyInBase = $this->units->convert($qtyWithWaste, $item->unit, $item->component->baseUnit);
            $lines = array_merge($lines, $this->explodeForSale($item->component, $qtyInBase, $visiting));
        }

        return $this->merge($lines);
    }

    /**
     * @param  list<array{product: Product, quantity: string}>  $lines
     * @return list<array{product: Product, quantity: string}>
     */
    private function merge(array $lines): array
    {
        $grouped = [];

        foreach ($lines as $line) {
            $id = $line['product']->id;
            $grouped[$id] ??= ['product' => $line['product'], 'quantity' => '0'];
            $grouped[$id]['quantity'] = Decimal::add($grouped[$id]['quantity'], $line['quantity']);
        }

        return array_values($grouped);
    }
}
