<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Items: Add indexes for search and filtering
        Schema::table('items', function (Blueprint $table) {
            $table->index('name', 'items_name_index');
            $table->index('location', 'items_location_index');
            $table->index(['household_id', 'name'], 'items_household_id_name_index');
        });

        // Reminders: Add indexes for status/date queries
        Schema::table('reminders', function (Blueprint $table) {
            $table->index('status', 'reminders_status_index');
            $table->index('due_date', 'reminders_due_date_index');
            $table->index(['household_id', 'status'], 'reminders_household_id_status_index');
            $table->index(['household_id', 'due_date'], 'reminders_household_id_due_date_index');
        });

        // Todos: Add indexes for filtering
        Schema::table('todos', function (Blueprint $table) {
            $table->index('due_date', 'todos_due_date_index');
            $table->index('completed_at', 'todos_completed_at_index');
            $table->index('priority', 'todos_priority_index');
            $table->index(['household_id', 'completed_at'], 'todos_household_id_completed_at_index');
        });

        // Notifications: Add index for unread queries
        Schema::table('notifications', function (Blueprint $table) {
            $table->index('read_at', 'notifications_read_at_index');
            $table->index(['user_id', 'read_at'], 'notifications_user_id_read_at_index');
        });

        // Maintenance logs: Add index for date queries
        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->index('date', 'maintenance_logs_date_index');
            $table->index(['item_id', 'date'], 'maintenance_logs_item_id_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex('items_name_index');
            $table->dropIndex('items_location_index');
            $table->dropIndex('items_household_id_name_index');
        });

        Schema::table('reminders', function (Blueprint $table) {
            $table->dropIndex('reminders_status_index');
            $table->dropIndex('reminders_due_date_index');
            $table->dropIndex('reminders_household_id_status_index');
            $table->dropIndex('reminders_household_id_due_date_index');
        });

        Schema::table('todos', function (Blueprint $table) {
            $table->dropIndex('todos_due_date_index');
            $table->dropIndex('todos_completed_at_index');
            $table->dropIndex('todos_priority_index');
            $table->dropIndex('todos_household_id_completed_at_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_read_at_index');
            $table->dropIndex('notifications_user_id_read_at_index');
        });

        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->dropIndex('maintenance_logs_date_index');
            $table->dropIndex('maintenance_logs_item_id_date_index');
        });
    }
};
