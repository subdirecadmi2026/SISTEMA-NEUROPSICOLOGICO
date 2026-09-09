<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\TableStatus;
use App\Http\Controllers\Controller;
use App\Models\DiningTable;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'reservations.view');

        return response()->json(
            Reservation::query()
                ->with(['table', 'customer'])
                ->where('branch_id', $this->branchId($request))
                ->orderBy('reserved_at')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($request, 'reservations.manage');
        $data = $request->validate([
            'dining_table_id' => ['nullable', 'string', 'exists:dining_tables,id'],
            'customer_id' => ['nullable', 'string', 'exists:customers,id'],
            'guest_name' => ['required', 'string', 'max:160'],
            'guest_phone' => ['nullable', 'string', 'max:32'],
            'party_size' => ['required', 'integer', 'min:1'],
            'reserved_at' => ['required', 'date'],
            'channel' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
        $data['company_id'] = $this->companyId($request);
        $data['branch_id'] = $this->branchId($request);
        $data['status'] = 'confirmed';
        $reservation = Reservation::query()->create($data);

        if (! empty($data['dining_table_id'])) {
            DiningTable::query()->whereKey($data['dining_table_id'])->update(['status' => TableStatus::Reserved]);
        }

        return response()->json($reservation->load(['table', 'customer']), 201);
    }

    public function update(Request $request, Reservation $reservation): JsonResponse
    {
        $this->allow($request, 'reservations.manage');
        $data = $request->validate([
            'status' => ['required', 'in:confirmed,seated,cancelled,no_show,completed'],
        ]);
        $reservation->update($data);
        if (in_array($data['status'], ['cancelled', 'completed', 'no_show'], true) && $reservation->dining_table_id) {
            DiningTable::query()->whereKey($reservation->dining_table_id)->update(['status' => TableStatus::Free]);
        }

        return response()->json($reservation->fresh(['table', 'customer']));
    }
}
