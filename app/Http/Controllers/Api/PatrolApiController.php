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

        // Get schedules where the user is assigned or all active if admin/danru
        $query = PatrolSchedule::with(['site.checkpoints' => function ($q) {
            $q->where('is_active', true)->orderBy('order_index');
        }])->where('is_active', true);

        if (!in_array($user->role, ['superadmin', 'admin', 'danru'])) {
            $query->whereHas('users', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            });
        }

        $schedules = $query->get();

        return response()->json([
            'success' => true,
            'data' => $schedules,
        ]);
    }

    /**
     * Start a new patrol session / round for a scheduled shift.
     */
    public function startSession(Request $request): JsonResponse
    {
        $request->validate([
            'patrol_schedule_id' => 'required|exists:patrol_schedules,id',
            'round_number' => 'nullable|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $schedule = PatrolSchedule::with('site.checkpoints')->findOrFail($request->patrol_schedule_id);

        // Security check: Verify if the guard is assigned to this schedule
        if (!in_array($user->role, ['superadmin', 'admin', 'danru'])) {
            $isAssigned = $schedule->users()->where('users.id', $user->id)->exists();
            if (!$isAssigned) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak! Anda tidak memiliki jadwal penugasan patroli pada shift ini.',
                ], 403);
            }
        }

        // Check if there is already an active session in progress for this user
        $active = PatrolSession::where('user_id', $user->id)
            ->where('status', 'in_progress')
            ->first();

        if ($active) {
            return response()->json([
                'success' => true,
                'message' => 'Anda sudah memiliki sesi patroli yang sedang berjalan.',
                'data' => $this->formatSessionData($active),
            ]);
        }

        // Calculate next round number
        $lastSession = PatrolSession::where('patrol_schedule_id', $schedule->id)
            ->where('user_id', $user->id)
            ->whereDate('started_at', today())
            ->latest('round_number')
            ->first();

        $roundNumber = $request->round_number ?? ($lastSession ? $lastSession->round_number + 1 : 1);

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
            'message' => "Sesi Patroli Round {$roundNumber} berhasil dimulai. Silakan scan titik lokasi.",
            'data' => $this->formatSessionData($session),
        ]);
    }

    /**
     * Get the active patrol session details and checkpoint checklist.
     */
    public function activeSession(Request $request): JsonResponse
    {
        $user = $request->user();
        $session = PatrolSession::with(['schedule', 'site.checkpoints', 'logs.checkpoint'])
            ->where('user_id', $user->id)
            ->where('status', 'in_progress')
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
        $session = PatrolSession::with(['site', 'schedule'])->findOrFail($request->patrol_session_id);

        if ($session->user_id !== $user->id && !in_array($user->role, ['superadmin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi patroli ini bukan milik akun Anda.',
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

        // 2. Strict Geofencing Calculation (10 Meters Max Radius)
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

        // 3. Process Selfie with Watermark
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

        // 4. Save Patrol Log
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

        // 5. Check if all checkpoints have been scanned in this session
        $totalCheckpoints = Checkpoint::where('site_id', $session->site_id)->where('is_active', true)->count();
        $scannedCheckpoints = PatrolLog::where('patrol_session_id', $session->id)
            ->distinct('checkpoint_id')
            ->count('checkpoint_id');

        $isCompleted = ($scannedCheckpoints >= $totalCheckpoints);

        return response()->json([
            'success' => true,
            'message' => "Titik [{$checkpoint->name}] berhasil discan! Jarak: {$distance}m.",
            'data' => [
                'log' => $log->load('checkpoint'),
                'distance_meters' => $distance,
                'scanned_checkpoints' => $scannedCheckpoints,
                'total_checkpoints' => $totalCheckpoints,
                'is_all_scanned' => $isCompleted,
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
        ]);

        $user = $request->user();
        $session = PatrolSession::with('logs')->findOrFail($request->patrol_session_id);

        if ($session->user_id !== $user->id && !in_array($user->role, ['superadmin', 'admin'])) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $session->update([
            'completed_at' => now(),
            'status' => 'completed',
            'notes' => $request->notes ?? $session->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sesi patroli selesai. Terima kasih atas tugasnya!',
            'data' => $session,
        ]);
    }

    /**
     * Helper to format patrol session status & checklist.
     */
    protected function formatSessionData(PatrolSession $session): array
    {
        $session->loadMissing(['site.checkpoints', 'logs.checkpoint', 'user']);

        $scannedCheckpointIds = $session->logs->pluck('checkpoint_id')->toArray();

        $checkpoints = $session->site->checkpoints->map(function ($cp) use ($scannedCheckpointIds, $session) {
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

        return [
            'session_id' => $session->id,
            'round_number' => $session->round_number,
            'status' => $session->status,
            'started_at' => $session->started_at->format('Y-m-d H:i:s'),
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
        $today = now()->timezone('Asia/Jakarta')->toDateString();
        $startDate = $request->has('start_date') ? $request->query('start_date') : $today;
        $endDate = $request->has('end_date') ? $request->query('end_date') : $today;

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
