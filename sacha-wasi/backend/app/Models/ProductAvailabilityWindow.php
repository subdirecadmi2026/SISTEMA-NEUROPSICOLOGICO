<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['product_id', 'branch_id', 'weekday', 'starts_at', 'ends_at'])]
class ProductAvailabilityWindow extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'weekday' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
