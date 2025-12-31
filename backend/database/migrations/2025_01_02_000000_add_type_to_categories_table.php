<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            // Add type column with default 'item' for backward compatibility
            $table->string('type')->default('item')->after('household_id');
        });

        // Set all existing categories to 'item' type (ensures all have the value)
        DB::table('categories')->update(['type' => 'item']);

        // Make type NOT NULL after setting defaults
        Schema::table('categories', function (Blueprint $table) {
            $table->string('type')->nullable(false)->change();
        });

        // Add index for efficient filtering
        Schema::table('categories', function (Blueprint $table) {
            $table->index(['household_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex(['household_id', 'type']);
            $table->dropColumn('type');
        });
    }
};
