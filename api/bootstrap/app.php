<?php

use App\Http\Middleware\AdminRole;
use App\Http\Middleware\FlushDecisionLog;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [HandleCors::class]);
        // Terminating phase: writes buffered decisions after the response.
        $middleware->api(append: [FlushDecisionLog::class]);
        $middleware->alias([
            'admin-role' => AdminRole::class,
        ]);

        // No login route in this API — never redirect, always raise so the
        // exception handler can render JSON via `shouldRenderJsonWhen` below.
        Authenticate::redirectUsing(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Render every /api/* error as JSON, ignoring the caller's Accept header.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })
    ->create();
