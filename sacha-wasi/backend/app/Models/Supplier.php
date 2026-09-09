<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['company_id', 'name', 'trade_name', 'ruc', 'email', 'phone', 'address', 'city', 'lead_time_days', 'quality_score', 'is_active', 'notes'])]
class Supplier extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'lead_time_days' => 'decimal:1', 'quality_score' => 'decimal:2'];
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }
}
