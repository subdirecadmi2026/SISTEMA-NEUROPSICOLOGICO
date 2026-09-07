<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'audit.view');

        $query = AuditLog::query()
            ->with('user')
            ->where('company_id', $this->companyId($request))
            ->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', 'like', '%'.$request->string('action').'%');
        }

        return response()->json($query->paginate(80));
    }
}
