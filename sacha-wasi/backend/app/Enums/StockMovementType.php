<?php

namespace App\Enums;

enum StockMovementType: string
{
    case PurchaseReceipt = 'purchase_receipt';
    case Sale = 'sale';
    case RecipeConsumption = 'recipe_consumption';
    case ProductionOutput = 'production_output';
    case TransferOut = 'transfer_out';
    case TransferIn = 'transfer_in';
    case Adjustment = 'adjustment';
    case Waste = 'waste';
    case CountGain = 'count_gain';
    case CountLoss = 'count_loss';
    case Return = 'return';

    public function direction(): string
    {
        return match ($this) {
            self::PurchaseReceipt,
            self::ProductionOutput,
            self::TransferIn,
            self::CountGain,
            self::Return => 'in',
            default => 'out',
        };
    }
}
