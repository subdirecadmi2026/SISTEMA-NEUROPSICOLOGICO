<?php

namespace App\Models;

use App\Enums\TableStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'company_id', 'branch_id', 'dining_area_id', 'name', 'code', 'qr_token',
    'seats', 'pos_x', 'pos_y', 'status', 'is_active',
])]
class DiningTable extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'seats' => 'integer',
            'pos_x' => 'integer',
            'pos_y' => 'integer',
            'status' => TableStatus::class,
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (DiningTable $table): void {
            $table->qr_token ??= Str::lower(Str::random(16));
        });
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(DiningArea::class, 'dining_area_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function openOrder(): ?Order
    {
        return $this->orders()
            ->whereNotIn('status', ['billed', 'cancelled'])
            ->latest()
            ->first();
    }
}
