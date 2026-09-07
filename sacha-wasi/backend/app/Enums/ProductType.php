<?php

namespace App\Enums;

enum ProductType: string
{
    case Ingredient = 'ingredient';
    case Simple = 'simple';
    case Prepared = 'prepared';
    case Combo = 'combo';
    case Modifier = 'modifier';
    case Packaging = 'packaging';

    public function label(): string
    {
        return match ($this) {
            self::Ingredient => 'Insumo',
            self::Simple => 'Simple',
            self::Prepared => 'Preparado',
            self::Combo => 'Combo',
            self::Modifier => 'Extra / modificador',
            self::Packaging => 'Empaque',
        };
    }

    public function defaultInventoryBehavior(): InventoryBehavior
    {
        return match ($this) {
            self::Prepared, self::Combo, self::Modifier => InventoryBehavior::RecipeExploded,
            self::Ingredient, self::Simple, self::Packaging => InventoryBehavior::Tracked,
        };
    }

    public function defaultSellable(): bool
    {
        return $this !== self::Ingredient && $this !== self::Packaging;
    }

    public function defaultPurchasable(): bool
    {
        return $this === self::Ingredient || $this === self::Simple || $this === self::Packaging;
    }
}
