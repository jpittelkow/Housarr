<?php

namespace App\Policies;

use App\Models\MaintenanceLog;
use App\Models\User;

class MaintenanceLogPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MaintenanceLog $log): bool
    {
        return $user->household_id === $log->item->household_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MaintenanceLog $log): bool
    {
        return $user->household_id === $log->item->household_id;
    }

    public function delete(User $user, MaintenanceLog $log): bool
    {
        return $user->household_id === $log->item->household_id;
    }
}
