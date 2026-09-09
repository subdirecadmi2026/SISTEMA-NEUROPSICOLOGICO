<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipes', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('yield_unit_id')->constrained('units')->restrictOnDelete();
            $table->string('name');
            $table->unsignedInteger('version')->default(1);
            $table->decimal('yield_quantity', 14, 4)->default(1);
            $table->decimal('process_waste_percent', 7, 4)->default(0);
            $table->decimal('cached_unit_cost', 14, 4)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['product_id', 'version']);
            $table->index(['company_id', 'product_id', 'is_active']);
        });

        Schema::create('recipe_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('recipe_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('component_product_id')->constrained('products')->restrictOnDelete();
            $table->foreignUlid('unit_id')->constrained('units')->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->decimal('waste_percent', 7, 4)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['recipe_id', 'component_product_id']);
            $table->index(['component_product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipe_items');
        Schema::dropIfExists('recipes');
    }
};
