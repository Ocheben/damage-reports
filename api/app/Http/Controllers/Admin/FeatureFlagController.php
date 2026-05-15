<?php

namespace App\Http\Controllers\Admin;

use App\Http\Requests\FeatureFlagRequest;
use App\Http\Resources\FeatureFlagResource;
use App\Models\FeatureFlag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class FeatureFlagController
{
    public function index(): AnonymousResourceCollection
    {
        return FeatureFlagResource::collection(
            FeatureFlag::query()->orderBy('key')->get(),
        );
    }

    public function show(FeatureFlag $flag): FeatureFlagResource
    {
        return FeatureFlagResource::make($flag);
    }

    public function store(FeatureFlagRequest $request): JsonResponse
    {
        $flag = FeatureFlag::create([
            ...$request->validated(),
            'rules' => $request->normalisedRules(),
        ]);

        return FeatureFlagResource::make($flag)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(FeatureFlagRequest $request, FeatureFlag $flag): FeatureFlagResource
    {
        $payload = $request->validated();
        if ($request->has('rules')) {
            $payload['rules'] = $request->normalisedRules();
        }
        $flag->update($payload);

        return FeatureFlagResource::make($flag->refresh());
    }

    public function destroy(FeatureFlag $flag): Response
    {
        $flag->delete();

        return response()->noContent();
    }
}
