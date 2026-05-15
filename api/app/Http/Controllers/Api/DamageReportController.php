<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\BulkDeleteReportsRequest;
use App\Http\Requests\StoreDamageReportRequest;
use App\Http\Requests\UpdateDamageReportRequest;
use App\Http\Resources\DamageReportResource;
use App\Models\DamageReport;
use App\Models\User;
use App\Services\FeatureFlags\EvaluationContext;
use App\Services\FeatureFlags\FeatureFlagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class DamageReportController
{
    public function __construct(private readonly FeatureFlagService $flags) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = max(1, min(100, (int) $request->integer('per_page', 20)));

        $query = DamageReport::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('damage_type'), fn ($q) => $q->where('damage_type', $request->string('damage_type')))
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->string('severity')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $needle = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($needle) {
                    $inner->where('reporter_name', 'like', $needle)
                        ->orWhere('reporter_email', 'like', $needle)
                        ->orWhere('vehicle_registration', 'like', $needle)
                        ->orWhere('reference', 'like', $needle);
                });
            })
            ->orderByDesc('incident_at')
            ->orderByDesc('id');

        return DamageReportResource::collection($query->paginate($perPage));
    }

    public function show(DamageReport $report): DamageReportResource
    {
        return DamageReportResource::make($report);
    }

    public function store(StoreDamageReportRequest $request): JsonResponse
    {
        $payload = $this->applyFeatureGates($request, $request->validated());
        $report = DamageReport::create($payload);

        return DamageReportResource::make($report)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateDamageReportRequest $request, DamageReport $report): DamageReportResource
    {
        $payload = $this->applyFeatureGates($request, $request->validated());
        $report->update($payload);

        return DamageReportResource::make($report->refresh());
    }

    public function bulkDestroy(BulkDeleteReportsRequest $request): JsonResponse
    {
        if (! $this->isFlagOn($request, 'bulk-actions')) {
            return $this->featureDisabled('bulk-actions');
        }

        $deleted = DamageReport::query()->whereIn('id', $request->ids())->delete();

        return response()->json(['deleted' => $deleted]);
    }

    public function exportPdf(Request $request, DamageReport $report): JsonResponse
    {
        if (! $this->isFlagOn($request, 'export-pdf')) {
            return $this->featureDisabled('export-pdf');
        }

        return response()->json([
            'export_url' => url("/api/v1/reports/{$report->id}/export.pdf"),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function applyFeatureGates(Request $request, array $payload): array
    {
        // Hint, not a column.
        unset($payload['request_ai_analysis']);

        if (! $this->isFlagOn($request, 'report-photos')) {
            unset($payload['photos']);
        }
        if (! $this->isFlagOn($request, 'cost-estimate')) {
            unset($payload['estimated_cost']);
        }

        return $payload;
    }

    private function isFlagOn(Request $request, string $key): bool
    {
        return $this->flags->evaluate($key, $this->contextFrom($request))->value;
    }

    private function contextFrom(Request $request): EvaluationContext
    {
        /** @var ?User $user */
        $user = $request->user();

        return $user
            ? new EvaluationContext(userKey: $user->flagUserKey(), attributes: $user->flagAttributes())
            : new EvaluationContext;
    }

    private function featureDisabled(string $flagKey): JsonResponse
    {
        return response()->json([
            'error' => 'feature_disabled',
            'flag' => $flagKey,
            'message' => "The {$flagKey} feature is currently disabled.",
        ], Response::HTTP_FORBIDDEN);
    }
}
