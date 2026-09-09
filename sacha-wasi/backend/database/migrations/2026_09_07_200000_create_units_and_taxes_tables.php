<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('symbol', 16);
            $table->string('dimension', 16);
            $table->decimal('factor_to_base', 18, 8)->default(1);
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['company_id', 'symbol']);
            $table->index(['dimension']);
        });

        Schema::create('tax_rates', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 16);
            $table->string('name');
            $table->decimal('percent', 7, 4);
            $table->string('sri_code', 16)->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        Schema::create('kitchen_stations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('color', 16)->nullable();
            $table->unsignedSmallInteger('sla_minutes')->default(15);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kitchen_stations');
        Schema::dropIfExists('tax_rates');
        Schema::dropIfExists('units');
    }
};
