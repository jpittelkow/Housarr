<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For SQLite, we need to recreate the column
        // First add the new column
        Schema::table('parts', function (Blueprint $table) {
            $table->json('purchase_urls')->nullable()->after('purchase_url');
        });

        // Migrate existing data
        $parts = DB::table('parts')->whereNotNull('purchase_url')->get();
        foreach ($parts as $part) {
            DB::table('parts')
                ->where('id', $part->id)
                ->update([
                    'purchase_urls' => json_encode([
                        'primary' => $part->purchase_url,
                    ]),
                ]);
        }

        // Note: We keep purchase_url for backwards compatibility
        // but new code should use purchase_urls
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('parts', function (Blueprint $table) {
            $table->dropColumn('purchase_urls');
        });
    }
};
