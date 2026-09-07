<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DiningTable;
use App\Models\Expense;
use App\Models\FiscalDocument;
use App\Models\KitchenStation;
use App\Models\Lot;
use App\Models\Order;
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
        abort_unless($request->user()->can('catalog.products.view') || $request->user()->can('reports.view') || $request->user()->can('pos.sell'), 403);

        $branchId = $this->branchId($request);
        $today = now()->toDateString();

        $salesToday = Order::query()
            ->where('branch_id', $branchId)
            ->where('status', 'billed')
            ->whereDate('paid_at', $today);

        $salesTotal = (float) (clone $salesToday)->sum('total');
        $costTotal = (float) (clone $salesToday)->sum('cost_total');
        $tickets = (clone $salesToday)->count();
        $expensesToday = (float) Expense::query()->where('branch_id', $branchId)->whereDate('incurred_on', $today)->sum('amount');

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

        $openCash = CashSession::query()
            ->with('register')
            ->where('branch_id', $branchId)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        return response()->json([
            'kpis' => [
                'products' => Product::query()->count(),
                'sellable_products' => Product::query()->where('is_sellable', true)->where('status', 'active')->count(),
                'categories' => Category::query()->count(),
                'ingredients' => Product::query()->where('type', 'ingredient')->count(),
                'low_stock' => StockItem::query()->whereColumn('qty_on_hand', '<=', 'min_qty')->where('min_qty', '>', 0)->count(),
                'inventory_value' => (float) StockItem::query()->selectRaw('coalesce(sum(qty_on_hand * avg_cost), 0) as value')->value('value'),
                'movements_today' => StockMovement::query()->whereDate('occurred_at', $today)->count(),
                'expired_lots' => Lot::query()->whereDate('expires_at', '<', $today)->where('qty_on_hand', '>', 0)->count(),
                'sales_today' => $salesTotal,
                'tickets_today' => $tickets,
                'avg_ticket' => $tickets > 0 ? round($salesTotal / $tickets, 2) : 0,
                'gross_profit_today' => round($salesTotal - $costTotal, 2),
                'food_cost_percent' => $salesTotal > 0 ? round(($costTotal / $salesTotal) * 100, 2) : 0,
                'kitchen_open' => Order::query()->where('branch_id', $branchId)->whereIn('status', ['in_kitchen', 'ready'])->count(),
                'sri_authorized_today' => FiscalDocument::query()->where('branch_id', $branchId)->where('sri_status', 'authorized')->whereDate('created_at', $today)->count(),
                'sri_pending' => FiscalDocument::query()->where('branch_id', $branchId)->whereIn('sri_status', ['pending', 'contingency'])->count(),
                'cash_system' => $openCash ? (float) $openCash->system_cash : 0,
                'cash_open' => (bool) $openCash,
                'expenses_today' => $expensesToday,
                'net_profit_today' => round($salesTotal - $costTotal - $expensesToday, 2),
            ],
            'low_stock' => $lowStock,
            'expiring_lots' => $expiring,
            'open_orders' => Order::query()
                ->with(['table', 'items'])
                ->where('branch_id', $branchId)
                ->whereNotIn('status', ['billed', 'cancelled'])
                ->latest()
                ->limit(8)
                ->get(),
            'recent_movements' => StockMovement::query()
                ->with(['product', 'warehouse', 'user'])
                ->orderByDesc('occurred_at')
                ->limit(10)
                ->get(),
        ]);
    }

    public function lookups(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.view') || $request->user()->can('pos.sell'), 403);
        $branchId = $this->branchId($request);

        return response()->json([
            'units' => Unit::query()->orderBy('dimension')->orderBy('factor_to_base')->get(),
            'tax_rates' => TaxRate::query()->orderBy('percent')->get(),
            'warehouses' => Warehouse::query()->with('branch')->orderBy('name')->get(),
            'kitchen_stations' => KitchenStation::query()->orderBy('sort_order')->get(),
            'categories' => Category::query()->orderBy('sort_order')->get(['id', 'name', 'parent_id', 'color', 'show_on_pos']),
            'cash_registers' => CashRegister::query()->with('openSession')->where('branch_id', $branchId)->get(),
            'tables' => DiningTable::query()->where('branch_id', $branchId)->orderBy('code')->get(),
            'customers' => Customer::query()->where('is_active', true)->orderBy('name')->limit(100)->get(['id', 'name', 'phone', 'points', 'document_number']),
        ]);
    }
}
