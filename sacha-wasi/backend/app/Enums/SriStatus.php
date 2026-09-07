<?php

namespace App\Enums;

enum SriStatus: string
{
    case Pending = 'pending';
    case Received = 'received';
    case Authorized = 'authorized';
    case Rejected = 'rejected';
    case Contingency = 'contingency';
    case Voided = 'voided';
}
