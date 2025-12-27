<?php

namespace App\Policies;

use App\Models\Part;
use App\Models\User;

class PartPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Part $part): bool
    {
        return $user->household_id === $part->item->household_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Part $part): bool
    {
        return $user->household_id === $part->item->household_id;
    }

    public function delete(User $user, Part $part): bool
    {
        return $user->household_id === $part->item->household_id;
    }
}
