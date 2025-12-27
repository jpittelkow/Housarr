<?php

namespace App\Policies;

use App\Models\Reminder;
use App\Models\User;

class ReminderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Reminder $reminder): bool
    {
        return $user->household_id === $reminder->household_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Reminder $reminder): bool
    {
        return $user->household_id === $reminder->household_id;
    }

    public function delete(User $user, Reminder $reminder): bool
    {
        return $user->household_id === $reminder->household_id;
    }
}
