<?php

namespace App\Domain\Inventory;

use RuntimeException;

class ImmutableKardexException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('El kardex es inmutable: no se pueden modificar ni eliminar movimientos de inventario.');
    }
}
