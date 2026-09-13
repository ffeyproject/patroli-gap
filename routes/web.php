<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IncidentController;
use App\Http\Controllers\LiveMapController;
use App\Http\Controllers\PatrolController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\SiteCheckpointController;
use App\Http\Controllers\UserScheduleController;
use App\Http\Controllers\VisitorController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth'])->group(function () {
    // 1. Ringkasan (Dashboard)
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // 2. Presensi & Check-in Shift Satpam
    Route::get('/presensi', [AttendanceController::class, 'index'])->name('attendance.index');
    Route::post('/presensi/check-in', [AttendanceController::class, 'checkIn'])->name('attendance.checkin');
    Route::post('/presensi/check-out', [AttendanceController::class, 'checkOut'])->name('attendance.checkout');

    // 3. Peta Live & Monitoring Satpam
    Route::get('/peta-live', [LiveMapController::class, 'index'])->name('peta.live');
    Route::get('/peta-live/data', [LiveMapController::class, 'liveData'])->name('peta.live.data');

    // 4. Patroli
    Route::get('/patroli', [PatrolController::class, 'index'])->name('patroli.index');
    Route::get('/patroli/{id}', [PatrolController::class, 'show'])->name('patroli.show');

    // 5. Insiden
    Route::get('/insiden', [IncidentController::class, 'index'])->name('insiden.index');
    Route::post('/insiden/{id}/status', [IncidentController::class, 'updateStatus'])->name('insiden.status');

    // 6. Buku Tamu
    Route::get('/buku-tamu', [VisitorController::class, 'index'])->name('visitors.index');
    Route::post('/buku-tamu/{id}/checkout', [VisitorController::class, 'checkOut'])->name('visitors.checkout');

    // 7. Site & Checkpoint
    Route::get('/sites', [SiteCheckpointController::class, 'index'])->name('sites.index');
    Route::post('/sites/store', [SiteCheckpointController::class, 'storeSite'])->name('sites.store');
    Route::post('/sites/{id}/update', [SiteCheckpointController::class, 'updateSite'])->name('sites.update');
    Route::delete('/sites/{id}', [SiteCheckpointController::class, 'destroySite'])->name('sites.destroy');
    Route::post('/checkpoints/store', [SiteCheckpointController::class, 'storeCheckpoint'])->name('checkpoints.store');
    Route::post('/checkpoints/{id}', [SiteCheckpointController::class, 'updateCheckpoint'])->name('checkpoints.update');
    Route::post('/checkpoints/{id}/regenerate-qr', [SiteCheckpointController::class, 'regenerateQrToken'])->name('checkpoints.regenerateQr');
    Route::delete('/checkpoints/{id}', [SiteCheckpointController::class, 'destroyCheckpoint'])->name('checkpoints.destroy');

    // 8. Kelola User & Jadwal
    Route::get('/users', [UserScheduleController::class, 'index'])->name('users.index');
    Route::post('/users/store', [UserScheduleController::class, 'storeUser'])->name('users.store');
    Route::post('/users/{id}/update', [UserScheduleController::class, 'updateUser'])->name('users.update');
    Route::delete('/users/{id}', [UserScheduleController::class, 'destroyUser'])->name('users.destroy');
    Route::post('/schedules/store', [UserScheduleController::class, 'storeSchedule'])->name('schedules.store');
    Route::post('/schedules/{id}/update', [UserScheduleController::class, 'updateSchedule'])->name('schedules.update');
    Route::delete('/schedules/{id}', [UserScheduleController::class, 'destroySchedule'])->name('schedules.destroy');

    // 9. Kelola Role & Hak Akses (Spatie Route-Based Permissions)
    Route::get('/roles-permissions', [RolePermissionController::class, 'index'])->name('roles.index');
    Route::post('/roles-permissions/sync', [RolePermissionController::class, 'syncRoutes'])->name('roles.sync');
    Route::post('/roles-permissions/store', [RolePermissionController::class, 'storeRole'])->name('roles.store');
    Route::post('/roles-permissions/{id}/permissions', [RolePermissionController::class, 'updateRolePermissions'])->name('roles.permissions.update');
    Route::post('/roles-permissions/assign', [RolePermissionController::class, 'assignUserRole'])->name('roles.assign');
    Route::delete('/roles-permissions/{id}', [RolePermissionController::class, 'destroyRole'])->name('roles.destroy');
});

require __DIR__.'/settings.php';
