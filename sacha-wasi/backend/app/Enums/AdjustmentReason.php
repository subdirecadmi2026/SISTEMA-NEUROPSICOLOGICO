<?php

namespace App\Enums;

enum AdjustmentReason: string
{
    case Waste = 'waste';
    case Spoilage = 'spoilage';
    case Theft = 'theft';
    case CountVariance = 'count_variance';
    case Donation = 'donation';
    case Other = 'other';
}
