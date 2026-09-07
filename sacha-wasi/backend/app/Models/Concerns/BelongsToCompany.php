<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $query): void {
            $companyId = app()->bound('currentCompanyId') ? app('currentCompanyId') : null;

            if ($companyId) {
                $query->where($query->getModel()->getTable().'.company_id', $companyId);
            }
        });

        static::creating(function (self $model): void {
            if (! $model->company_id && app()->bound('currentCompanyId')) {
                $model->company_id = app('currentCompanyId');
            }
        });
    }
}
