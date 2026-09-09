<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'company_id',
    'code',
    'name',
    'percent',
    'sri_code',
    'is_default',
    'is_active',
])]
class TaxRate extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'percent' => 'decimal:4',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
