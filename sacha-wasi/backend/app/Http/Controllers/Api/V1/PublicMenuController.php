<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Sales\SaleService;
use App\Enums\OrderChannel;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\DiningTable;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicMenuController extends Controller
{
    public function __construct(private readonly SaleService $sales) {}

    public function show(string $qrToken): JsonResponse
    {
        $table = $this->table($qrToken);
        $this->bindCompany($table);

        $categories = Category::query()
            ->where('show_on_qr_menu', true)
            ->where('is_active', true)
            ->with(['products' => fn ($q) => $q->where('is_sellable', true)->where('status', 'active')->orderBy('name')])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'table' => $table->only(['id', 'name', 'code', 'seats']),
            'branch' => $table->branch?->only(['id', 'name', 'city', 'address']),
            'company' => $table->branch?->company?->only(['name', 'trade_name']),
            'categories' => $categories,
        ]);
    }

    public function order(Request $request, string $qrToken): JsonResponse
    {
        $table = $this->table($qrToken);
        $this->bindCompany($table);

        $data = $request->validate([
            'guest_name' => ['nullable', 'string', 'max:120'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'string', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:1'],
            'notes' => ['nullable', 'string'],
        ]);

        $user = $table->branch->users()->first()
            ?? \App\Models\User::query()->where('company_id', $table->company_id)->firstOrFail();

        $order = $this->sales->open([
            'branch_id' => $table->branch_id,
            'dining_table_id' => $table->id,
            'channel' => OrderChannel::QrMenu,
            'guest_name' => $data['guest_name'] ?? 'QR '.$table->code,
            'notes' => $data['notes'] ?? null,
        ], $user);

        foreach ($data['items'] as $item) {
            $product = Product::query()->findOrFail($item['product_id']);
            abort_unless($product->is_sellable, 422, 'Producto no disponible.');
            $order = $this->sales->addItem($order, $item);
        }

        $order = $this->sales->sendToKitchen($order, $user);

        return response()->json($order, 201);
    }

    private function table(string $qrToken): DiningTable
    {
        return DiningTable::query()
            ->withoutGlobalScopes()
            ->with(['branch.company', 'branch.users'])
            ->where('qr_token', $qrToken)
            ->where('is_active', true)
            ->firstOrFail();
    }

    private function bindCompany(DiningTable $table): void
    {
        app()->instance('currentCompanyId', $table->company_id);
        app()->instance('currentBranchId', $table->branch_id);
    }
}
