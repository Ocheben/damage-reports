<?php

use App\Http\Controllers\Admin\DecisionLogController;
use App\Http\Controllers\Admin\FeatureFlagController as AdminFlagController;
use App\Http\Controllers\Admin\ImpersonateController;
use App\Http\Controllers\Admin\PersonaController;
use App\Http\Controllers\Admin\StatsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DamageReportController;
use App\Http\Controllers\Api\EvaluationController;
use Illuminate\Support\Facades\Route;

Route::get('/up', fn () => response()->json(['status' => 'ok']));

// Login is rate-limited; logout revokes only the current token; /me is used
// by the BFF to confirm the cookie maps to a live session before rendering.
Route::prefix('api/auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:auth-login');
    Route::post('/logout', [AuthController::class, 'logout'])
        ->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])
        ->middleware('auth:sanctum');
});

/*
 * Public API. Reads allow anonymous (no user_key in the eval context); writes
 * require a real session. Identity attributes are always read server-side
 * from the User model — clients cannot assert their own role.
 */
Route::prefix('api/v1')->group(function () {
    // Hot path; rate-limited per user (or per IP for anonymous).
    Route::post('/flags/evaluate', EvaluationController::class)
        ->middleware('throttle:flag-evaluate');

    Route::get('/reports', [DamageReportController::class, 'index']);
    Route::get('/reports/{report}', [DamageReportController::class, 'show']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/reports', [DamageReportController::class, 'store']);
        Route::patch('/reports/{report}', [DamageReportController::class, 'update']);
        Route::post('/reports/bulk-delete', [DamageReportController::class, 'bulkDestroy']);
        Route::post('/reports/{report}/export-pdf', [DamageReportController::class, 'exportPdf']);
    });
});

/*
 * Admin API. Sanctum auth + role=admin. Includes the persona switcher
 * endpoints (impersonate/personas), so persona switching is admin-only.
 */
Route::middleware(['auth:sanctum', 'admin-role'])->prefix('api/admin')->group(function () {
    Route::get('/flags', [AdminFlagController::class, 'index']);
    Route::post('/flags', [AdminFlagController::class, 'store']);
    Route::get('/flags/{flag}', [AdminFlagController::class, 'show']);
    Route::patch('/flags/{flag}', [AdminFlagController::class, 'update']);
    Route::delete('/flags/{flag}', [AdminFlagController::class, 'destroy']);

    Route::get('/decisions', DecisionLogController::class);
    Route::get('/stats', StatsController::class);

    Route::get('/personas', PersonaController::class);
    Route::post('/impersonate', ImpersonateController::class);
});
