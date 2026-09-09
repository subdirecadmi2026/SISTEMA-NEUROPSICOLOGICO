<?php

namespace App\Enums;

enum WarehouseType: string
{
    case General = 'general';
    case Kitchen = 'kitchen';
    case Bar = 'bar';
    case Dry = 'dry';
    case Cold = 'cold';
    case Packaging = 'packaging';
}
