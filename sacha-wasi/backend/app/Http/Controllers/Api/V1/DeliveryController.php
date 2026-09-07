<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Sales\SaleService;
use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Rider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function __construct(private readonly SaleService $sales) {}

    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'delivery.view');

        return response()->json([
            'orders' => Order::query()
                ->with(['customer', 'rider', 'deliveryZone', 'items'])
                ->where('branch_id', $this->branchId($request))
                ->where('channel', 'delivery')
                ->whereNotIn('status', ['cancelled'])
                ->orderByDesc('created_at')
                ->get(),
            'riders' => Rider::query()->where('branch_id', $this->branchId($request))->orderBy('name')->get(),
            'zones' => DeliveryZone::query()->where('branch_id', $this->branchId($request))->orderBy('name')->get(),
            'integrations' => [
                ['name' => 'Uber Eats', 'status' => 'stub', 'message' => 'Integración pendiente. Use delivery interno.'],
                ['name' => 'Rappi', 'status' => 'stub', 'message' => 'Integración pendiente. Use delivery interno.'],
                ['name' => 'Pasarela de pagos', 'status' => 'stub', 'message' => 'Cobros con tarjeta se registran de forma interna.'],
            ],
        ]);
    }

    public function assign(Request $request, Order $order): JsonResponse
    {
        $this->allow($request, 'delivery.manage');
        $data = $request->validate([
            'rider_id' => ['nullable', 'string', 'exists:riders,id'],
            'delivery_status' => ['nullable', 'in:queued,assigned,picked_up,on_route,delivered,cancelled'],
        ]);

        return response()->json($this->sales->assignDelivery($order, $data['rider_id'] ?? null, $data['delivery_status'] ?? 'assigned'));
    }
}
