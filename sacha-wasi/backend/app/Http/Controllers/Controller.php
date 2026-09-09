<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    protected function allow(Request $request, string $permission): void
    {
        abort_unless($request->user()?->can($permission), 403, 'No autorizado.');
    }

    protected function companyId(Request $request): string
    {
        return (string) $request->user()->company_id;
    }

    protected function branchId(Request $request): string
    {
        return (string) (app()->bound('currentBranchId')
            ? app('currentBranchId')
            : $request->user()->current_branch_id);
    }
}
