<?php

namespace App\Models;

use App\Enums\DocumentType;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id', 'branch_id', 'document_type', 'establishment_code',
    'emission_point', 'next_number',
])]
class FiscalSequence extends Model
{
    use BelongsToCompany, HasUlids;

    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'next_number' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
