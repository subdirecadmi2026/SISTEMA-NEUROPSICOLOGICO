<?php

namespace App\Models;

use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'trade_name',
    'ruc',
    'ruc_hash',
    'legal_name',
    'email',
    'phone',
    'address',
    'city',
    'province',
    'country_code',
    'timezone',
    'currency_code',
    'logo_path',
    'settings',
    'is_active',
])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory, HasUlids;

    protected function casts(): array
    {
        return [
            'ruc' => 'encrypted',
            'settings' => 'array',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Company $company): void {
            if ($company->ruc) {
                $digits = preg_replace('/\D+/', '', $company->ruc) ?: '';
                $company->ruc_hash = hash('sha256', $digits);
            }
        });
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
