<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('guest_label', 80)->nullable()->after('reference');
            $table->decimal('tendered_amount', 12, 2)->nullable()->after('guest_label');
            $table->decimal('change_amount', 12, 2)->nullable()->after('tendered_amount');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['guest_label', 'tendered_amount', 'change_amount']);
        });
    }
};
