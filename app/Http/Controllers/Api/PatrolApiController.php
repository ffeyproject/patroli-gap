<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Checkpoint;
use App\Models\PatrolLog;
use App\Models\PatrolSchedule;
use App\Models\PatrolSession;
use App\Services\GeofenceService;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatrolApiController extends Controller
{
    public function __construct(
        protected GeofenceService $geofenceService,
        protected WatermarkService $watermarkService
    ) {}

    /**
     * Get schedules assigned to the current guard.
     */
    public function mySchedules(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentTime = now()->timezone('Asia/Jakarta')->format('H:i:s');

        // Get schedules where the user is assigned or all active if admin/danru
        $query = PatrolSchedule::with(['site.checkpoints' => function ($q) {
            $q->where('is_active', true)->orderBy('order_index');
        }])->where('is_active', true);

        if (!in_array($user->role, ['superadmin', 'admin', 'danru'])) {
            $query->whereHas('users', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            });
        }

        $schedules = $query->get()->map(function ($schedule) use ($currentTime) {
            $startTime = $schedule->start_time;
            $endTime = $schedule->end_time;

            $isCurrentShift = false;
            if ($startTime && $endTime) {
                if ($startTime <= $endTime) {
                    $isCurrentShift = ($currentTime >= $startTime && $currentTime <= $endTime);
                } else {
                    // Overnight shift across midnight (e.g. 22:00 to 02:00)
                    $isCurrentShift = ($currentTime >= $startTime || $currentTime <= $endTime);
                }
            }

            // Check active in-progress session today for this schedule
            $activeSession = PatrolSession::where('patrol_schedule_id', $schedule->id)
                ->where('status', 'in_progress')
                ->latest('started_at')
                ->first();

            // Completed rounds today
            $completedRounds = PatrolSession::where('patrol_schedule_id', $schedule->id)
                ->whereDate('started_at', today())
                ->where('status', 'completed')
                ->count();

            $scheduleArray = $schedule->toArray();
            $scheduleArray['is_current_shift'] = $isCurrentShift;
            $scheduleArray['has_active_session'] = (bool)$activeSession;
            $scheduleArray['active_session_id'] = $activeSession?->id;
            $scheduleArray['active_round_number'] = $activeSession?->round_number;
            $scheduleArray['completed_rounds_count'] = $completedRounds;
            $scheduleArray['total_checkpoints'] = $schedule->site?->checkpoints?->count() ?? 0;

            return $scheduleArray;
        });

        // Sort so current shift is listed first
        $sortedSchedules = $schedules->sortByDesc(fn($s) => $s['is_current_shift'] ? 1 : 0)->values();

        return response()->json([
            'success' => true,
            'data' => $sortedSchedules,
        ]);
    }

    /**
     * Start a new patrol session / round for a scheduled shift.
     */
    public function startSession(Request $request): JsonResponse
    {
        $request->validate([
            'patrol_schedule_id' => 'nullable|exists:patrol_schedules,id',
            'round_number' => 'nullable|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $currentTime = now()->timezone('Asia/Jakarta')->format('H:i:s');

        if ($request->filled('patrol_schedule_id')) {
            $schedule = PatrolSchedule::with(['site.checkpoints' => fn($q) => $q->where('is_active', true)])->findOrFail($request->patrol_schedule_id);
        } else {
            // Auto-detect schedule for current time
            $schedulesQuery = PatrolSchedule::with(['site.checkpoints' => fn($q) => $q->where('is_active', true)])->where('is_active', true);
            if (!in_array($user->role, ['superadmin', 'admin', 'danru'])) {
                $schedulesQuery->whereHas('users', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                });
            }
            $schedules = $schedulesQuery->get();
            $schedule = $schedules->first(function ($s) use ($currentTime) {
                if ($s->start_time && $s->end_time) {
                    if ($s->start_time <= $s->end_time) {
                        return ($currentTime >= $s->start_time && $currentTime <= $s->end_time);
                    } else {
                        return ($currentTime >= $s->start_time || $currentTime <= $s->end_time);
                    }
                }
                return false;
            }) ?? $schedules->first();

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ditemukan jadwal shift aktif untuk Anda saat ini.',
                ], 404);
            }
        }

        // Security check: Verify if the guard is assigned to this schedule
        if (!in_array($user->role, ['superadmin', 'admin', 'danru'])) {
            $isAssigned = $schedule->users()->where('users.id', $user->id)->exists();
            if (!$isAssigned) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak! Anda tidak memiliki jadwal penugasan patroli pada shift ini.',
                ], 403);
            }

            // Shift Hours Validation: Ensure current time is within schedule hours
            $isWithinShiftHours = true;
            if ($schedule->start_time && $schedule->end_time) {
                if ($schedule->start_time <= $schedule->end_time) {
                    $isWithinShiftHours = ($currentTime >= $schedule->start_time && $currentTime <= $schedule->end_time);
                } else {
                    $isWithinShiftHours = ($currentTime >= $schedule->start_time || $currentTime <= $schedule->end_time);
                }
            }

            if (!$isWithinShiftHours) {
                return response()->json([
                    'success' => false,
                    'message' => "Jadwal shift {$schedule->shift_name} ({$schedule->start_time} - {$schedule->end_time} WIB) belum atau sudah tidak aktif saat ini. Anda hanya dapat memulai patroli pada jam shift yang berlaku.",
                ], 422);
            }
        }

        // 1. Check if there is already an active session in progress for this schedule
        $activeForSchedule = PatrolSession::where('patrol_schedule_id', $schedule->id)
            ->where('status', 'in_progress')
            ->first();

        if ($activeForSchedule) {
            return response()->json([
                'success' => true,
                'message' => "Sesi Patroli Round {$activeForSchedule->round_number} untuk shift {$schedule->shift_name} sedang berjalan. Silakan lanjutkan scan titik lokasi.",
                'data' => $this->formatSessionData($activeForSchedule),
            ]);
        }

        // 2. Check if user is currently in another active session
        $userActive = PatrolSession::where('user_id', $user->id)
            ->where('status', 'in_progress')
            ->first();

        if ($userActive) {
            return response()->json([
                'success' => true,
                'message' => "Anda masih memiliki Sesi Patroli Round {$userActive->round_number} yang sedang berjalan. Selesaikan sesi tersebut terlebih dahulu.",
                'data' => $this->formatSessionData($userActive),
            ]);
        }

        // 3. Calculate sequential round number for this schedule today
        $lastSession = PatrolSession::where('patrol_schedule_id', $schedule->id)
            ->whereDate('started_at', today())
            ->latest('round_number')
            ->first();

        $roundNumber = $lastSession ? ($lastSession->round_number + 1) : 1;

        $session = PatrolSession::create([
            'patrol_schedule_id' => $schedule->id,
            'site_id' => $schedule->site_id,
            'user_id' => $user->id,
            'round_number' => $roundNumber,
            'started_at' => now(),
            'status' => 'in_progress',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Sesi Patroli Round {$roundNumber} ({$schedule->shift_name}) berhasil dimulai. Silakan scan titik lokasi.",
            'data' => $this->formatSessionData($session),
        ]);
    }

    /**
     * Get the active patrol session details and checkpoint checklist.
     */
    public function activeSession(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $session = PatrolSession::with(['schedule.users', 'site.checkpoints', 'logs.checkpoint'])
            ->where('status', 'in_progress')
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if (!in_array($user->role, ['superadmin', 'admin', 'danru'])) {
                    $query->orWhereHas('schedule.users', function ($q) use ($user) {
                        $q->where('users.id', $user->id);
                    });
                } else {
                    $query->orWhereNotNull('id');
                }
            })
            ->latest('started_at')
            ->first();

        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada sesi patroli aktif saat ini.',
                'data' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatSessionData($session),
        ]);
    }

    /**
     * Scan Checkpoint QR with strict <= 10m Geofencing and Selfie Watermarking.
     */
    public function scan(Request $request): JsonResponse
    {
        $request->validate([
            'patrol_session_id' => 'required|exists:patrol_sessions,id',
            'qr_token' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'selfie_photo' => 'required', // File or base64 data string
            'condition_status' => 'nullable|in:normal,warning,danger',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $session = PatrolSession::with(['site', 'schedule.users'])->findOrFail($request->patrol_session_id);

        $isOwner = ($session->user_id === $user->id);
        $isAssignedToSchedule = $session->schedule && $session->schedule->users()->where('users.id', $user->id)->exists();
        $isPrivileged = in_array($user->role, ['superadmin', 'admin', 'danru']);

        if (!$isOwner && !$isAssignedToSchedule && !$isPrivileged) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi patroli ini bukan milik akun Anda dan Anda tidak ditugaskan pada jadwal shift ini.',
            ], 403);
        }

        if ($session->status !== 'in_progress') {
            return response()->json([
                'success' => false,
                'message' => 'Sesi patroli ini sudah selesai atau tidak aktif.',
            ], 422);
        }

        // 1. Find checkpoint by QR Token
        $checkpoint = Checkpoint::where('qr_token', $request->qr_token)
            ->where('site_id', $session->site_id)
            ->first();

        if (!$checkpoint) {
            return response()->json([
                'success' => false,
                'message' => 'QR Code tidak valid atau titik tidak terdaftar di lokasi site ini.',
            ], 404);
        }

        // 2. Sequential Checkpoint Order Validation (Titik Harus Sesuai Urutan)
        $allCheckpoints = Checkpoint::where('site_id', $session->site_id)
            ->where('is_active', true)
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();

        $scannedCheckpointIds = PatrolLog::where('patrol_session_id', $session->id)
            ->pluck('checkpoint_id')
            ->toArray();

        // Cek apakah titik ini sudah pernah discan pada sesi ronde ini
        if (in_array($checkpoint->id, $scannedCheckpointIds)) {
            return response()->json([
                'success' => false,
                'message' => "Titik [{$checkpoint->name}] sudah discan pada ronde ini. Silakan scan titik berikutnya sesuai urutan.",
            ], 422);
        }

        // Cari titik berikutnya yang wajib discan sesuai urutan (order_index)
        $nextExpectedCheckpoint = $allCheckpoints->first(function ($cp) use ($scannedCheckpointIds) {
            return !in_array($cp->id, $scannedCheckpointIds);
        });

        if ($nextExpectedCheckpoint && $nextExpectedCheckpoint->id !== $checkpoint->id && !$isPrivileged) {
            $expectedOrder = $nextExpectedCheckpoint->order_index ?? ($allCheckpoints->search(fn($c) => $c->id === $nextExpectedCheckpoint->id) + 1);
            $currentOrder = $checkpoint->order_index ?? ($allCheckpoints->search(fn($c) => $c->id === $checkpoint->id) + 1);

            return response()->json([
                'success' => false,
                'message' => "Urutan scan tidak sesuai! Anda harus scan titik ke-{$expectedOrder} [{$nextExpectedCheckpoint->name}] terlebih dahulu sebelum titik ke-{$currentOrder} [{$checkpoint->name}].",
                'expected_checkpoint' => [
                    'id' => $nextExpectedCheckpoint->id,
                    'name' => $nextExpectedCheckpoint->name,
                    'code' => $nextExpectedCheckpoint->code,
                    'order_index' => $expectedOrder,
                ],
            ], 422);
        }

        // 3. Strict Geofencing Calculation (10 Meters Max Radius)
        $distance = $this->geofenceService->calculateDistance(
            (float)$request->latitude,
            (float)$request->longitude,
            (float)$checkpoint->latitude,
            (float)$checkpoint->longitude
        );

        $maxRadius = $checkpoint->max_radius_meters ?: 10.0;

        if ($distance > $maxRadius) {
            return response()->json([
                'success' => false,
                'message' => "Posisi Anda terlalu jauh dari titik ({$distance} meter). Maksimal radius yang diizinkan adalah {$maxRadius} meter!",
                'distance_meters' => $distance,
                'max_radius_meters' => $maxRadius,
                'checkpoint_name' => $checkpoint->name,
            ], 422);
        }

        // 4. Process Selfie with Watermark
        $photoPath = $this->watermarkService->watermarkAndSave(
            $request->file('selfie_photo') ?? $request->selfie_photo,
            [
                'userName' => $user->name,
                'userRole' => $user->role,
                'siteName' => $session->site->name,
                'checkpointName' => $checkpoint->name,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'distanceMeters' => $distance,
                'maxRadiusMeters' => $maxRadius,
                'scannedAt' => now()->timezone('Asia/Jakarta')->format('d M Y, H:i:s') . ' WIB',
            ],
            'patrol_selfies'
        );

        // 5. Save Patrol Log
        $log = PatrolLog::create([
            'patrol_session_id' => $session->id,
            'checkpoint_id' => $checkpoint->id,
            'user_id' => $user->id,
            'scanned_at' => now(),
            'selfie_photo_path' => $photoPath,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'distance_meters' => $distance,
            'is_valid_location' => true,
            'condition_status' => $request->condition_status ?? 'normal',
            'notes' => $request->notes,
        ]);

        // 6. Check if all checkpoints have been scanned in this session
        $totalCheckpoints = $allCheckpoints->count();
        $newScannedCheckpointIds = array_merge($scannedCheckpointIds, [$checkpoint->id]);
        $scannedCheckpointsCount = count(array_unique($newScannedCheckpointIds));
        $isCompleted = ($scannedCheckpointsCount >= $totalCheckpoints);

        $followingCheckpoint = $allCheckpoints->first(function ($cp) use ($newScannedCheckpointIds) {
            return !in_array($cp->id, $newScannedCheckpointIds);
        });

        return response()->json([
            'success' => true,
            'message' => "Titik [{$checkpoint->name}] berhasil discan! Jarak: {$distance}m.",
            'data' => [
                'log' => $log->load('checkpoint'),
                'distance_meters' => $distance,
                'scanned_checkpoints' => $scannedCheckpointsCount,
                'total_checkpoints' => $totalCheckpoints,
                'is_all_scanned' => $isCompleted,
                'next_checkpoint' => $followingCheckpoint ? [
                    'id' => $followingCheckpoint->id,
                    'name' => $followingCheckpoint->name,
                    'code' => $followingCheckpoint->code,
                    'order_index' => $followingCheckpoint->order_index,
                ] : null,
            ],
        ]);
    }

    /**
     * Finish patrol session.
     */
    public function finishSession(Request $request): JsonResponse
    {
        $request->validate([
            'patrol_session_id' => 'required|exists:patrol_sessions,id',
            'notes' => 'nullable|string',
            'force' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $session = PatrolSession::with(['logs', 'schedule.users', 'site.checkpoints'])->findOrFail($request->patrol_session_id);

        $isOwner = ($session->user_id === $user->id);
        $isAssignedToSchedule = $session->schedule && $session->schedule->users()->where('users.id', $user->id)->exists();
        $isPrivileged = in_array($user->role, ['superadmin', 'admin', 'danru']);

        if (!$isOwner && !$isAssignedToSchedule && !$isPrivileged) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Sesi patroli bukan milik akun Anda dan Anda tidak terdaftar pada jadwal shift ini.',
            ], 403);
        }

        if ($session->status === 'completed') {
            return response()->json([
                'success' => true,
                'message' => 'Sesi patroli ini sudah selesai sebelumnya.',
                'data' => $this->formatSessionData($session),
            ]);
        }

        // Check if all active checkpoints in this site were scanned!
        $totalCheckpoints = Checkpoint::where('site_id', $session->site_id)->where('is_active', true)->count();
        $scannedCheckpoints = PatrolLog::where('patrol_session_id', $session->id)
            ->distinct('checkpoint_id')
            ->count('checkpoint_id');

        if ($scannedCheckpoints < $totalCheckpoints && !$isPrivileged && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Ronde {$session->round_number} belum selesai! Baru {$scannedCheckpoints} dari {$totalCheckpoints} titik checkpoint yang discan. Silakan scan semua titik sebelum mengakhiri ronde.",
                'data' => [
                    'scanned_count' => $scannedCheckpoints,
                    'total_checkpoints' => $totalCheckpoints,
                    'missing_count' => $totalCheckpoints - $scannedCheckpoints,
                ],
            ], 422);
        }

        $session->update([
            'completed_at' => now(),
            'status' => 'completed',
            'notes' => $request->notes ?? $session->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Sesi Patroli Round {$session->round_number} selesai ({$scannedCheckpoints}/{$totalCheckpoints} titik). Terima kasih!",
            'data' => $this->formatSessionData($session),
        ]);
    }

    /**
     * Helper to format patrol session status & checklist.
     */
    protected function formatSessionData(PatrolSession $session): array
    {
        $session->loadMissing(['site.checkpoints', 'logs.checkpoint', 'user', 'schedule']);

        $scannedCheckpointIds = $session->logs->pluck('checkpoint_id')->toArray();

        $checkpoints = $session->site->checkpoints->sortBy('order_index')->values()->map(function ($cp) use ($scannedCheckpointIds, $session) {
            $isScanned = in_array($cp->id, $scannedCheckpointIds);
            $log = $session->logs->firstWhere('checkpoint_id', $cp->id);

            return [
                'id' => $cp->id,
                'name' => $cp->name,
                'code' => $cp->code,
                'qr_token' => $cp->qr_token,
                'latitude' => $cp->latitude,
                'longitude' => $cp->longitude,
                'max_radius_meters' => $cp->max_radius_meters,
                'order_index' => $cp->order_index,
                'is_scanned' => $isScanned,
                'scanned_at' => $log ? $log->scanned_at->format('H:i:s') : null,
                'selfie_photo' => $log ? asset($log->selfie_photo_path) : null,
                'distance_meters' => $log ? $log->distance_meters : null,
            ];
        });

        $total = $checkpoints->count();
        $scannedCount = count(array_unique($scannedCheckpointIds));
        $progressPercentage = $total > 0 ? round(($scannedCount / $total) * 100) : 0;
        $nextCheckpoint = $checkpoints->firstWhere('is_scanned', false);

        return [
            'session_id' => $session->id,
            'round_number' => $session->round_number,
            'status' => $session->status,
            'started_at' => $session->started_at->format('Y-m-d H:i:s'),
            'completed_at' => $session->completed_at ? $session->completed_at->format('Y-m-d H:i:s') : null,
            'schedule' => $session->schedule ? [
                'id' => $session->schedule->id,
                'shift_name' => $session->schedule->shift_name,
                'start_time' => $session->schedule->start_time,
                'end_time' => $session->schedule->end_time,
                'min_patrol_rounds' => $session->schedule->min_patrol_rounds,
            ] : null,
            'site' => [
                'id' => $session->site->id,
                'name' => $session->site->name,
                'code' => $session->site->code,
            ],
            'user' => [
                'id' => $session->user->id,
                'name' => $session->user->name,
                'badge_number' => $session->user->badge_number,
            ],
            'progress' => [
                'total_checkpoints' => $total,
                'scanned_count' => $scannedCount,
                'percentage' => $progressPercentage,
                'is_all_scanned' => ($scannedCount >= $total),
                'next_checkpoint' => $nextCheckpoint ? [
                    'id' => $nextCheckpoint['id'],
                    'name' => $nextCheckpoint['name'],
                    'code' => $nextCheckpoint['code'],
                    'order_index' => $nextCheckpoint['order_index'],
                ] : null,
            ],
            'checkpoints' => $checkpoints,
        ];
    }

    /**
     * Get Checkpoint Patrol Recap (Statistik & Rekapitulasi per Titik Checkpoint)
     */
    public function checkpointRecap(Request $request): JsonResponse
    {
        $siteId = $request->query('site_id');
        $startDate = $request->filled('start_date') ? $request->query('start_date') : null;
        $endDate = $request->filled('end_date') ? $request->query('end_date') : null;

        $checkpointsQuery = Checkpoint::with(['site'])
            ->withCount(['logs' => function ($q) use ($startDate, $endDate) {
                if (!empty($startDate)) $q->whereDate('scanned_at', '>=', $startDate);
                if (!empty($endDate)) $q->whereDate('scanned_at', '<=', $endDate);
            }])
            ->with(['logs' => function ($q) use ($startDate, $endDate) {
                if (!empty($startDate)) $q->whereDate('scanned_at', '>=', $startDate);
                if (!empty($endDate)) $q->whereDate('scanned_at', '<=', $endDate);
                $q->with('user')->latest('scanned_at')->limit(10);
            }]);

        if ($siteId) {
            $checkpointsQuery->where('site_id', $siteId);
        }

        $checkpoints = $checkpointsQuery->orderBy('site_id')->orderBy('order_index')->get()->map(function ($cp) {
            $lastLog = $cp->logs->first();
            $avgDist = $cp->logs->avg('distance_meters');

            return [
                'id' => $cp->id,
                'name' => $cp->name,
                'code' => $cp->code,
                'site_id' => $cp->site_id,
                'site_name' => $cp->site?->name ?? '-',
                'max_radius_meters' => $cp->max_radius_meters,
                'order_index' => $cp->order_index,
                'is_active' => $cp->is_active,
                'total_scans' => $cp->logs_count,
                'avg_distance_meters' => $avgDist !== null ? round($avgDist, 1) : null,
                'last_scanned_at' => $lastLog ? $lastLog->scanned_at->timezone('Asia/Jakarta')->format('d M Y, H:i') : null,
                'last_guard_name' => $lastLog?->user?->name ?? null,
                'last_condition_status' => $lastLog?->condition_status ?? 'normal',
                'recent_logs' => $cp->logs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'scanned_at' => $log->scanned_at->timezone('Asia/Jakarta')->format('d M Y, H:i:s'),
                        'guard_name' => $log->user?->name ?? 'Petugas',
                        'guard_badge' => $log->user?->badge_number ?? '-',
                        'distance_meters' => $log->distance_meters,
                        'condition_status' => $log->condition_status,
                        'selfie_photo_url' => $log->selfie_photo_path ? asset($log->selfie_photo_path) : null,
                        'notes' => $log->notes,
                    ];
                }),
            ];
        });

        $totalCheckpoints = Checkpoint::when($siteId, fn($q) => $q->where('site_id', $siteId))->count();
        $totalScans = PatrolLog::when($siteId, function ($q) use ($siteId) {
            $q->whereHas('checkpoint', fn($cp) => $cp->where('site_id', $siteId));
        })->when($startDate, fn($q) => $q->whereDate('scanned_at', '>=', $startDate))
          ->when($endDate, fn($q) => $q->whereDate('scanned_at', '<=', $endDate))
          ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_checkpoints' => $totalCheckpoints,
                    'total_scans' => $totalScans,
                ],
                'checkpoints' => $checkpoints,
            ],
        ]);
    }
}
