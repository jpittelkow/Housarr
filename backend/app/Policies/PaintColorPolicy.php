<?php

namespace App\Policies;

use App\Models\PaintColor;
use App\Models\User;

class PaintColorPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, PaintColor $paintColor): bool
    {
        return $user->household_id === $paintColor->location->household_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, PaintColor $paintColor): bool
    {
        return $user->household_id === $paintColor->location->household_id;
    }

    public function delete(User $user, PaintColor $paintColor): bool
    {
        return $user->household_id === $paintColor->location->household_id;
    }
}
