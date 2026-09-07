<?php

namespace App\Domain\Inventory;

use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public readonly string $productId,
        public readonly string $requested,
        public readonly string $available,
    ) {
        parent::__construct("Stock insuficiente para el producto {$productId}. Solicitado: {$requested}, disponible: {$available}.");
    }
}
