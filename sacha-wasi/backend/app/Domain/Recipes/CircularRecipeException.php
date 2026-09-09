<?php

namespace App\Domain\Recipes;

use RuntimeException;

class CircularRecipeException extends RuntimeException
{
    public function __construct(string $productId)
    {
        parent::__construct("La receta del producto {$productId} contiene un ciclo de sub-recetas.");
    }
}
