<?php

namespace App\Enums;

enum SalesChannel: string
{
    case Salon = 'salon';
    case Takeaway = 'takeaway';
    case Delivery = 'delivery';
    case QrMenu = 'qr_menu';
}
