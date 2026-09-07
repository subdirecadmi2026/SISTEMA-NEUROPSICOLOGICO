<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Cash\CashService;
use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\CashSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashController extends Controller
{
    public function __construct(private readonly CashService $cash) {}

    public function registers(Request $request): JsonResponse
    {
        $this->allow($request, 'cash.view');

        return response()->json(
            CashRegister::query()
                ->with('openSession.opener')
                ->where('branch_id', $this->branchId($request))
                ->orderBy('code')
                ->get()
        );
    }

    public function current(Request $request): JsonResponse
    {
        $this->allow($request, 'cash.view');
        $session = $this->cash->openSessionForBranch($this->branchId($request));

        return response()->json($session?->load(['register', 'opener', 'movements.user']));
    }

    public function open(Request $request): JsonResponse
    {
        $this->allow($request, 'cash.open');
        $data = $request->validate([
            'cash_register_id' => ['required', 'string', 'exists:cash_registers,id'],
            'opening_amount' => ['required', 'numeric', 'min:0'],
        ]);
        $register = CashRegister::query()->findOrFail($data['cash_register_id']);

        return response()->json($this->cash->open($register, $request->user(), (string) $data['opening_amount']), 201);
    }

    public function move(Request $request, CashSession $session): JsonResponse
    {
        $this->allow($request, 'cash.move');
        $data = $request->validate([
            'type' => ['required', 'in:in,out,drop,expense,tip'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json($this->cash->move(
            $session,
            $request->user(),
            $data['type'],
            (string) $data['amount'],
            'cash',
            $data['notes'] ?? null,
        ), 201);
    }

    public function close(Request $request, CashSession $session): JsonResponse
    {
        $this->allow($request, 'cash.close');
        $data = $request->validate([
            'denominations' => ['required', 'array'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json($this->cash->close($session, $request->user(), $data['denominations'], $data['notes'] ?? null));
    }
}
