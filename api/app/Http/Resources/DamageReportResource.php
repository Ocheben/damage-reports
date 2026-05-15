<?php

namespace App\Http\Resources;

use App\Models\DamageReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DamageReport
 */
class DamageReportResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'reporter_name' => $this->reporter_name,
            'reporter_email' => $this->reporter_email,
            'vehicle_registration' => $this->vehicle_registration,
            'vehicle_make' => $this->vehicle_make,
            'vehicle_model' => $this->vehicle_model,
            'location' => $this->location,
            'incident_at' => optional($this->incident_at)->toIso8601String(),
            'cover_image_url' => $this->cover_image_url,
            'damage_type' => $this->damage_type,
            'severity' => $this->severity,
            'description' => $this->description,
            // Null when the report-photos flag was off at submit time; normalize to [].
            'photos' => $this->photos ?? [],
            'estimated_cost' => $this->estimated_cost !== null
                ? (float) $this->estimated_cost
                : null,
            'status' => $this->status,
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
