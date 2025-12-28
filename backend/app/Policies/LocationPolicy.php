<?php

namespace App\Policies;

use App\Models\Location;
use App\Models\User;

class LocationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Location $location): bool
    {
        return $user->household_id === $location->household_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Location $location): bool
    {
        return $user->household_id === $location->household_id;
    }

    public function delete(User $user, Location $location): bool
    {
        return $user->household_id === $location->household_id;
    }
}
