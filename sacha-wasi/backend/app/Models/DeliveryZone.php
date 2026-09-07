<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['company_id', 'branch_id', 'name', 'fee', 'eta_minutes', 'is_active'])]
class DeliveryZone extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'eta_minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
