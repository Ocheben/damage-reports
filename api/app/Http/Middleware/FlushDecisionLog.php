<?php

namespace App\Http\Middleware;

use App\Services\FeatureFlags\DecisionLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Flushes the per-request decision buffer in the terminating phase, so the
 * INSERT happens after the response has been sent to the client.
 */
class FlushDecisionLog
{
    public function __construct(private readonly DecisionLogger $decisions) {}

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $this->decisions->flush();
    }
}
