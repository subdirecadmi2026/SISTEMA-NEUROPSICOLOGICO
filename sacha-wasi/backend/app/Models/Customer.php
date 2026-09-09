<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id', 'name', 'document_type', 'document_number', 'email', 'phone', 'address',
    'birthday', 'allergies', 'preferences', 'segment', 'points', 'lifetime_spend',
    'last_visit_at', 'is_active',
])]
class Customer extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'allergies' => 'array',
            'preferences' => 'array',
            'points' => 'integer',
            'lifetime_spend' => 'decimal:2',
            'last_visit_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class);
    }
}
