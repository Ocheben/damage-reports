<?php

namespace App\Models;

use App\Services\FeatureFlags\Rules\Rule;
use App\Services\FeatureFlags\Rules\RuleFactory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $key
 * @property string $name
 * @property ?string $description
 * @property bool $enabled
 * @property bool $default_value
 * @property ?array $rules
 * @property ?CarbonImmutable $starts_at
 * @property ?CarbonImmutable $ends_at
 */
class FeatureFlag extends Model
{
    use SoftDeletes;

    public const CACHE_KEY = 'feature-flags:all';

    protected $fillable = [
        'key',
        'name',
        'description',
        'enabled',
        'default_value',
        'rules',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'default_value' => 'boolean',
            'rules' => 'array',
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
        ];
    }

    /** @return array<int, Rule> */
    public function hydratedRules(): array
    {
        return array_map(
            fn (array $def) => RuleFactory::fromArray($def),
            $this->rules ?? [],
        );
    }

    public function isWithinSchedule(CarbonImmutable $now): bool
    {
        if ($this->starts_at !== null && $now->lt($this->starts_at)) {
            return false;
        }
        if ($this->ends_at !== null && $now->gt($this->ends_at)) {
            return false;
        }

        return true;
    }
}
