<?php

namespace App\Support;

final class Decimal
{
    public const SCALE = 8;

    public const STOCK_SCALE = 4;

    public static function of(int|float|string $value): string
    {
        if (is_int($value)) {
            return sprintf('%d', $value);
        }

        if (is_float($value)) {
            return number_format($value, self::SCALE, '.', '');
        }

        $normalized = trim($value);

        return $normalized === '' ? '0' : $normalized;
    }

    public static function add(string $left, string $right, int $scale = self::SCALE): string
    {
        return bcadd(self::of($left), self::of($right), $scale);
    }

    public static function sub(string $left, string $right, int $scale = self::SCALE): string
    {
        return bcsub(self::of($left), self::of($right), $scale);
    }

    public static function mul(string $left, string $right, int $scale = self::SCALE): string
    {
        return bcmul(self::of($left), self::of($right), $scale);
    }

    public static function div(string $left, string $right, int $scale = self::SCALE): string
    {
        if (bccomp(self::of($right), '0', $scale) === 0) {
            throw new \InvalidArgumentException('Division by zero.');
        }

        return bcdiv(self::of($left), self::of($right), $scale);
    }

    public static function cmp(string $left, string $right, int $scale = self::SCALE): int
    {
        return bccomp(self::of($left), self::of($right), $scale);
    }

    public static function max(string $left, string $right): string
    {
        return self::cmp($left, $right) >= 0 ? self::of($left) : self::of($right);
    }

    public static function min(string $left, string $right): string
    {
        return self::cmp($left, $right) <= 0 ? self::of($left) : self::of($right);
    }

    public static function isZero(string $value): bool
    {
        return self::cmp($value, '0') === 0;
    }

    public static function isNegative(string $value): bool
    {
        return self::cmp($value, '0') < 0;
    }

    public static function stock(string $value): string
    {
        return self::round($value, self::STOCK_SCALE);
    }

    public static function round(string $value, int $scale): string
    {
        return bcadd(self::of($value), '0', $scale);
    }
}
