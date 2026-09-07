<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'expenses.view');

        return response()->json(
            Expense::query()
                ->with('user')
                ->where('branch_id', $this->branchId($request))
                ->orderByDesc('incurred_on')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($request, 'expenses.manage');
        $data = $request->validate([
            'category' => ['required', 'string', 'max:32'],
            'description' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'incurred_on' => ['required', 'date'],
            'vendor' => ['nullable', 'string'],
        ]);
        $data['company_id'] = $this->companyId($request);
        $data['branch_id'] = $this->branchId($request);
        $data['user_id'] = $request->user()->id;

        return response()->json(Expense::query()->create($data), 201);
    }
}
