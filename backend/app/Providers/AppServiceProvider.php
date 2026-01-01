<?php

namespace App\Providers;

use App\Models\Item;
use App\Models\MaintenanceLog;
use App\Models\PaintColor;
use App\Models\Part;
use App\Models\Reminder;
use App\Models\Todo;
use App\Models\User;
use App\Models\Vendor;
use App\Policies\ItemPolicy;
use App\Policies\MaintenanceLogPolicy;
use App\Policies\PaintColorPolicy;
use App\Policies\PartPolicy;
use App\Policies\ReminderPolicy;
use App\Policies\TodoPolicy;
use App\Policies\UserPolicy;
use App\Policies\VendorPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Register policies
        Gate::policy(Item::class, ItemPolicy::class);
        Gate::policy(MaintenanceLog::class, MaintenanceLogPolicy::class);
        Gate::policy(PaintColor::class, PaintColorPolicy::class);
        Gate::policy(Part::class, PartPolicy::class);
        Gate::policy(Reminder::class, ReminderPolicy::class);
        Gate::policy(Todo::class, TodoPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Vendor::class, VendorPolicy::class);
    }
}
