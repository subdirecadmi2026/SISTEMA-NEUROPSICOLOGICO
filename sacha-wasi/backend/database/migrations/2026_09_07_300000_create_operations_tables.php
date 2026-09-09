<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('trade_name')->nullable();
            $table->string('ruc', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->decimal('lead_time_days', 6, 1)->nullable();
            $table->decimal('quality_score', 5, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'name']);
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('document_type', 16)->default('cedula');
            $table->string('document_number', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('address')->nullable();
            $table->date('birthday')->nullable();
            $table->json('allergies')->nullable();
            $table->json('preferences')->nullable();
            $table->string('segment', 24)->default('nuevo');
            $table->unsignedInteger('points')->default(0);
            $table->decimal('lifetime_spend', 12, 2)->default(0);
            $table->timestamp('last_visit_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['company_id', 'document_number']);
            $table->index(['company_id', 'phone']);
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('warehouse_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('number', 32);
            $table->string('status', 24)->default('draft');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('payment_status', 24)->default('pending');
            $table->date('expected_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'number']);
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity_ordered', 14, 4);
            $table->decimal('quantity_received', 14, 4)->default(0);
            $table->decimal('unit_cost', 14, 4);
            $table->string('lot_code', 64)->nullable();
            $table->date('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('dining_areas', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('dining_tables', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('dining_area_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 32);
            $table->string('qr_token', 64)->unique();
            $table->unsignedTinyInteger('seats')->default(4);
            $table->unsignedSmallInteger('pos_x')->default(40);
            $table->unsignedSmallInteger('pos_y')->default(40);
            $table->string('status', 24)->default('free');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['branch_id', 'code']);
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('dining_table_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guest_name');
            $table->string('guest_phone', 32)->nullable();
            $table->unsignedTinyInteger('party_size')->default(2);
            $table->dateTime('reserved_at');
            $table->string('status', 24)->default('confirmed');
            $table->string('channel', 24)->default('phone');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'reserved_at']);
        });

        Schema::create('cash_registers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 16);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['branch_id', 'code']);
        });

        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('cash_register_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 16)->default('open');
            $table->decimal('opening_amount', 12, 2)->default(0);
            $table->decimal('system_cash', 12, 2)->default(0);
            $table->decimal('counted_cash', 12, 2)->nullable();
            $table->decimal('difference', 12, 2)->nullable();
            $table->json('denomination_count')->nullable();
            $table->text('close_notes')->nullable();
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->index(['cash_register_id', 'status']);
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('cash_session_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 24);
            $table->string('method', 24)->default('cash');
            $table->decimal('amount', 12, 2);
            $table->string('reference_type')->nullable();
            $table->ulid('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('riders', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone', 32)->nullable();
            $table->string('vehicle', 32)->nullable();
            $table->boolean('is_available')->default(true);
            $table->timestamps();
        });

        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('fee', 12, 2)->default(0);
            $table->unsignedSmallInteger('eta_minutes')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('warehouse_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('dining_table_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('cash_session_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('rider_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('delivery_zone_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number', 32);
            $table->string('client_ulid', 26)->nullable();
            $table->string('channel', 24)->default('salon');
            $table->string('status', 24)->default('open');
            $table->string('guest_name')->nullable();
            $table->unsignedTinyInteger('covers')->default(1);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('tip_amount', 12, 2)->default(0);
            $table->decimal('delivery_fee', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->decimal('cost_total', 14, 4)->default(0);
            $table->boolean('inventory_committed')->default(false);
            $table->text('notes')->nullable();
            $table->string('delivery_address')->nullable();
            $table->string('delivery_status', 24)->nullable();
            $table->timestamp('sent_to_kitchen_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'number']);
            $table->unique(['company_id', 'client_ulid']);
            $table->index(['branch_id', 'status', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('order_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('kitchen_station_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->decimal('quantity', 14, 4)->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('line_total', 12, 2);
            $table->decimal('unit_cost', 14, 4)->default(0);
            $table->decimal('line_cost', 14, 4)->default(0);
            $table->string('kitchen_status', 24)->default('pending');
            $table->text('notes')->nullable();
            $table->json('modifiers')->nullable();
            $table->timestamp('fired_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('order_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('method', 24);
            $table->decimal('amount', 12, 2);
            $table->string('reference')->nullable();
            $table->timestamps();
        });

        Schema::create('fiscal_sequences', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 24);
            $table->string('establishment_code', 3)->default('001');
            $table->string('emission_point', 3)->default('001');
            $table->unsignedInteger('next_number')->default(1);
            $table->timestamps();
            $table->unique(['branch_id', 'document_type']);
        });

        Schema::create('fiscal_documents', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type', 24);
            $table->string('establishment_code', 3);
            $table->string('emission_point', 3);
            $table->string('sequential', 9);
            $table->string('access_key', 49)->nullable();
            $table->string('sri_status', 24)->default('pending');
            $table->string('sri_authorization')->nullable();
            $table->timestamp('sri_authorized_at')->nullable();
            $table->text('sri_message')->nullable();
            $table->boolean('is_contingency')->default(false);
            $table->string('customer_name')->nullable();
            $table->string('customer_document', 20)->nullable();
            $table->string('customer_email')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->longText('xml_payload')->nullable();
            $table->json('payload')->nullable();
            $table->string('void_reason')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'document_type', 'sequential']);
            $table->index(['sri_status', 'created_at']);
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->string('type', 16)->default('percent');
            $table->decimal('value', 12, 2);
            $table->decimal('min_ticket', 12, 2)->nullable();
            $table->unsignedInteger('max_redemptions')->nullable();
            $table->unsignedInteger('redeemed')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('gift_cards', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('code', 32);
            $table->decimal('balance', 12, 2);
            $table->string('status', 16)->default('active');
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('order_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('points');
            $table->string('reason', 64);
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 32);
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->date('incurred_on');
            $table->string('vendor')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'incurred_on']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 64);
            $table->string('auditable_type')->nullable();
            $table->ulid('auditable_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['company_id', 'created_at']);
            $table->index(['auditable_type', 'auditable_id']);
        });
    }

    public function down(): void
    {
        $tables = [
            'audit_logs', 'expenses', 'loyalty_transactions', 'gift_cards', 'coupons',
            'fiscal_documents', 'fiscal_sequences', 'payments', 'order_items', 'orders',
            'delivery_zones', 'riders', 'cash_movements', 'cash_sessions', 'cash_registers',
            'reservations', 'dining_tables', 'dining_areas', 'purchase_order_items',
            'purchase_orders', 'customers', 'suppliers',
        ];
        foreach ($tables as $table) {
            Schema::dropIfExists($table);
        }
    }
};
