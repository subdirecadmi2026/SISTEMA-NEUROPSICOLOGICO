<?php

namespace App\Models;

use App\Enums\WarehouseType;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\WarehouseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id',
    'branch_id',
    'code',
    'name',
    'type',
    'is_default',
    'is_active',
])]
class Warehouse extends Model
{
    /** @use HasFactory<WarehouseFactory> */
    use BelongsToCompany, HasFactory, HasUlids;

    protected function casts(): array
    {
        return [
            'type' => WarehouseType::class,
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function stockItems(): HasMany
    {
        return $this->hasMany(StockItem::class);
    }
}
