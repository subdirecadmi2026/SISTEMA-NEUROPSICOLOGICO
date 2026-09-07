<?php

namespace App\Enums;

enum UnitDimension: string
{
    case Mass = 'mass';
    case Volume = 'volume';
    case Count = 'count';
    case Time = 'time';
}
