<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDamageReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route is gated by auth:sanctum; any authenticated user may submit.
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return DamageReportRules::rules(partial: false);
    }
}
