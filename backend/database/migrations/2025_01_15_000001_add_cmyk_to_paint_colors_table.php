<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paint_colors', function (Blueprint $table) {
            $table->tinyInteger('cmyk_c')->nullable()->unsigned()->after('rgb_b');
            $table->tinyInteger('cmyk_m')->nullable()->unsigned()->after('cmyk_c');
            $table->tinyInteger('cmyk_y')->nullable()->unsigned()->after('cmyk_m');
            $table->tinyInteger('cmyk_k')->nullable()->unsigned()->after('cmyk_y');
        });
    }

    public function down(): void
    {
        Schema::table('paint_colors', function (Blueprint $table) {
            $table->dropColumn(['cmyk_c', 'cmyk_m', 'cmyk_y', 'cmyk_k']);
        });
    }
};
