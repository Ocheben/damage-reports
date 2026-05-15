<?php

namespace App\Http\Requests;

/**
 * Shared damage-report validation. Pass partial=true for PATCH (uses
 * `sometimes`); false for store (uses `required`).
 */
final class DamageReportRules
{
    public const DAMAGE_TYPES = ['dent', 'scratch', 'collision', 'glass', 'paint', 'other'];

    public const SEVERITIES = ['minor', 'moderate', 'severe'];

    public const STATUSES = ['submitted', 'reviewing', 'approved', 'rejected', 'repaired'];

    /** @return array<string, array<int, mixed>> */
    public static function rules(bool $partial): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'reporter_name' => [$required, 'string', 'max:255'],
            'reporter_email' => [$required, 'email', 'max:255'],
            'vehicle_registration' => [$required, 'string', 'max:32'],
            'vehicle_make' => ['nullable', 'string', 'max:100'],
            'vehicle_model' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'incident_at' => ['nullable', 'date'],
            'cover_image_url' => ['nullable', 'string', 'max:1024', 'url'],
            'damage_type' => [$required, 'string', 'in:'.implode(',', self::DAMAGE_TYPES)],
            'severity' => [$required, 'string', 'in:'.implode(',', self::SEVERITIES)],
            'description' => [$required, 'string', 'max:2000'],
            'photos' => ['nullable', 'array', 'max:8'],
            'photos.*' => ['array'],
            'photos.*.url' => ['required', 'string', 'max:1024', 'url'],
            'photos.*.caption' => ['nullable', 'string', 'max:255'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'status' => ['nullable', 'string', 'in:'.implode(',', self::STATUSES)],
            // Hint for the controller; not persisted as a column.
            'request_ai_analysis' => ['nullable', 'boolean'],
        ];
    }
}
