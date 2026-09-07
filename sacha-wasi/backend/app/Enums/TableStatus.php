<?php

namespace App\Enums;

enum TableStatus: string
{
    case Free = 'free';
    case Occupied = 'occupied';
    case WaitingFood = 'waiting_food';
    case Paying = 'paying';
    case Reserved = 'reserved';
}
