<?php

namespace App\Http\Resources;

use App\Models\FeatureFlag;
use App\Services\FeatureFlags\Rules\RuleFactory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use InvalidArgumentException;

/**
 * @mixin FeatureFlag
 */
class FeatureFlagResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'enabled' => (bool) $this->enabled,
            'default_value' => (bool) $this->default_value,
            'rules' => $this->normaliseRules($this->rules),
            'starts_at' => optional($this->starts_at)->toIso8601String(),
            'ends_at' => optional($this->ends_at)->toIso8601String(),
            'deleted_at' => $this->when(
                $this->trashed(),
                fn () => optional($this->deleted_at)->toIso8601String(),
            ),
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }

    /**
     * Round-trip rules through the factory so clients see exactly what the
     * evaluator will see, with all defaults filled in.
     *
     * @param  array<int, array<string, mixed>>|null  $rules
     * @return array<int, array<string, mixed>>
     */
    private function normaliseRules(?array $rules): array
    {
        if ($rules === null) {
            return [];
        }

        $out = [];
        foreach ($rules as $rule) {
            try {
                $out[] = RuleFactory::fromArray($rule)->toArray();
            } catch (InvalidArgumentException) {
                // Pre-migration row: surface raw definition instead of 500-ing.
                $out[] = $rule;
            }
        }

        return $out;
    }
}
