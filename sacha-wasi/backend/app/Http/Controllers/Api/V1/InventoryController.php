<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventory\InsufficientStockException;
use App\Domain\Inventory\KardexService;
use App\Enums\AdjustmentReason;
use App\Enums\StockMovementType;
use App\Enums\TransferStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryController extends Controller
{
    public function __construct(private readonly KardexService $kardex) {}

    public function stock(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('inventory.stock.view'), 403);

        $query = StockItem::query()
            ->with(['product.baseUnit', 'product.category', 'warehouse.branch'])
            ->orderBy('qty_on_hand');

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->string('warehouse_id'));
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('qty_on_hand', '<=', 'min_qty')->where('min_qty', '>', 0);
        }

        return response()->json($query->get());
    }

    public function kardex(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('inventory.kardex.view'), 403);

        $query = StockMovement::query()
            ->with(['product', 'warehouse', 'lot', 'user'])
            ->orderByDesc('occurred_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->string('product_id'));
        }

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->string('warehouse_id'));
        }

        return response()->json($query->paginate(100));
    }

    public function receive(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('inventory.receive'), 403);

        $data = $request->validate([
            'warehouse_id' => ['required', 'string', 'exists:warehouses,id'],
            'product_id' => ['required', 'string', 'exists:products,id'],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lot_code' => ['nullable', 'string', 'max:64'],
            'expires_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'min_qty' => ['nullable', 'numeric', 'min:0'],
        ]);

        $warehouse = Warehouse::query()->findOrFail($data['warehouse_id']);
        $product = Product::query()->findOrFail($data['product_id']);

        $movement = $this->kardex->receive(
            warehouse: $warehouse,
            product: $product,
            quantity: (string) $data['quantity'],
            unitCost: (string) ($data['unit_cost'] ?? $product->default_cost),
            lotCode: $data['lot_code'] ?? null,
            expiresAt: $data['expires_at'] ?? null,
            type: StockMovementType::PurchaseReceipt,
            user: $request->user(),
            notes: $data['notes'] ?? 'Ingreso de mercadería',
        );

        if (isset($data['min_qty'])) {
            $movement->product->stockItems()
                ->where('warehouse_id', $warehouse->id)
                ->update(['min_qty' => $data['min_qty']]);
        }

        return response()->json($movement->load(['product', 'lot', 'warehouse']), 201);
    }

    public function adjust(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('inventory.adjust'), 403);

        $data = $request->validate([
            'warehouse_id' => ['required', 'string', 'exists:warehouses,id'],
            'product_id' => ['required', 'string', 'exists:products,id'],
            'qty_after' => ['required', 'numeric', 'min:0'],
            'reason_code' => ['required', Rule::enum(AdjustmentReason::class)],
            'notes' => ['required', 'string', 'min:3'],
            'lot_id' => ['nullable', 'string', 'exists:lots,id'],
        ]);

        $movement = $this->kardex->adjust(
            warehouse: Warehouse::query()->findOrFail($data['warehouse_id']),
            product: Product::query()->findOrFail($data['product_id']),
            qtyAfter: (string) $data['qty_after'],
            reason: $data['reason_code'],
            user: $request->user(),
            lotId: $data['lot_id'] ?? null,
            notes: $data['notes'],
        );

        return response()->json($movement->load(['product', 'lot', 'warehouse']));
    }

    public function transfer(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('inventory.transfer'), 403);

        $data = $request->validate([
            'from_warehouse_id' => ['required', 'string', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'string', 'exists:warehouses,id', 'different:from_warehouse_id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'string', 'exists:products,id'],
            'items.*.qty_sent' => ['required', 'numeric', 'min:0.0001'],
            'items.*.lot_id' => ['nullable', 'string', 'exists:lots,id'],
        ]);

        try {
            $transfer = StockTransfer::query()->create([
                'company_id' => $request->user()->company_id,
                'from_warehouse_id' => $data['from_warehouse_id'],
                'to_warehouse_id' => $data['to_warehouse_id'],
                'requested_by' => $request->user()->id,
                'status' => TransferStatus::InTransit,
                'notes' => $data['notes'] ?? null,
                'shipped_at' => now(),
            ]);

            foreach ($data['items'] as $item) {
                $transfer->items()->create($item);
            }

            $transfer = $this->kardex->transfer($transfer, $request->user());
        } catch (InsufficientStockException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($transfer->load(['items.product', 'fromWarehouse', 'toWarehouse']), 201);
    }

    public function consumePreview(Request $request, Product $product): JsonResponse
    {
        abort_unless($request->user()->can('inventory.stock.view'), 403);

        $qty = (string) $request->validate(['quantity' => ['required', 'numeric', 'min:0.0001']])['quantity'];
        $lines = app(\App\Domain\Recipes\RecipeExplosionService::class)->explodeForSale($product, $qty);

        return response()->json([
            'product_id' => $product->id,
            'quantity' => $qty,
            'components' => array_map(fn (array $line) => [
                'product_id' => $line['product']->id,
                'name' => $line['product']->name,
                'sku' => $line['product']->sku,
                'quantity' => $line['quantity'],
                'unit' => $line['product']->baseUnit?->symbol,
            ], $lines),
        ]);
    }
}
