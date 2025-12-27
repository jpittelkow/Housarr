<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReminderRequest extends FormRequest
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
                'nullable',
                'integer',
                Rule::exists('items', 'id')->where('household_id', $householdId),
            ],
            'part_id' => [
                'nullable',
                'integer',
                Rule::exists('parts', 'id')->whereIn('item_id', function ($query) use ($householdId) {
                    $query->select('id')->from('items')->where('household_id', $householdId);
                }),
            ],
            'user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where('household_id', $householdId),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'due_date' => ['required', 'date', 'after_or_equal:today'],
            'repeat_interval' => ['nullable', 'integer', 'min:1', 'max:365'],
        ];
    }
}
