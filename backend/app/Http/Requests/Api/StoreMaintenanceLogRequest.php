<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $householdId = $this->user()->household_id;

        return [
            'item_id' => [
                'required',
                'integer',
                Rule::exists('items', 'id')->where('household_id', $householdId),
            ],
            'vendor_id' => [
                'nullable',
                'integer',
                Rule::exists('vendors', 'id')->where('household_id', $householdId),
            ],
            'type' => ['required', Rule::in(['service', 'repair', 'replacement', 'inspection'])],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'part_ids' => ['sometimes', 'array'],
            'part_ids.*' => ['integer', 'exists:parts,id'],
        ];
    }
}
