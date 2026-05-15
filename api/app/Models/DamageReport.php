<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $reference
 * @property string $reporter_name
 * @property string $reporter_email
 * @property string $vehicle_registration
 * @property ?string $vehicle_make
 * @property ?string $vehicle_model
 * @property ?string $location
 * @property ?CarbonImmutable $incident_at
 * @property ?string $cover_image_url
 * @property string $damage_type
 * @property string $severity
 * @property string $description
 * @property ?array $photos
 * @property ?float $estimated_cost
 * @property string $status
 */
class DamageReport extends Model
{
    protected $fillable = [
        'reference',
        'reporter_name',
        'reporter_email',
        'vehicle_registration',
        'vehicle_make',
        'vehicle_model',
        'location',
        'incident_at',
        'cover_image_url',
        'damage_type',
        'severity',
        'description',
        'photos',
        'estimated_cost',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'photos' => 'array',
            'estimated_cost' => 'decimal:2',
            'incident_at' => 'immutable_datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (DamageReport $report) {
            $report->reference ??= 'DR-'.strtoupper(Str::random(8));
            $report->status ??= 'submitted';
        });
    }
}
