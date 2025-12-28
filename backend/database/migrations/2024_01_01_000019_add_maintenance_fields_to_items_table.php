<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->unsignedInteger('warranty_years')->nullable()->after('notes');
            $table->unsignedInteger('maintenance_interval_months')->nullable()->after('warranty_years');
            $table->unsignedInteger('typical_lifespan_years')->nullable()->after('maintenance_interval_months');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['warranty_years', 'maintenance_interval_months', 'typical_lifespan_years']);
        });
    }
};
