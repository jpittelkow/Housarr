<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vendor;

class VendorPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Vendor $vendor): bool
    {
        return $user->household_id === $vendor->household_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Vendor $vendor): bool
    {
        return $user->household_id === $vendor->household_id;
    }

    public function delete(User $user, Vendor $vendor): bool
    {
        return $user->household_id === $vendor->household_id;
    }
}
