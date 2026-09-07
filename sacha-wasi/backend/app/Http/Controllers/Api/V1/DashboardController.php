<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\KitchenStation;
use App\Models\Lot;
use App\Models\Product;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\TaxRate;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.view'), 403);

        $lowStock = StockItem::query()
            ->with(['product', 'warehouse'])
            ->whereColumn('qty_on_hand', '<=', 'min_qty')
            ->where('min_qty', '>', 0)
            ->orderBy('qty_on_hand')
            ->limit(8)
            ->get();

        $expiring = Lot::query()
            ->with(['product', 'warehouse'])
            ->where('status', 'available')
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '<=', now()->addDays(7))
            ->orderBy('expires_at')
            ->limit(8)
            ->get();

        return response()->json([
            'kpis' => [
                'products' => Product::query()->count(),
                'sellable_products' => Product::query()->where('is_sellable', true)->where('status', 'active')->count(),
                'categories' => Category::query()->count(),
                'ingredients' => Product::query()->where('type', 'ingredient')->count(),
                'low_stock' => StockItem::query()->whereColumn('qty_on_hand', '<=', 'min_qty')->where('min_qty', '>', 0)->count(),
                'inventory_value' => (float) StockItem::query()->selectRaw('coalesce(sum(qty_on_hand * avg_cost), 0) as value')->value('value'),
                'movements_today' => StockMovement::query()->whereDate('occurred_at', now()->toDateString())->count(),
                'expired_lots' => Lot::query()->whereDate('expires_at', '<', now()->toDateString())->where('qty_on_hand', '>', 0)->count(),
            ],
            'low_stock' => $lowStock,
            'expiring_lots' => $expiring,
            'recent_movements' => StockMovement::query()
                ->with(['product', 'warehouse', 'user'])
                ->orderByDesc('occurred_at')
                ->limit(10)
                ->get(),
        ]);
    }

    public function lookups(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.view'), 403);

        return response()->json([
            'units' => Unit::query()->orderBy('dimension')->orderBy('factor_to_base')->get(),
            'tax_rates' => TaxRate::query()->orderBy('percent')->get(),
            'warehouses' => Warehouse::query()->with('branch')->orderBy('name')->get(),
            'kitchen_stations' => KitchenStation::query()->orderBy('sort_order')->get(),
            'categories' => Category::query()->orderBy('sort_order')->get(['id', 'name', 'parent_id', 'color']),
        ]);
    }
}
