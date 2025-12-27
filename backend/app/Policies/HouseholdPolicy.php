<?php

namespace App\Policies;

use App\Models\User;

class HouseholdPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, $model): bool
    {
        return $user->household_id === $model->household_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, $model): bool
    {
        return $user->household_id === $model->household_id;
    }

    public function delete(User $user, $model): bool
    {
        return $user->household_id === $model->household_id;
    }
}
