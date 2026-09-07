<?php

namespace App\Domain\Sales;

use App\Domain\Audit\AuditLogger;
use App\Domain\Cash\CashService;
use App\Domain\Fiscal\FiscalService;
use App\Domain\Inventory\KardexService;
use App\Domain\Recipes\RecipeCostingService;
use App\Enums\DocumentType;
use App\Enums\KitchenStatus;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\TableStatus;
use App\Models\Branch;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\DiningTable;
use App\Models\GiftCard;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaleService
{
    public function __construct(
        private readonly KardexService $kardex,
        private readonly RecipeCostingService $costing,
        private readonly CashService $cash,
        private readonly FiscalService $fiscal,
        private readonly AuditLogger $audit,
    ) {}

    public function open(array $data, User $user): Order
    {
        if (! empty($data['client_ulid'])) {
            $existing = Order::query()
                ->where('company_id', $user->company_id)
                ->where('client_ulid', $data['client_ulid'])
                ->first();
            if ($existing) {
                return $this->fresh($existing);
            }
        }

        $branch = Branch::query()->findOrFail($data['branch_id'] ?? $user->current_branch_id);
        $warehouse = $this->defaultWarehouse($branch, $data['warehouse_id'] ?? null);

        $order = Order::query()->create([
            'company_id' => $user->company_id,
            'branch_id' => $branch->id,
            'warehouse_id' => $warehouse->id,
            'dining_table_id' => $data['dining_table_id'] ?? null,
            'customer_id' => $data['customer_id'] ?? null,
            'user_id' => $user->id,
            'rider_id' => $data['rider_id'] ?? null,
            'delivery_zone_id' => $data['delivery_zone_id'] ?? null,
            'number' => $this->nextNumber($user->company_id, $branch),
            'client_ulid' => $data['client_ulid'] ?? null,
            'channel' => $data['channel'] ?? OrderChannel::Salon,
            'status' => OrderStatus::Open,
            'guest_name' => $data['guest_name'] ?? null,
            'covers' => $data['covers'] ?? 1,
            'notes' => $data['notes'] ?? null,
            'delivery_address' => $data['delivery_address'] ?? null,
            'delivery_fee' => $data['delivery_fee'] ?? 0,
            'delivery_status' => isset($data['delivery_zone_id']) || isset($data['delivery_address']) ? 'queued' : null,
        ]);

        if ($order->dining_table_id) {
            DiningTable::query()->whereKey($order->dining_table_id)->update(['status' => TableStatus::Occupied]);
        }

        $this->audit->record('order.open', $order, $user);

        return $this->fresh($order);
    }

    public function addItem(Order $order, array $payload): Order
    {
        $this->assertOpen($order);
        $product = Product::query()->with(['taxRate', 'kitchenStation', 'activeRecipe'])->findOrFail($payload['product_id']);
        $qty = Decimal::of((string) ($payload['quantity'] ?? '1'));
        $unitPrice = Decimal::round((string) ($payload['unit_price'] ?? $product->default_price), 2);
        $discount = Decimal::round((string) ($payload['discount_amount'] ?? '0'), 2);
        $taxRate = Decimal::of((string) ($payload['tax_rate'] ?? $product->taxRate?->percent ?? '0'));
        $gross = Decimal::sub(Decimal::mul($qty, $unitPrice, 2), $discount, 2);
        if (Decimal::isNegative($gross)) {
            $gross = '0.00';
        }
        [$net, $tax] = $this->splitTax($gross, $taxRate);
        $unitCost = $this->costing->unitCost($product);
        $lineCost = Decimal::stock(Decimal::mul($qty, $unitCost));

        $order->items()->create([
            'product_id' => $product->id,
            'kitchen_station_id' => $product->kitchen_station_id,
            'name' => $product->name,
            'quantity' => Decimal::stock($qty),
            'unit_price' => $unitPrice,
            'discount_amount' => $discount,
            'tax_rate' => $taxRate,
            'tax_amount' => $tax,
            'line_total' => $gross,
            'unit_cost' => $unitCost,
            'line_cost' => $lineCost,
            'kitchen_status' => KitchenStatus::Pending,
            'notes' => $payload['notes'] ?? null,
            'modifiers' => $payload['modifiers'] ?? null,
        ]);

        $this->recalculate($order);

        return $this->fresh($order);
    }

    public function removeItem(Order $order, OrderItem $item): Order
    {
        $this->assertOpen($order);
        if ($order->inventory_committed) {
            throw new OrderNotPayableException('No se puede quitar un ítem después de enviarlo a cocina. Anule el pedido.');
        }
        $item->delete();
        $this->recalculate($order);

        return $this->fresh($order);
    }

    public function sendToKitchen(Order $order, User $user): Order
    {
        $this->assertOpen($order);

        return DB::transaction(function () use ($order, $user) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            $order->loadMissing(['items.product', 'warehouse']);

            if ($order->items->isEmpty()) {
                throw new OrderNotPayableException('El pedido no tiene productos.');
            }

            if (! $order->inventory_committed) {
                foreach ($order->items as $item) {
                    $this->kardex->consumeForSale(
                        warehouse: $order->warehouse,
                        product: $item->product,
                        quantity: (string) $item->quantity,
                        user: $user,
                        referenceType: $order->getMorphClass(),
                        referenceId: $order->id,
                    );
                    $item->kitchen_status = KitchenStatus::Pending;
                    $item->fired_at = now();
                    $item->save();
                }
                $order->inventory_committed = true;
            }

            $order->status = OrderStatus::InKitchen;
            $order->sent_to_kitchen_at = now();
            $order->save();

            if ($order->dining_table_id) {
                DiningTable::query()->whereKey($order->dining_table_id)->update(['status' => TableStatus::WaitingFood]);
            }

            $this->audit->record('order.kitchen', $order, $user);

            return $this->fresh($order);
        });
    }

    /**
     * @param  list<array{method: string, amount: float|string, reference?: string|null}>  $payments
     */
    public function pay(
        Order $order,
        array $payments,
        User $user,
        DocumentType $documentType = DocumentType::Invoice,
        ?string $couponCode = null,
        string $tipAmount = '0',
    ): Order {
        return DB::transaction(function () use ($order, $payments, $user, $documentType, $couponCode, $tipAmount) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            $this->assertPayable($order);

            $session = $this->cash->openSessionForBranch($order->branch_id);
            if (! $session) {
                throw new OpenCashSessionRequiredException;
            }

            $order->cash_session_id = $session->id;
            $order->tip_amount = Decimal::round($tipAmount, 2);

            if ($couponCode) {
                $this->applyCoupon($order, $couponCode);
            }

            $this->recalculate($order);
            $order->refresh();

            $paid = '0';
            foreach ($payments as $row) {
                $method = PaymentMethod::from($row['method']);
                $amount = Decimal::round((string) $row['amount'], 2);
                if ($method === PaymentMethod::GiftCard && ! empty($row['reference'])) {
                    $this->redeemGiftCard($row['reference'], $amount);
                }

                Payment::query()->create([
                    'company_id' => $order->company_id,
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                    'method' => $method,
                    'amount' => $amount,
                    'reference' => $row['reference'] ?? null,
                ]);

                if ($method === PaymentMethod::Cash) {
                    $this->cash->move(
                        session: $session,
                        user: $user,
                        type: 'sale',
                        amount: $amount,
                        method: 'cash',
                        notes: "Venta {$order->number}",
                        referenceType: $order->getMorphClass(),
                        referenceId: $order->id,
                    );
                }

                $paid = Decimal::add($paid, $amount, 2);
            }

            if (Decimal::cmp($paid, (string) $order->total, 2) < 0) {
                throw new OrderNotPayableException('El pago no cubre el total del pedido.');
            }

            if (! $order->inventory_committed) {
                $this->sendToKitchen($order, $user);
                $order->refresh();
            }

            $this->fiscal->issueFromOrder($order, $user, $documentType);
            $this->awardLoyalty($order);
            $this->recalculate($order);

            $order->status = OrderStatus::Billed;
            $order->paid_at = now();
            if ($order->channel === OrderChannel::Delivery) {
                $order->delivery_status = $order->delivery_status ?: 'assigned';
            }
            $order->save();

            if ($order->dining_table_id) {
                DiningTable::query()->whereKey($order->dining_table_id)->update(['status' => TableStatus::Free]);
            }

            $this->audit->record('order.pay', $order, $user, new: ['total' => $order->total]);

            return $this->fresh($order);
        });
    }

    public function quickSale(array $data, User $user): Order
    {
        if (! empty($data['client_ulid'])) {
            $existing = Order::query()
                ->where('company_id', $user->company_id)
                ->where('client_ulid', $data['client_ulid'])
                ->first();
            if ($existing) {
                return $this->fresh($existing);
            }
        }

        return DB::transaction(function () use ($data, $user) {
            $items = $data['items'] ?? [];
            $payments = $data['payments'] ?? [];
            unset($data['items'], $data['payments']);

            $order = $this->open($data, $user);
            foreach ($items as $item) {
                $order = $this->addItem($order, $item);
            }

            $type = DocumentType::from($data['document_type'] ?? DocumentType::Invoice->value);

            return $this->pay(
                order: $order,
                payments: $payments,
                user: $user,
                documentType: $type,
                couponCode: $data['coupon_code'] ?? null,
                tipAmount: (string) ($data['tip_amount'] ?? '0'),
            );
        });
    }

    public function void(Order $order, string $reason, User $user): Order
    {
        return DB::transaction(function () use ($order, $reason, $user) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            $order->loadMissing(['items.product', 'warehouse', 'fiscalDocuments', 'payments', 'cashSession']);

            if ($order->status === OrderStatus::Cancelled) {
                return $this->fresh($order);
            }

            if ($order->inventory_committed && $order->warehouse) {
                foreach ($order->items as $item) {
                    $this->kardex->restoreForSale(
                        warehouse: $order->warehouse,
                        product: $item->product,
                        quantity: (string) $item->quantity,
                        user: $user,
                        referenceType: $order->getMorphClass(),
                        referenceId: $order->id,
                    );
                }
            }

            foreach ($order->fiscalDocuments as $document) {
                if ($document->sri_status->value !== 'voided') {
                    $this->fiscal->void($document, $user, $reason);
                }
            }

            if ($order->cash_session_id) {
                $cashPaid = $order->payments->where('method', PaymentMethod::Cash)->sum(fn ($p) => (float) $p->amount);
                if ($cashPaid > 0 && $order->cashSession?->isOpen()) {
                    $this->cash->move(
                        session: $order->cashSession,
                        user: $user,
                        type: 'void',
                        amount: number_format($cashPaid, 2, '.', ''),
                        method: 'cash',
                        notes: "Anulación {$order->number}: {$reason}",
                        referenceType: $order->getMorphClass(),
                        referenceId: $order->id,
                    );
                }
            }

            $order->status = OrderStatus::Cancelled;
            $order->cancelled_at = now();
            $order->cancel_reason = $reason;
            $order->save();

            if ($order->dining_table_id) {
                DiningTable::query()->whereKey($order->dining_table_id)->update(['status' => TableStatus::Free]);
            }

            $this->audit->record('order.void', $order, $user, new: ['reason' => $reason]);

            return $this->fresh($order);
        });
    }

    public function advanceKitchenItem(OrderItem $item, KitchenStatus $status): Order
    {
        $item->kitchen_status = $status;
        if ($status === KitchenStatus::Ready) {
            $item->ready_at = now();
        }
        $item->save();

        $order = $item->order()->firstOrFail();
        $statuses = $order->items()->pluck('kitchen_status')->map(fn ($s) => $s instanceof KitchenStatus ? $s->value : $s);

        if ($statuses->every(fn ($s) => in_array($s, ['ready', 'delivered'], true))) {
            $order->status = OrderStatus::Ready;
            $order->save();
        }

        if ($statuses->every(fn ($s) => $s === 'delivered')) {
            $order->status = OrderStatus::Delivered;
            $order->save();
        }

        return $this->fresh($order);
    }

    public function assignDelivery(Order $order, ?string $riderId, ?string $status = null): Order
    {
        $order->rider_id = $riderId;
        $order->delivery_status = $status ?? 'assigned';
        $order->save();

        return $this->fresh($order);
    }

    public function recalculate(Order $order): void
    {
        $order->loadMissing('items');
        $subtotal = '0';
        $tax = '0';
        $gross = '0';
        $cost = '0';

        foreach ($order->items as $item) {
            $subtotal = Decimal::add($subtotal, Decimal::sub((string) $item->line_total, (string) $item->tax_amount, 2), 2);
            $tax = Decimal::add($tax, (string) $item->tax_amount, 2);
            $gross = Decimal::add($gross, (string) $item->line_total, 2);
            $cost = Decimal::add($cost, (string) $item->line_cost, 4);
        }

        $gross = Decimal::sub($gross, (string) $order->discount_amount, 2);
        if (Decimal::isNegative($gross)) {
            $gross = '0.00';
        }
        $gross = Decimal::add($gross, Decimal::add((string) $order->tip_amount, (string) $order->delivery_fee, 2), 2);

        $order->subtotal = Decimal::round($subtotal, 2);
        $order->tax_amount = Decimal::round($tax, 2);
        $order->total = Decimal::round($gross, 2);
        $order->cost_total = Decimal::stock($cost);
        $order->save();
    }

    public function fresh(Order $order): Order
    {
        return $order->fresh([
            'items.product',
            'items.kitchenStation',
            'payments',
            'customer',
            'table',
            'user',
            'rider',
            'deliveryZone',
            'latestFiscalDocument',
            'fiscalDocuments',
            'cashSession.register',
        ]);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitTax(string $grossInclusive, string $rate): array
    {
        if (Decimal::cmp($rate, '0') <= 0) {
            return [Decimal::round($grossInclusive, 2), '0.00'];
        }

        $divisor = Decimal::add('100', $rate);
        $net = Decimal::div(Decimal::mul($grossInclusive, '100'), $divisor, 2);
        $tax = Decimal::sub($grossInclusive, $net, 2);

        return [$net, $tax];
    }

    private function applyCoupon(Order $order, string $code): void
    {
        $coupon = Coupon::query()
            ->where('code', strtoupper(trim($code)))
            ->where('is_active', true)
            ->first();

        if (! $coupon) {
            throw new OrderNotPayableException('Cupón no válido.');
        }

        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            throw new OrderNotPayableException('El cupón aún no está vigente.');
        }
        if ($coupon->ends_at && $coupon->ends_at->isPast()) {
            throw new OrderNotPayableException('El cupón expiró.');
        }
        if ($coupon->max_redemptions !== null && $coupon->redeemed >= $coupon->max_redemptions) {
            throw new OrderNotPayableException('El cupón ya se agotó.');
        }

        $gross = $order->items->sum(fn ($item) => (float) $item->line_total);
        if ($coupon->min_ticket && $gross < (float) $coupon->min_ticket) {
            throw new OrderNotPayableException('El ticket no alcanza el mínimo del cupón.');
        }

        $discount = $coupon->type === 'percent'
            ? Decimal::mul((string) $gross, Decimal::div((string) $coupon->value, '100', 4), 2)
            : Decimal::round((string) $coupon->value, 2);

        $order->discount_amount = $discount;
        $order->save();
        $coupon->increment('redeemed');
    }

    private function redeemGiftCard(string $code, string $amount): void
    {
        $card = GiftCard::query()->where('code', strtoupper(trim($code)))->where('status', 'active')->lockForUpdate()->first();
        if (! $card) {
            throw new OrderNotPayableException('Tarjeta de regalo no encontrada.');
        }
        if (Decimal::cmp((string) $card->balance, $amount, 2) < 0) {
            throw new OrderNotPayableException('Saldo insuficiente en la tarjeta de regalo.');
        }
        $card->balance = Decimal::sub((string) $card->balance, $amount, 2);
        if (Decimal::isZero((string) $card->balance)) {
            $card->status = 'depleted';
        }
        $card->save();
    }

    private function awardLoyalty(Order $order): void
    {
        if (! $order->customer_id) {
            return;
        }

        $points = (int) floor((float) $order->total);
        if ($points <= 0) {
            return;
        }

        LoyaltyTransaction::query()->create([
            'company_id' => $order->company_id,
            'customer_id' => $order->customer_id,
            'order_id' => $order->id,
            'points' => $points,
            'reason' => 'compra',
        ]);

        $customer = Customer::query()->find($order->customer_id);
        if ($customer) {
            $customer->points += $points;
            $customer->lifetime_spend = Decimal::add((string) $customer->lifetime_spend, (string) $order->total, 2);
            $customer->last_visit_at = now();
            if ($customer->lifetime_spend >= 100) {
                $customer->segment = 'frecuente';
            }
            $customer->save();
        }
    }

    private function defaultWarehouse(Branch $branch, ?string $warehouseId): Warehouse
    {
        if ($warehouseId) {
            return Warehouse::query()->findOrFail($warehouseId);
        }

        $warehouse = $branch->defaultWarehouse();
        if (! $warehouse) {
            throw new OrderNotPayableException('La sucursal no tiene bodega por defecto.');
        }

        return $warehouse;
    }

    private function nextNumber(string $companyId, Branch $branch): string
    {
        $count = Order::query()->where('company_id', $companyId)->whereDate('created_at', now()->toDateString())->count() + 1;

        return $branch->code.'-'.now()->format('ymd').'-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    private function assertOpen(Order $order): void
    {
        if (! $order->isOpen()) {
            throw new OrderNotPayableException('El pedido ya no admite cambios.');
        }
    }

    private function assertPayable(Order $order): void
    {
        if (in_array($order->status, [OrderStatus::Billed, OrderStatus::Cancelled], true)) {
            throw new OrderNotPayableException('El pedido ya está cerrado.');
        }
        if ($order->items()->count() === 0) {
            throw new OrderNotPayableException('El pedido no tiene productos.');
        }
    }
}
