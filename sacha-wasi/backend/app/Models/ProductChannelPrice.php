<?php

namespace App\Models;

use App\Enums\SalesChannel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['product_id', 'branch_id', 'channel', 'price'])]
class ProductChannelPrice extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'channel' => SalesChannel::class,
            'price' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
