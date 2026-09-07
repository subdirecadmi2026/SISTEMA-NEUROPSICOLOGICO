<?php

namespace App\Models;

use App\Enums\CountStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id',
    'warehouse_id',
    'counted_by',
    'status',
    'notes',
    'counted_at',
])]
class InventoryCount extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'status' => CountStatus::class,
            'counted_at' => 'datetime',
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InventoryCountItem::class, 'count_id');
    }
}
