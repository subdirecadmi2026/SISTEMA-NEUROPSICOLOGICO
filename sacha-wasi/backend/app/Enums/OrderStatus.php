<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Open = 'open';
    case InKitchen = 'in_kitchen';
    case Ready = 'ready';
    case Delivered = 'delivered';
    case Billed = 'billed';
    case Cancelled = 'cancelled';
}
