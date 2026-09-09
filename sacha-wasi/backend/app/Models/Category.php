<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'company_id',
    'parent_id',
    'name',
    'slug',
    'image_path',
    'color',
    'sort_order',
    'is_active',
    'show_on_pos',
    'show_on_qr_menu',
])]
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use BelongsToCompany, HasFactory, HasUlids;

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
            'show_on_pos' => 'boolean',
            'show_on_qr_menu' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Category $category): void {
            if (! $category->slug) {
                $category->slug = Str::slug($category->name).'-'.Str::lower(Str::random(4));
            }
        });
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
