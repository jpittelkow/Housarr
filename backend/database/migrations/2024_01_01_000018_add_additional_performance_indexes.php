<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function indexExists(string $table, string $indexName): bool
    {
        // Check for SQLite
        if (DB::connection()->getDriverName() === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list('{$table}')");
            foreach ($indexes as $index) {
                if ($index->name === $indexName) {
                    return true;
                }
            }
            return false;
        }

        // MySQL/PostgreSQL - use information schema
        return DB::table('information_schema.statistics')
            ->where('table_schema', DB::connection()->getDatabaseName())
            ->where('table_name', $table)
            ->where('index_name', $indexName)
            ->exists();
    }

    public function up(): void
    {
        // Items: Add indexes for search on make/model
        Schema::table('items', function (Blueprint $table) {
            if (!$this->indexExists('items', 'items_make_index')) {
                $table->index('make', 'items_make_index');
            }
            if (!$this->indexExists('items', 'items_model_index')) {
                $table->index('model', 'items_model_index');
            }
            if (!$this->indexExists('items', 'items_household_id_category_id_index')) {
                $table->index(['household_id', 'category_id'], 'items_household_id_category_id_index');
            }
        });

        // Files: Add indexes for polymorphic queries and featured lookups
        // Note: morphs() already creates files_fileable_type_fileable_id_index
        Schema::table('files', function (Blueprint $table) {
            if (!$this->indexExists('files', 'files_fileable_featured_index')) {
                $table->index(['fileable_type', 'fileable_id', 'is_featured'], 'files_fileable_featured_index');
            }
            if (!$this->indexExists('files', 'files_household_id_index')) {
                $table->index('household_id', 'files_household_id_index');
            }
        });

        // Settings: Add unique composite index for efficient lookups
        if (!$this->indexExists('settings', 'settings_household_id_key_unique')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->unique(['household_id', 'key'], 'settings_household_id_key_unique');
            });
        }

        // Parts: Add index for item lookups
        Schema::table('parts', function (Blueprint $table) {
            if (!$this->indexExists('parts', 'parts_item_id_index')) {
                $table->index('item_id', 'parts_item_id_index');
            }
            if (!$this->indexExists('parts', 'parts_item_id_type_index')) {
                $table->index(['item_id', 'type'], 'parts_item_id_type_index');
            }
        });

        // Categories: Add index for household
        if (!$this->indexExists('categories', 'categories_household_id_index')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->index('household_id', 'categories_household_id_index');
            });
        }

        // Vendors: Add index for household
        if (!$this->indexExists('vendors', 'vendors_household_id_index')) {
            Schema::table('vendors', function (Blueprint $table) {
                $table->index('household_id', 'vendors_household_id_index');
            });
        }

        // Locations: Add index for household
        if (!$this->indexExists('locations', 'locations_household_id_index')) {
            Schema::table('locations', function (Blueprint $table) {
                $table->index('household_id', 'locations_household_id_index');
            });
        }

        // Users: Add index for household
        if (!$this->indexExists('users', 'users_household_id_index')) {
            Schema::table('users', function (Blueprint $table) {
                $table->index('household_id', 'users_household_id_index');
            });
        }
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex('items_make_index');
            $table->dropIndex('items_model_index');
            $table->dropIndex('items_household_id_category_id_index');
        });

        Schema::table('files', function (Blueprint $table) {
            $table->dropIndex('files_fileable_type_fileable_id_index');
            $table->dropIndex('files_fileable_featured_index');
            $table->dropIndex('files_household_id_index');
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique('settings_household_id_key_unique');
        });

        Schema::table('parts', function (Blueprint $table) {
            $table->dropIndex('parts_item_id_index');
            $table->dropIndex('parts_item_id_type_index');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('categories_household_id_index');
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->dropIndex('vendors_household_id_index');
        });

        Schema::table('locations', function (Blueprint $table) {
            $table->dropIndex('locations_household_id_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_household_id_index');
        });
    }
};

