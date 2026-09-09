<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'suppliers.view');

        return response()->json(Supplier::query()->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($request, 'suppliers.manage');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'trade_name' => ['nullable', 'string'],
            'ruc' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
        $data['company_id'] = $this->companyId($request);

        return response()->json(Supplier::query()->create($data), 201);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $this->allow($request, 'suppliers.manage');
        $supplier->update($request->only(['name', 'trade_name', 'ruc', 'email', 'phone', 'address', 'city', 'notes', 'is_active']));

        return response()->json($supplier);
    }
}
