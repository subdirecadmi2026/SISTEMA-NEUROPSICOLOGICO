<?php

namespace App\Enums;

enum KitchenStatus: string
{
    case Pending = 'pending';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Delivered = 'delivered';
}
