<?php

namespace App\Enums;

enum InventoryBehavior: string
{
    case Tracked = 'tracked';
    case RecipeExploded = 'recipe_exploded';
    case None = 'none';
}
