<?php

namespace App\Domain\Inventory;

use App\Domain\Recipes\RecipeExplosionService;
use App\Enums\LotStatus;
use App\Enums\StockMovementType;
use App\Enums\TransferStatus;
use App\Models\Lot;
use App\Models\Product;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KardexService
{
    public function __construct(private readonly RecipeExplosionService $explosion) {}

    public function receive(
        Warehouse $warehouse,
        Product $product,
        string $quantity,
        string $unitCost = '0',
        ?string $lotCode = null,
        ?string $expiresAt = null,
        StockMovementType $type = StockMovementType::PurchaseReceipt,
        ?User $user = null,
        ?string $notes = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): StockMovement {
        return DB::transaction(function () use ($warehouse, $product, $quantity, $unitCost, $lotCode, $expiresAt, $type, $user, $notes, $referenceType, $referenceId) {
            $warehouse = Warehouse::query()->lockForUpdate()->findOrFail($warehouse->id);
            $qty = Decimal::stock($quantity);
            $cost = Decimal::stock($unitCost);

            $lot = null;

            if ($product->tracks_lots) {
                $lot = $this->upsertLot($warehouse, $product, $lotCode ?: 'SIN-LOTE', $qty, $cost, $expiresAt, 'in');
            }

            $stock = $this->lockStockItem($warehouse, $product);
            $newQty = Decimal::add((string) $stock->qty_on_hand, $qty, 4);
            $stock->avg_cost = $this->weightedAverage(
                (string) $stock->qty_on_hand,
                (string) $stock->avg_cost,
                $qty,
                $cost
            );
            $stock->qty_on_hand = $newQty;
            $stock->save();

            return $this->writeMovement(
                warehouse: $warehouse,
                product: $product,
                type: $type,
                quantity: $qty,
                unitCost: $cost,
                balanceAfter: $newQty,
                lot: $lot,
                user: $user,
                notes: $notes,
                referenceType: $referenceType,
                referenceId: $referenceId,
            );
        });
    }

    public function consume(
        Warehouse $warehouse,
        Product $product,
        string $quantity,
        StockMovementType $type = StockMovementType::Sale,
        ?User $user = null,
        ?string $notes = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
        bool $allowNegative = false,
    ): array {
        return DB::transaction(function () use ($warehouse, $product, $quantity, $type, $user, $notes, $referenceType, $referenceId, $allowNegative) {
            $movements = [];
            $remaining = Decimal::stock($quantity);
            $stock = $this->lockStockItem($warehouse, $product);
            $available = (string) $stock->qty_on_hand;

            if (! $allowNegative && Decimal::cmp($available, $remaining, 4) < 0) {
                throw new InsufficientStockException($product->id, $remaining, $available);
            }

            if ($product->tracks_lots) {
                $lots = Lot::query()
                    ->where('warehouse_id', $warehouse->id)
                    ->where('product_id', $product->id)
                    ->where('status', LotStatus::Available)
                    ->where('qty_on_hand', '>', 0)
                    ->where(function ($query) {
                        $query->whereNull('expires_at')->orWhereDate('expires_at', '>=', now()->toDateString());
                    })
                    ->orderByRaw('expires_at is null')
                    ->orderBy('expires_at')
                    ->lockForUpdate()
                    ->get();

                foreach ($lots as $lot) {
                    if (Decimal::cmp($remaining, '0', 4) <= 0) {
                        break;
                    }

                    $take = Decimal::min($remaining, (string) $lot->qty_on_hand);
                    $lot->qty_on_hand = Decimal::sub((string) $lot->qty_on_hand, $take, 4);

                    if (Decimal::isZero((string) $lot->qty_on_hand)) {
                        $lot->status = LotStatus::Depleted;
                    }

                    $lot->save();

                    $stock->qty_on_hand = Decimal::sub((string) $stock->qty_on_hand, $take, 4);
                    $stock->save();

                    $movements[] = $this->writeMovement(
                        warehouse: $warehouse,
                        product: $product,
                        type: $type,
                        quantity: $take,
                        unitCost: (string) $lot->unit_cost,
                        balanceAfter: (string) $stock->qty_on_hand,
                        lot: $lot,
                        user: $user,
                        notes: $notes,
                        referenceType: $referenceType,
                        referenceId: $referenceId,
                    );

                    $remaining = Decimal::sub($remaining, $take, 4);
                }
            }

            if (Decimal::cmp($remaining, '0', 4) > 0) {
                if (! $allowNegative && $product->tracks_lots) {
                    throw new InsufficientStockException($product->id, $quantity, Decimal::sub($quantity, $remaining, 4));
                }

                $stock->qty_on_hand = Decimal::sub((string) $stock->qty_on_hand, $remaining, 4);
                $stock->save();

                $movements[] = $this->writeMovement(
                    warehouse: $warehouse,
                    product: $product,
                    type: $type,
                    quantity: $remaining,
                    unitCost: (string) $stock->avg_cost,
                    balanceAfter: (string) $stock->qty_on_hand,
                    lot: null,
                    user: $user,
                    notes: $notes,
                    referenceType: $referenceType,
                    referenceId: $referenceId,
                );
            }

            return $movements;
        });
    }

    /**
     * Descuenta inventario según receta / combo al vender un producto.
     *
     * @return list<StockMovement>
     */
    public function consumeForSale(
        Warehouse $warehouse,
        Product $product,
        string $quantity,
        ?User $user = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): array {
        $leaves = $this->explosion->explodeForSale($product, $quantity);
        $movements = [];

        foreach ($leaves as $leaf) {
            $movements = array_merge($movements, $this->consume(
                warehouse: $warehouse,
                product: $leaf['product'],
                quantity: $leaf['quantity'],
                type: StockMovementType::RecipeConsumption,
                user: $user,
                notes: "Venta de {$product->name}",
                referenceType: $referenceType,
                referenceId: $referenceId,
            ));
        }

        return $movements;
    }

    /**
     * Devuelve insumos de una venta anulada (misma explosión que consumeForSale).
     *
     * @return list<StockMovement>
     */
    public function restoreForSale(
        Warehouse $warehouse,
        Product $product,
        string $quantity,
        ?User $user = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): array {
        $leaves = $this->explosion->explodeForSale($product, $quantity);
        $movements = [];

        foreach ($leaves as $leaf) {
            $avgCost = (string) (StockItem::query()
                ->where('warehouse_id', $warehouse->id)
                ->where('product_id', $leaf['product']->id)
                ->value('avg_cost') ?: $leaf['product']->default_cost ?: '0');

            $movements[] = $this->receive(
                warehouse: $warehouse,
                product: $leaf['product'],
                quantity: $leaf['quantity'],
                unitCost: $avgCost,
                lotCode: 'DEV-VENTA',
                type: StockMovementType::Return,
                user: $user,
                notes: "Anulación de venta {$product->name}",
                referenceType: $referenceType,
                referenceId: $referenceId,
            );
        }

        return $movements;
    }

    public function transfer(StockTransfer $transfer, ?User $user = null): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $transfer->loadMissing('items.product', 'fromWarehouse', 'toWarehouse');

            foreach ($transfer->items as $item) {
                $this->consume(
                    warehouse: $transfer->fromWarehouse,
                    product: $item->product,
                    quantity: (string) $item->qty_sent,
                    type: StockMovementType::TransferOut,
                    user: $user,
                    notes: 'Traslado saliente',
                    referenceType: $transfer->getMorphClass(),
                    referenceId: $transfer->id,
                );

                $received = (string) ($item->qty_received ?? $item->qty_sent);
                $avgCost = (string) StockItem::query()
                    ->where('warehouse_id', $transfer->from_warehouse_id)
                    ->where('product_id', $item->product_id)
                    ->value('avg_cost') ?: '0';

                $this->receive(
                    warehouse: $transfer->toWarehouse,
                    product: $item->product,
                    quantity: $received,
                    unitCost: $avgCost,
                    lotCode: $item->lot?->lot_code,
                    expiresAt: $item->lot?->expires_at?->toDateString(),
                    type: StockMovementType::TransferIn,
                    user: $user,
                    notes: 'Traslado entrante',
                    referenceType: $transfer->getMorphClass(),
                    referenceId: $transfer->id,
                );
            }

            $transfer->status = TransferStatus::Received;
            $transfer->received_by = $user?->id;
            $transfer->shipped_at ??= now();
            $transfer->received_at = now();
            $transfer->save();

            return $transfer->refresh()->load('items');
        });
    }

    public function adjust(
        Warehouse $warehouse,
        Product $product,
        string $qtyAfter,
        string $reason,
        ?User $user = null,
        ?string $lotId = null,
        ?string $notes = null,
    ): StockMovement {
        return DB::transaction(function () use ($warehouse, $product, $qtyAfter, $reason, $user, $lotId, $notes) {
            $stock = $this->lockStockItem($warehouse, $product);
            $before = (string) $stock->qty_on_hand;
            $after = Decimal::stock($qtyAfter);
            $delta = Decimal::sub($after, $before, 4);

            if (Decimal::isZero($delta)) {
                return $this->writeMovement(
                    warehouse: $warehouse,
                    product: $product,
                    type: StockMovementType::Adjustment,
                    quantity: '0',
                    unitCost: (string) $stock->avg_cost,
                    balanceAfter: $after,
                    lot: $lotId ? Lot::query()->find($lotId) : null,
                    user: $user,
                    notes: $notes ?? $reason,
                );
            }

            if (Decimal::cmp($delta, '0', 4) > 0) {
                return $this->receive(
                    warehouse: $warehouse,
                    product: $product,
                    quantity: $delta,
                    unitCost: (string) $stock->avg_cost,
                    lotCode: $lotId ? Lot::query()->find($lotId)?->lot_code : 'AJUSTE',
                    type: StockMovementType::Adjustment,
                    user: $user,
                    notes: $notes ?? $reason,
                );
            }

            $movements = $this->consume(
                warehouse: $warehouse,
                product: $product,
                quantity: Decimal::sub('0', $delta, 4),
                type: in_array($reason, ['waste', 'spoilage'], true) ? StockMovementType::Waste : StockMovementType::Adjustment,
                user: $user,
                notes: $notes ?? $reason,
                allowNegative: true,
            );

            return $movements[array_key_last($movements)];
        });
    }

    private function upsertLot(
        Warehouse $warehouse,
        Product $product,
        string $lotCode,
        string $qty,
        string $cost,
        ?string $expiresAt,
        string $direction,
    ): Lot {
        $lot = Lot::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->where('lot_code', $lotCode)
            ->lockForUpdate()
            ->first();

        if (! $lot) {
            $lot = new Lot([
                'company_id' => $warehouse->company_id,
                'warehouse_id' => $warehouse->id,
                'product_id' => $product->id,
                'lot_code' => $lotCode,
                'expires_at' => $expiresAt,
                'qty_on_hand' => '0',
                'unit_cost' => $cost,
                'status' => LotStatus::Available,
            ]);
        }

        if ($direction === 'in') {
            $lot->qty_on_hand = Decimal::add((string) $lot->qty_on_hand, $qty, 4);
            $lot->unit_cost = $cost;
            $lot->status = LotStatus::Available;

            if ($expiresAt) {
                $lot->expires_at = $expiresAt;
            }
        }

        $lot->save();

        return $lot;
    }

    private function lockStockItem(Warehouse $warehouse, Product $product): StockItem
    {
        $stock = StockItem::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->lockForUpdate()
            ->first();

        if ($stock) {
            return $stock;
        }

        return StockItem::query()->create([
            'company_id' => $warehouse->company_id,
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'qty_on_hand' => '0',
            'qty_reserved' => '0',
            'avg_cost' => '0',
        ]);
    }

    private function weightedAverage(string $qtyOnHand, string $avgCost, string $incomingQty, string $incomingCost): string
    {
        $totalQty = Decimal::add($qtyOnHand, $incomingQty, 8);

        if (Decimal::cmp($totalQty, '0', 8) <= 0) {
            return Decimal::stock($incomingCost);
        }

        $existing = Decimal::mul($qtyOnHand, $avgCost);
        $incoming = Decimal::mul($incomingQty, $incomingCost);

        return Decimal::stock(Decimal::div(Decimal::add($existing, $incoming), $totalQty));
    }

    private function writeMovement(
        Warehouse $warehouse,
        Product $product,
        StockMovementType $type,
        string $quantity,
        string $unitCost,
        string $balanceAfter,
        ?Lot $lot,
        ?User $user,
        ?string $notes,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): StockMovement {
        $movement = new StockMovement;
        $movement->id = strtolower((string) Str::ulid());
        $movement->company_id = $warehouse->company_id;
        $movement->branch_id = $warehouse->branch_id;
        $movement->warehouse_id = $warehouse->id;
        $movement->product_id = $product->id;
        $movement->lot_id = $lot?->id;
        $movement->unit_id = $product->base_unit_id;
        $movement->user_id = $user?->id;
        $movement->type = $type;
        $movement->direction = $type->direction();
        $movement->quantity = Decimal::stock($quantity);
        $movement->unit_cost = Decimal::stock($unitCost);
        $movement->total_cost = Decimal::stock(Decimal::mul($quantity, $unitCost));
        $movement->balance_after = Decimal::stock($balanceAfter);
        $movement->reference_type = $referenceType;
        $movement->reference_id = $referenceId;
        $movement->notes = $notes;
        $movement->occurred_at = now();
        $movement->save();

        return $movement;
    }
}
