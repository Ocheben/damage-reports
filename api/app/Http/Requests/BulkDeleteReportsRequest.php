<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkDeleteReportsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            // exists:* fails fast rather than silently dropping unknown ids.
            'ids.*' => ['integer', 'exists:damage_reports,id'],
        ];
    }

    /** @return array<int, int> */
    public function ids(): array
    {
        return array_map('intval', (array) $this->validated('ids', []));
    }
}
