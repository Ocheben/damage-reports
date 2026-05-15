<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\FeatureFlags\EvaluationContext;
use App\Services\FeatureFlags\FeatureFlagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvaluationController
{
    public function __construct(private readonly FeatureFlagService $flags) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var ?User $user */
        $user = $request->user();

        $context = $user
            ? new EvaluationContext(userKey: $user->flagUserKey(), attributes: $user->flagAttributes())
            : new EvaluationContext;

        $results = array_map(
            fn ($r) => $r->toArray(),
            $this->flags->evaluateAll($context),
        );

        $etag = '"'.substr(sha1(json_encode([$results, $context->toArray()])), 0, 16).'"';
        if ($request->headers->get('If-None-Match') === $etag) {
            return response()->json(null, 304)->setEtag($etag, false);
        }

        $maxAge = (int) config('feature_flags.public_response_cache_seconds', 15);

        return response()
            ->json([
                'flags' => $results,
                'evaluated_at' => now()->toIso8601String(),
            ])
            ->setEtag($etag, false)
            ->header('Cache-Control', "private, max-age={$maxAge}, must-revalidate");
    }
}
