<?php

namespace App\Models;

use App\Enums\UnitDimension;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\UnitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'company_id',
    'name',
    'symbol',
    'dimension',
    'factor_to_base',
    'is_system',
])]
class Unit extends Model
{
    /** @use HasFactory<UnitFactory> */
    use BelongsToCompany, HasFactory, HasUlids;

    protected function casts(): array
    {
        return [
            'dimension' => UnitDimension::class,
            'factor_to_base' => 'decimal:8',
            'is_system' => 'boolean',
        ];
    }
}
