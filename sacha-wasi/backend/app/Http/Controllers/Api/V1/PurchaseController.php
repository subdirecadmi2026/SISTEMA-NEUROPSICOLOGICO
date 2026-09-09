<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Purchasing\PurchaseService;
use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function __construct(private readonly PurchaseService $purchases) {}

    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'purchases.view');

        return response()->json(
            PurchaseOrder::query()
                ->with(['supplier', 'warehouse', 'items.product'])
                ->where('branch_id', $this->branchId($request))
                ->orderByDesc('created_at')
                ->paginate(50)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($request, 'purchases.manage');
        $data = $request->validate([
            'warehouse_id' => ['required', 'string', 'exists:warehouses,id'],
            'supplier_id' => ['required', 'string', 'exists:suppliers,id'],
            'expected_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'string', 'exists:products,id'],
            'items.*.quantity_ordered' => ['required', 'numeric', 'min:0.0001'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'items.*.lot_code' => ['nullable', 'string'],
            'items.*.expires_at' => ['nullable', 'date'],
        ]);
        $data['branch_id'] = $this->branchId($request);

        return response()->json($this->purchases->create($data, $request->user()), 201);
    }

    public function approve(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->allow($request, 'purchases.approve');

        return response()->json($this->purchases->approve($purchaseOrder, $request->user()));
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->allow($request, 'purchases.receive');

        return response()->json($this->purchases->receive($purchaseOrder, $request->user()));
    }
}
