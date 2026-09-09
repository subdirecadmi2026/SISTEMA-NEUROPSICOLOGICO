<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('qty_on_hand', 14, 4)->default(0);
            $table->decimal('qty_reserved', 14, 4)->default(0);
            $table->decimal('min_qty', 14, 4)->default(0);
            $table->decimal('max_qty', 14, 4)->nullable();
            $table->decimal('reorder_qty', 14, 4)->nullable();
            $table->decimal('avg_cost', 14, 4)->default(0);
            $table->timestamps();

            $table->unique(['warehouse_id', 'product_id']);
            $table->index(['company_id', 'product_id']);
        });

        Schema::create('lots', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->string('lot_code', 64);
            $table->date('expires_at')->nullable();
            $table->date('manufactured_at')->nullable();
            $table->decimal('qty_on_hand', 14, 4)->default(0);
            $table->decimal('unit_cost', 14, 4)->default(0);
            $table->string('status', 32)->default('available');
            $table->timestamps();

            $table->unique(['warehouse_id', 'product_id', 'lot_code']);
            $table->index(['product_id', 'expires_at', 'status']);
            $table->index(['warehouse_id', 'status', 'expires_at']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('warehouse_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('unit_id')->constrained('units')->restrictOnDelete();
            $table->foreignUlid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 32);
            $table->string('direction', 8);
            $table->decimal('quantity', 14, 4);
            $table->decimal('unit_cost', 14, 4)->default(0);
            $table->decimal('total_cost', 14, 4)->default(0);
            $table->decimal('balance_after', 14, 4)->default(0);
            $table->string('reference_type')->nullable();
            $table->ulid('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['warehouse_id', 'product_id', 'occurred_at'], 'kardex_warehouse_product_time');
            $table->index(['company_id', 'occurred_at'], 'kardex_company_time');
            $table->index(['branch_id', 'occurred_at'], 'kardex_branch_time');
            $table->index(['lot_id']);
            $table->index(['reference_type', 'reference_id']);
            $table->index(['type', 'occurred_at']);
        });

        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('from_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUlid('to_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUlid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 32)->default('draft');
            $table->text('notes')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('transfer_id')->constrained('stock_transfers')->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('qty_sent', 14, 4);
            $table->decimal('qty_received', 14, 4)->nullable();
            $table->timestamps();
        });

        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('warehouse_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 32)->default('draft');
            $table->string('reason_code', 32);
            $table->text('notes')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        Schema::create('stock_adjustment_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('adjustment_id')->constrained('stock_adjustments')->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('qty_before', 14, 4);
            $table->decimal('qty_after', 14, 4);
            $table->string('reason_code', 32)->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_counts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('warehouse_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('counted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 32)->default('draft');
            $table->text('notes')->nullable();
            $table->timestamp('counted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_count_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('count_id')->constrained('inventory_counts')->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('system_qty', 14, 4);
            $table->decimal('counted_qty', 14, 4)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_count_items');
        Schema::dropIfExists('inventory_counts');
        Schema::dropIfExists('stock_adjustment_items');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('stock_transfer_items');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('lots');
        Schema::dropIfExists('stock_items');
    }
};
