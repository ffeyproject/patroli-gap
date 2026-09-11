<?php

use App\Http\Controllers\Api\AttendanceApiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckpointApiController;
use App\Http\Controllers\Api\IncidentApiController;
use App\Http\Controllers\Api\PatrolApiController;
use App\Http\Controllers\Api\VisitorApiController;
use App\Http\Controllers\LiveMapController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public Auth
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Protected Routes (Sanctum Token Auth)
    Route::middleware('auth:sanctum')->group(function () {
        // User Profile & Logout
        Route::get('/auth/profile', [AuthController::class, 'profile']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Live Guard Tracking (Where are the guards now)
        Route::get('/live/guards', [LiveMapController::class, 'liveData']);

        // Attendance (Check-in / Check-out Shift)
        Route::get('/attendance/status', [AttendanceApiController::class, 'status']);
        Route::post('/attendance/check-in', [AttendanceApiController::class, 'checkIn']);
        Route::post('/attendance/check-out', [AttendanceApiController::class, 'checkOut']);

        // Patrol Schedules & Sessions
        Route::get('/patrol/my-schedules', [PatrolApiController::class, 'mySchedules']);
        Route::post('/patrol/session/start', [PatrolApiController::class, 'startSession']);
        Route::get('/patrol/session/active', [PatrolApiController::class, 'activeSession']);
        Route::post('/patrol/session/finish', [PatrolApiController::class, 'finishSession']);

        // Core Patrol Scan (QR + Selfie + Strict <=10m Geofencing)
        Route::post('/patrol/scan', [PatrolApiController::class, 'scan']);
        Route::get('/patrol/recap/checkpoints', [PatrolApiController::class, 'checkpointRecap']);

        // Checkpoints & Sites
        Route::get('/sites', [CheckpointApiController::class, 'getSites']);
        Route::post('/sites', [CheckpointApiController::class, 'storeSite']);
        Route::match(['put', 'post'], '/sites/{id}', [CheckpointApiController::class, 'updateSite']);
        Route::delete('/sites/{id}', [CheckpointApiController::class, 'destroySite']);

        Route::get('/sites/{site_id}/checkpoints', [CheckpointApiController::class, 'getCheckpointsBySite']);
        Route::post('/checkpoints', [CheckpointApiController::class, 'store']);
        Route::match(['put', 'post'], '/checkpoints/{id}', [CheckpointApiController::class, 'update']);
        Route::post('/checkpoints/{id}/regenerate-qr', [CheckpointApiController::class, 'regenerateQrToken']);
        Route::delete('/checkpoints/{id}', [CheckpointApiController::class, 'destroy']);

        // Incidents
        Route::get('/incidents', [IncidentApiController::class, 'index']);
        Route::post('/incidents', [IncidentApiController::class, 'store']);

        // Visitors
        Route::get('/visitors', [VisitorApiController::class, 'index']);
        Route::post('/visitors', [VisitorApiController::class, 'checkIn']);
        Route::post('/visitors/{id}/checkout', [VisitorApiController::class, 'checkOut']);
    });
});
