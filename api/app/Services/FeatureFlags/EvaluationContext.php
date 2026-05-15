<?php

namespace App\Services\FeatureFlags;

final class EvaluationContext
{
    /** @param array<string, scalar|null> $attributes */
    public function __construct(
        public readonly ?string $userKey = null,
        public readonly array $attributes = [],
    ) {}

    public function attribute(string $name): mixed
    {
        return $this->attributes[$name] ?? null;
    }

    /** @return array{user_key: ?string, attributes: array<string, mixed>} */
    public function toArray(): array
    {
        return [
            'user_key' => $this->userKey,
            'attributes' => $this->attributes,
        ];
    }
}
