<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Items: Add indexes for search and filtering (if not exist)
        $this->addIndexIfNotExists('items', 'items_name_index', ['name']);
        $this->addIndexIfNotExists('items', 'items_location_index', ['location']);
        $this->addIndexIfNotExists('items', 'items_household_id_name_index', ['household_id', 'name']);

        // Reminders: Add indexes for status/date queries
        $this->addIndexIfNotExists('reminders', 'reminders_status_index', ['status']);
        $this->addIndexIfNotExists('reminders', 'reminders_due_date_index', ['due_date']);
        $this->addIndexIfNotExists('reminders', 'reminders_household_id_status_index', ['household_id', 'status']);
        $this->addIndexIfNotExists('reminders', 'reminders_household_id_due_date_index', ['household_id', 'due_date']);

        // Todos: Add indexes for filtering
        $this->addIndexIfNotExists('todos', 'todos_due_date_index', ['due_date']);
        $this->addIndexIfNotExists('todos', 'todos_completed_at_index', ['completed_at']);
        $this->addIndexIfNotExists('todos', 'todos_priority_index', ['priority']);
        $this->addIndexIfNotExists('todos', 'todos_household_id_completed_at_index', ['household_id', 'completed_at']);

        // Notifications: Add index for unread queries
        $this->addIndexIfNotExists('notifications', 'notifications_read_at_index', ['read_at']);
        $this->addIndexIfNotExists('notifications', 'notifications_user_id_read_at_index', ['user_id', 'read_at']);

        // Maintenance logs: Add index for date queries
        $this->addIndexIfNotExists('maintenance_logs', 'maintenance_logs_date_index', ['date']);
        $this->addIndexIfNotExists('maintenance_logs', 'maintenance_logs_item_id_date_index', ['item_id', 'date']);
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['location']);
            $table->dropIndex(['household_id', 'name']);
        });

        Schema::table('reminders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['due_date']);
            $table->dropIndex(['household_id', 'status']);
            $table->dropIndex(['household_id', 'due_date']);
        });

        Schema::table('todos', function (Blueprint $table) {
            $table->dropIndex(['due_date']);
            $table->dropIndex(['completed_at']);
            $table->dropIndex(['priority']);
            $table->dropIndex(['household_id', 'completed_at']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['read_at']);
            $table->dropIndex(['user_id', 'read_at']);
        });

        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->dropIndex(['date']);
            $table->dropIndex(['item_id', 'date']);
        });
    }

    private function addIndexIfNotExists(string $table, string $indexName, array $columns): void
    {
        $indexes = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$indexName]);

        if (empty($indexes)) {
            Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                $blueprint->index($columns);
            });
        }
    }
};
