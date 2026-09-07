<?php

namespace App\Enums;

enum LotStatus: string
{
    case Available = 'available';
    case Quarantine = 'quarantine';
    case Expired = 'expired';
    case Depleted = 'depleted';
}
