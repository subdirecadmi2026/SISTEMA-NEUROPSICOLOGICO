<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'company_id', 'code', 'name', 'type', 'value', 'min_ticket',
    'max_redemptions', 'redeemed', 'starts_at', 'ends_at', 'is_active',
])]
class Coupon extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'min_ticket' => 'decimal:2',
            'max_redemptions' => 'integer',
            'redeemed' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }
}
