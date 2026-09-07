<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\FiscalDocument;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->allow($request, 'reports.view');
        $from = $request->date('from')?->startOfDay() ?? now()->startOfDay();
        $to = $request->date('to')?->endOfDay() ?? now()->endOfDay();
        $branchId = $this->branchId($request);

        $sales = Order::query()
            ->where('branch_id', $branchId)
            ->where('status', 'billed')
            ->whereBetween('paid_at', [$from, $to]);

        $salesTotal = (float) (clone $sales)->sum('total');
        $costTotal = (float) (clone $sales)->sum('cost_total');
        $tickets = (clone $sales)->count();
        $expenses = (float) Expense::query()
            ->where('branch_id', $branchId)
            ->whereDate('incurred_on', '>=', $from->toDateString())
            ->whereDate('incurred_on', '<=', $to->toDateString())
            ->sum('amount');

        $byChannel = Order::query()
            ->select('channel', DB::raw('count(*) as tickets'), DB::raw('sum(total) as total'))
            ->where('branch_id', $branchId)
            ->where('status', 'billed')
            ->whereBetween('paid_at', [$from, $to])
            ->groupBy('channel')
            ->get();

        $byProduct = OrderItem::query()
            ->select('name', DB::raw('sum(quantity) as qty'), DB::raw('sum(line_total) as total'), DB::raw('sum(line_cost) as cost'))
            ->whereHas('order', function ($q) use ($branchId, $from, $to) {
                $q->where('branch_id', $branchId)->where('status', 'billed')->whereBetween('paid_at', [$from, $to]);
            })
            ->groupBy('name')
            ->orderByDesc('total')
            ->limit(20)
            ->get();

        $inventoryValue = (float) StockItem::query()->selectRaw('coalesce(sum(qty_on_hand * avg_cost), 0) as v')->value('v');

        $sri = FiscalDocument::query()
            ->select('sri_status', DB::raw('count(*) as total'))
            ->where('branch_id', $branchId)
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('sri_status')
            ->get();

        return response()->json([
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'sales_total' => $salesTotal,
            'cost_total' => $costTotal,
            'gross_profit' => $salesTotal - $costTotal,
            'expenses' => $expenses,
            'net_profit' => $salesTotal - $costTotal - $expenses,
            'tickets' => $tickets,
            'avg_ticket' => $tickets > 0 ? round($salesTotal / $tickets, 2) : 0,
            'food_cost_percent' => $salesTotal > 0 ? round(($costTotal / $salesTotal) * 100, 2) : 0,
            'inventory_value' => $inventoryValue,
            'by_channel' => $byChannel,
            'by_product' => $byProduct,
            'sri' => $sri,
        ]);
    }
}
