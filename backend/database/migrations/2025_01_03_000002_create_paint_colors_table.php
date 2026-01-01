<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paint_colors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->constrained()->cascadeOnDelete();
            $table->string('brand')->nullable();
            $table->string('color_name');
            $table->string('hex_code', 7)->nullable();
            $table->tinyInteger('rgb_r')->nullable()->unsigned();
            $table->tinyInteger('rgb_g')->nullable()->unsigned();
            $table->tinyInteger('rgb_b')->nullable()->unsigned();
            $table->string('purchase_url')->nullable();
            $table->string('product_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paint_colors');
    }
};
