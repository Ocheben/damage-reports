<?php

namespace App\Http\Controllers\Admin;

use App\Models\FeatureFlagDecision;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DecisionLogController
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'flag_key' => ['nullable', 'string', 'max:128'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $limit = (int) ($data['limit'] ?? 100);

        $query = FeatureFlagDecision::query()
            ->when($data['flag_key'] ?? null, fn ($q, $key) => $q->where('flag_key', $key))
            ->orderByDesc('decided_at')
            ->orderByDesc('id');

        $rows = (clone $query)->limit($limit)->get()->map(fn ($d) => [
            'id' => $d->id,
            'flag_key' => $d->flag_key,
            'result' => $d->result,
            'reason' => $d->reason,
            'user_key' => $d->user_key,
            'context' => [
                'user_key' => $d->user_key,
                'attributes' => $d->attributes ?? [],
            ],
            'decided_at' => optional($d->decided_at)->toIso8601String(),
        ]);

        // Computed in the DB so they stay correct past the row limit.
        $aggregates = $this->aggregates($data['flag_key'] ?? null);

        return response()->json([
            'data' => $rows,
            'aggregates' => $aggregates,
        ]);
    }

    private function aggregates(?string $flagKey): array
    {
        $base = FeatureFlagDecision::query()
            ->when($flagKey, fn ($q, $key) => $q->where('flag_key', $key));

        $byReason = (clone $base)
            ->selectRaw('reason, COUNT(*) as c')
            ->groupBy('reason')
            ->pluck('c', 'reason')
            ->map(fn ($v) => (int) $v)
            ->all();

        $byResult = (clone $base)
            ->selectRaw('result, COUNT(*) as c')
            ->groupBy('result')
            ->get()
            ->mapWithKeys(fn ($r) => [
                ($r->getAttribute('result') ? 'true' : 'false') => (int) $r->getAttribute('c'),
            ])
            ->all();

        return [
            'total' => (clone $base)->count(),
            'by_reason' => $byReason,
            'by_result' => $byResult,
        ];
    }
}
