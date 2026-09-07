<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetCurrentContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            app()->instance('currentCompanyId', $user->company_id);

            $branchId = $request->header('X-Branch-Id') ?: $user->current_branch_id;

            if ($branchId && $user->company_id) {
                app()->instance('currentBranchId', $branchId);
            }
        }

        return $next($request);
    }
}
