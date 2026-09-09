<?php

namespace App\Domain\Sales;

use RuntimeException;

class OpenCashSessionRequiredException extends RuntimeException
{
    public function __construct(string $message = 'Debe abrir una sesión de caja antes de cobrar.')
    {
        parent::__construct($message);
    }
}
