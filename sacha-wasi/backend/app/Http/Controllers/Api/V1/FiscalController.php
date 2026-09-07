<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Fiscal\FiscalService;
use App\Http\Controllers\Controller;
use App\Models\FiscalDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FiscalController extends Controller
{
    public function __construct(private readonly FiscalService $fiscal) {}

    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'fiscal.view');

        $query = FiscalDocument::query()
            ->with(['order', 'customer', 'issuer'])
            ->where('branch_id', $this->branchId($request))
            ->orderByDesc('created_at');

        if ($request->filled('sri_status')) {
            $query->where('sri_status', $request->string('sri_status'));
        }

        return response()->json($query->paginate(50));
    }

    public function show(Request $request, FiscalDocument $fiscalDocument): JsonResponse
    {
        $this->allow($request, 'fiscal.view');

        return response()->json($fiscalDocument->load(['order.items', 'order.payments', 'customer', 'issuer']));
    }

    public function retry(Request $request, FiscalDocument $fiscalDocument): JsonResponse
    {
        $this->allow($request, 'fiscal.retry');

        return response()->json($this->fiscal->retry($fiscalDocument, $request->user()));
    }
}
