<?php

namespace App\Http\Requests;

use App\Services\FeatureFlags\Rules\RuleFactory;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class FeatureFlagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PATCH') || $this->isMethod('PUT');
        $presence = $isUpdate ? 'sometimes' : 'required';
        $flagId = $this->route('flag')?->id;

        return [
            'key' => [
                $presence,
                'string',
                'max:128',
                'regex:/^[a-z0-9][a-z0-9-]*$/',
                Rule::unique('feature_flags', 'key')->ignore($flagId),
            ],
            'name' => [$presence, 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'enabled' => [$presence, 'boolean'],
            'default_value' => [$presence, 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'rules' => ['nullable', 'array'],
            'rules.*' => ['array'],
            'rules.*.type' => ['required', 'string', Rule::in(RuleFactory::supportedTypes())],
        ];
    }

    public function messages(): array
    {
        return [
            'key.regex' => 'Key must be lowercase alphanumeric with hyphens (e.g. "ai-damage-analysis").',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            foreach ((array) $this->input('rules', []) as $i => $definition) {
                if (! is_array($definition)) {
                    $v->errors()->add("rules.{$i}", 'Rule must be an object.');

                    continue;
                }
                try {
                    RuleFactory::fromArray($definition);
                } catch (InvalidArgumentException $e) {
                    $v->errors()->add("rules.{$i}", $e->getMessage());
                }
            }
        });
    }

    /** @return array<int, array<string, mixed>> */
    public function normalisedRules(): array
    {
        return array_map(
            fn (array $def): array => RuleFactory::fromArray($def)->toArray(),
            (array) $this->input('rules', []),
        );
    }
}
