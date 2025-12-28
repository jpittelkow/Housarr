<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('item')->household_id === $this->user()->household_id;
    }

    public function rules(): array
    {
        $householdId = $this->user()->household_id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'category_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where(function ($query) use ($householdId) {
                    $query->whereNull('household_id')->orWhere('household_id', $householdId);
                }),
            ],
            'vendor_id' => [
                'nullable',
                'integer',
                Rule::exists('vendors', 'id')->where('household_id', $householdId),
            ],
            'location_id' => [
                'nullable',
                'integer',
                Rule::exists('locations', 'id')->where('household_id', $householdId),
            ],
            'make' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'install_date' => ['nullable', 'date', 'before_or_equal:today'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'warranty_years' => ['nullable', 'integer', 'min:0', 'max:100'],
            'maintenance_interval_months' => ['nullable', 'integer', 'min:1', 'max:120'],
            'typical_lifespan_years' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
