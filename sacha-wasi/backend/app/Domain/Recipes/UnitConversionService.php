<?php

namespace App\Domain\Recipes;

use App\Enums\UnitDimension;
use App\Models\Unit;
use App\Support\Decimal;
use InvalidArgumentException;

class UnitConversionService
{
    public function convert(string $quantity, Unit $from, Unit $to): string
    {
        if ($from->id === $to->id) {
            return Decimal::of($quantity);
        }

        if ($from->dimension !== $to->dimension) {
            throw new InvalidArgumentException(
                "No se puede convertir {$from->symbol} ({$from->dimension->value}) a {$to->symbol} ({$to->dimension->value})."
            );
        }

        $baseQty = Decimal::mul($quantity, (string) $from->factor_to_base);

        return Decimal::div($baseQty, (string) $to->factor_to_base);
    }

    public function toBase(string $quantity, Unit $unit): string
    {
        return Decimal::mul($quantity, (string) $unit->factor_to_base);
    }

    public function sameDimension(Unit $from, Unit $to): bool
    {
        return $from->dimension === $to->dimension
            || $from->dimension === UnitDimension::Count && $to->dimension === UnitDimension::Count;
    }
}
