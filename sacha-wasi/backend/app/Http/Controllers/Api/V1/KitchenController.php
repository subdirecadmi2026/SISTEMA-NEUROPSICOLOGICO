<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Sales\SaleService;
use App\Enums\KitchenStatus;
use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class KitchenController extends Controller
{
    public function __construct(private readonly SaleService $sales) {}

    public function tickets(Request $request): JsonResponse
    {
        $this->allow($request, 'kds.view');

        $items = OrderItem::query()
            ->with(['order.table', 'product', 'kitchenStation'])
            ->whereHas('order', function ($q) use ($request) {
                $q->where('branch_id', $this->branchId($request))
                    ->whereIn('status', ['open', 'in_kitchen', 'ready', 'delivered']);
            })
            ->whereIn('kitchen_status', ['pending', 'preparing', 'ready'])
            ->orderBy('fired_at')
            ->orderBy('created_at')
            ->get();

        return response()->json($items);
    }

    public function advance(Request $request, OrderItem $item): JsonResponse
    {
        $this->allow($request, 'kds.advance');
        $data = $request->validate([
            'status' => ['required', Rule::enum(KitchenStatus::class)],
        ]);

        return response()->json($this->sales->advanceKitchenItem($item, KitchenStatus::from($data['status'])));
    }
}
