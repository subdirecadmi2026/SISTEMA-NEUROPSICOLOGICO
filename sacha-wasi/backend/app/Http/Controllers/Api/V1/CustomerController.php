<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'customers.view');
        $query = Customer::query()->orderBy('name');
        if ($request->filled('search')) {
            $term = $request->string('search')->toString();
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('document_number', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            });
        }

        return response()->json($query->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($request, 'customers.manage');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'document_type' => ['nullable', 'string', 'max:16'],
            'document_number' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string'],
            'birthday' => ['nullable', 'date'],
            'allergies' => ['nullable', 'array'],
            'preferences' => ['nullable', 'array'],
            'segment' => ['nullable', 'string'],
        ]);
        $data['company_id'] = $this->companyId($request);

        return response()->json(Customer::query()->create($data), 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $this->allow($request, 'customers.manage');
        $customer->update($request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'phone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'address' => ['nullable', 'string'],
            'segment' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]));

        return response()->json($customer->fresh(['loyaltyTransactions']));
    }

    public function show(Request $request, Customer $customer): JsonResponse
    {
        $this->allow($request, 'customers.view');

        return response()->json($customer->load(['orders' => fn ($q) => $q->latest()->limit(10), 'loyaltyTransactions']));
    }
}
