<?php

namespace App\Domain\Cash;

use App\Domain\Audit\AuditLogger;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CashService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function open(CashRegister $register, User $user, string $openingAmount = '0'): CashSession
    {
        if ($register->openSession) {
            throw new InvalidArgumentException('Esta caja ya tiene una sesión abierta.');
        }

        $session = CashSession::query()->create([
            'company_id' => $register->company_id,
            'branch_id' => $register->branch_id,
            'cash_register_id' => $register->id,
            'opened_by' => $user->id,
            'status' => 'open',
            'opening_amount' => Decimal::round($openingAmount, 2),
            'system_cash' => Decimal::round($openingAmount, 2),
            'opened_at' => now(),
        ]);

        $this->audit->record('cash.open', $session, $user, new: [
            'register' => $register->code,
            'opening_amount' => $openingAmount,
        ]);

        return $session->load(['register', 'opener', 'movements']);
    }

    public function move(
        CashSession $session,
        User $user,
        string $type,
        string $amount,
        string $method = 'cash',
        ?string $notes = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): CashMovement {
        if (! $session->isOpen()) {
            throw new InvalidArgumentException('La sesión de caja está cerrada.');
        }

        $movement = CashMovement::query()->create([
            'company_id' => $session->company_id,
            'cash_session_id' => $session->id,
            'user_id' => $user->id,
            'type' => $type,
            'method' => $method,
            'amount' => Decimal::round($amount, 2),
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
            'occurred_at' => now(),
        ]);

        $session->system_cash = $this->computeSystemCash($session->fresh('movements'));
        $session->save();

        return $movement;
    }

    public function close(CashSession $session, User $user, array $denominations, ?string $notes = null): CashSession
    {
        return DB::transaction(function () use ($session, $user, $denominations, $notes) {
            /** @var CashSession $session */
            $session = CashSession::query()->lockForUpdate()->findOrFail($session->id);

            if (! $session->isOpen()) {
                throw new InvalidArgumentException('La sesión ya está cerrada.');
            }

            $counted = '0';
            foreach ($denominations as $value => $qty) {
                $counted = Decimal::add($counted, Decimal::mul((string) $value, (string) $qty), 2);
            }

            $system = $this->computeSystemCash($session);
            $session->system_cash = $system;
            $session->counted_cash = Decimal::round($counted, 2);
            $session->difference = Decimal::round(Decimal::sub($counted, $system, 2), 2);
            $session->denomination_count = $denominations;
            $session->close_notes = $notes;
            $session->closed_by = $user->id;
            $session->closed_at = now();
            $session->status = 'closed';
            $session->save();

            $this->audit->record('cash.close', $session, $user, new: [
                'system_cash' => $session->system_cash,
                'counted_cash' => $session->counted_cash,
                'difference' => $session->difference,
            ]);

            return $session->fresh(['register', 'opener', 'closer', 'movements']);
        });
    }

    public function computeSystemCash(CashSession $session): string
    {
        $cash = Decimal::round((string) $session->opening_amount, 2);

        foreach ($session->movements as $movement) {
            if ($movement->method !== 'cash') {
                continue;
            }

            $amount = Decimal::round((string) $movement->amount, 2);
            $cash = match ($movement->type) {
                'sale', 'in', 'tip' => Decimal::add($cash, $amount, 2),
                'out', 'drop', 'expense', 'void' => Decimal::sub($cash, $amount, 2),
                default => $cash,
            };
        }

        return $cash;
    }

    public function openSessionForBranch(string $branchId): ?CashSession
    {
        return CashSession::query()
            ->where('branch_id', $branchId)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();
    }
}
