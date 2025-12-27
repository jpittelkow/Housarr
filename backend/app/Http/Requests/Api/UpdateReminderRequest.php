<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateReminderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('reminder'));
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
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['sometimes', 'date'],
            'repeat_interval' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['pending', 'snoozed', 'completed', 'dismissed'])],
        ];
    }
}
