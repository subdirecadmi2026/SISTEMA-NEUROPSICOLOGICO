<?php

namespace App\Enums;

enum PurchaseStatus: string
{
    case Draft = 'draft';
    case Approved = 'approved';
    case Received = 'received';
    case Cancelled = 'cancelled';
}
