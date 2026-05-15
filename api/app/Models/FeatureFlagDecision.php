<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $flag_key
 * @property bool $result
 * @property string $reason
 * @property ?string $user_key
 * @property ?array $attributes
 * @property CarbonImmutable $decided_at
 */
class FeatureFlagDecision extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'flag_key', 'result', 'reason', 'user_key', 'attributes', 'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'result' => 'boolean',
            'attributes' => 'array',
            'decided_at' => 'immutable_datetime',
        ];
    }
}
