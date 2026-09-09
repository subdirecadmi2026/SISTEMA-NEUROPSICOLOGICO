<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('base_unit_id')->constrained('units')->restrictOnDelete();
            $table->foreignUlid('purchase_unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignUlid('tax_rate_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('kitchen_station_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 32);
            $table->string('status', 32)->default('active');
            $table->string('inventory_behavior', 32)->default('tracked');
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('sku', 64);
            $table->string('barcode', 64)->nullable();
            $table->string('image_path')->nullable();
            $table->decimal('default_cost', 14, 4)->default(0);
            $table->decimal('default_price', 12, 2)->default(0);
            $table->unsignedSmallInteger('prep_time_minutes')->nullable();
            $table->boolean('tracks_lots')->default(true);
            $table->boolean('is_sellable')->default(true);
            $table->boolean('is_purchasable')->default(false);
            $table->json('allergens')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'sku']);
            $table->unique(['company_id', 'slug']);
            $table->index(['company_id', 'barcode']);
            $table->index(['company_id', 'type', 'status']);
            $table->index(['company_id', 'category_id', 'name']);
        });

        Schema::create('product_images', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('product_option_groups', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->boolean('is_required')->default(false);
            $table->unsignedTinyInteger('min_select')->default(0);
            $table->unsignedTinyInteger('max_select')->default(1);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('product_options', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('option_group_id')->constrained('product_option_groups')->cascadeOnDelete();
            $table->foreignUlid('linked_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('name');
            $table->decimal('price_delta', 12, 2)->default(0);
            $table->decimal('cost_delta', 14, 4)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('sku', 64)->nullable();
            $table->string('barcode', 64)->nullable();
            $table->json('option_ids');
            $table->decimal('price_override', 12, 2)->nullable();
            $table->decimal('cost_override', 14, 4)->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['product_id', 'sku']);
        });

        Schema::create('product_combo_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('combo_product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUlid('component_product_id')->constrained('products')->restrictOnDelete();
            $table->decimal('quantity', 14, 4)->default(1);
            $table->boolean('is_optional')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['combo_product_id', 'component_product_id'], 'product_combo_unique_component');
        });

        Schema::create('product_channel_prices', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('channel', 32);
            $table->decimal('price', 12, 2);
            $table->timestamps();

            $table->unique(['product_id', 'branch_id', 'channel'], 'product_channel_price_unique');
        });

        Schema::create('product_branch_settings', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_available')->default(true);
            $table->decimal('price_override', 12, 2)->nullable();
            $table->foreignUlid('tax_rate_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['product_id', 'branch_id']);
        });

        Schema::create('product_availability_windows', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->timestamps();

            $table->index(['product_id', 'weekday']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_availability_windows');
        Schema::dropIfExists('product_branch_settings');
        Schema::dropIfExists('product_channel_prices');
        Schema::dropIfExists('product_combo_items');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('product_options');
        Schema::dropIfExists('product_option_groups');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
    }
};
