<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\TableStatus;
use App\Http\Controllers\Controller;
use App\Models\DiningArea;
use App\Models\DiningTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'tables.view');

        $areas = DiningArea::query()
            ->with(['tables' => function ($q) {
                $q->with(['orders' => fn ($o) => $o->whereNotIn('status', ['billed', 'cancelled'])->latest()]);
            }])
            ->where('branch_id', $this->branchId($request))
            ->orderBy('sort_order')
            ->get();

        return response()->json($areas);
    }

    public function updateStatus(Request $request, DiningTable $table): JsonResponse
    {
        $this->allow($request, 'tables.manage');
        $data = $request->validate([
            'status' => ['required', Rule::enum(TableStatus::class)],
        ]);
        $table->update(['status' => $data['status']]);

        return response()->json($table->fresh('area'));
    }
}
