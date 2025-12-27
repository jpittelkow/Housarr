<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, User $target): bool
    {
        return $user->household_id === $target->household_id;
    }

    public function update(User $user, User $target): bool
    {
        return $user->household_id === $target->household_id && $user->isAdmin();
    }

    public function delete(User $user, User $target): bool
    {
        return $user->household_id === $target->household_id
            && $user->isAdmin()
            && $user->id !== $target->id;
    }
}
