<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id', 'branch_id', 'dining_table_id', 'customer_id', 'guest_name',
    'guest_phone', 'party_size', 'reserved_at', 'status', 'channel', 'notes',
])]
class Reservation extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'reserved_at' => 'datetime',
        ];
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(DiningTable::class, 'dining_table_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
