<?php

namespace App\Models;

use App\Enums\AdjustmentReason;
use App\Enums\AdjustmentStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id',
    'warehouse_id',
    'requested_by',
    'approved_by',
    'status',
    'reason_code',
    'notes',
    'approved_at',
])]
class StockAdjustment extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'status' => AdjustmentStatus::class,
            'reason_code' => AdjustmentReason::class,
            'approved_at' => 'datetime',
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockAdjustmentItem::class, 'adjustment_id');
    }
}
