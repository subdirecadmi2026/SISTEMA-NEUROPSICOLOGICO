<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Sales\SaleService;
use App\Enums\DocumentType;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private readonly SaleService $sales) {}

    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'pos.sell');

        $query = Order::query()
            ->with(['items', 'table', 'customer', 'user', 'latestFiscalDocument', 'payments'])
            ->where('branch_id', $this->branchId($request))
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('channel')) {
            $query->where('channel', $request->string('channel'));
        }

        return response()->json($query->paginate(50));
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->allow($request, 'pos.sell');

        return response()->json($this->sales->fresh($order));
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($request, 'pos.sell');
        $data = $request->validate([
            'dining_table_id' => ['nullable', 'string', 'exists:dining_tables,id'],
            'customer_id' => ['nullable', 'string', 'exists:customers,id'],
            'warehouse_id' => ['nullable', 'string', 'exists:warehouses,id'],
            'channel' => ['nullable', 'string'],
            'guest_name' => ['nullable', 'string', 'max:120'],
            'covers' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string'],
            'client_ulid' => ['nullable', 'string', 'max:26'],
            'delivery_address' => ['nullable', 'string'],
            'delivery_zone_id' => ['nullable', 'string', 'exists:delivery_zones,id'],
            'rider_id' => ['nullable', 'string', 'exists:riders,id'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
        ]);
        $data['branch_id'] = $this->branchId($request);

        return response()->json($this->sales->open($data, $request->user()), 201);
    }

    public function addItem(Request $request, Order $order): JsonResponse
    {
        $this->allow($request, 'pos.sell');
        $data = $request->validate([
            'product_id' => ['required', 'string', 'exists:products,id'],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'modifiers' => ['nullable', 'array'],
        ]);

        if (! empty($data['discount_amount']) && (float) $data['discount_amount'] > 0) {
            $this->allow($request, 'pos.discount');
        }

        return response()->json($this->sales->addItem($order, $data));
    }

    public function removeItem(Request $request, Order $order, OrderItem $item): JsonResponse
    {
        $this->allow($request, 'pos.sell');

        return response()->json($this->sales->removeItem($order, $item));
    }

    public function sendToKitchen(Request $request, Order $order): JsonResponse
    {
        $this->allow($request, 'pos.sell');

        return response()->json($this->sales->sendToKitchen($order, $request->user()));
    }

    public function pay(Request $request, Order $order): JsonResponse
    {
        $this->allow($request, 'pos.sell');
        $data = $request->validate([
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.method' => ['required', 'string'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'payments.*.reference' => ['nullable', 'string'],
            'document_type' => ['nullable', Rule::enum(DocumentType::class)],
            'coupon_code' => ['nullable', 'string'],
            'tip_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        return response()->json($this->sales->pay(
            $order,
            $data['payments'],
            $request->user(),
            DocumentType::from($data['document_type'] ?? DocumentType::Invoice->value),
            $data['coupon_code'] ?? null,
            (string) ($data['tip_amount'] ?? '0'),
        ));
    }

    public function quickSale(Request $request): JsonResponse
    {
        $this->allow($request, 'pos.sell');
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'string', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string'],
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.method' => ['required', 'string'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'payments.*.reference' => ['nullable', 'string'],
            'document_type' => ['nullable', Rule::enum(DocumentType::class)],
            'dining_table_id' => ['nullable', 'string', 'exists:dining_tables,id'],
            'customer_id' => ['nullable', 'string', 'exists:customers,id'],
            'channel' => ['nullable', 'string'],
            'guest_name' => ['nullable', 'string'],
            'client_ulid' => ['nullable', 'string', 'max:26'],
            'coupon_code' => ['nullable', 'string'],
            'tip_amount' => ['nullable', 'numeric', 'min:0'],
            'delivery_address' => ['nullable', 'string'],
            'delivery_zone_id' => ['nullable', 'string'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
        ]);
        $data['branch_id'] = $this->branchId($request);

        return response()->json($this->sales->quickSale($data, $request->user()), 201);
    }

    public function void(Request $request, Order $order): JsonResponse
    {
        $this->allow($request, 'pos.void');
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3'],
        ]);

        return response()->json($this->sales->void($order, $data['reason'], $request->user()));
    }
}
