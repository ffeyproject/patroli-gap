<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Checkpoint;
use App\Models\PatrolLog;
use App\Models\PatrolSession;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class LiveMapController extends Controller
{
    public function index(Request $request): Response
    {
        $data = $this->getLiveTrackingData();

        return Inertia::render('map/index', $data);
    }

    /**
     * API / AJAX endpoint for real-time live polling of active guards.
     */
    public function liveData(Request $request): JsonResponse
    {
        $data = $this->getLiveTrackingData();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Mobile API endpoint for continuous live GPS location tracking ping.
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'heading' => 'nullable|numeric',
            'speed' => 'nullable|numeric',
            'accuracy' => 'nullable|numeric',
        ]);

        $user = $request->user();
        $cacheKey = "guard_live_loc_{$user->id}";

        Cache::put($cacheKey, [
            'latitude' => (float)$request->latitude,
            'longitude' => (float)$request->longitude,
            'heading' => $request->heading ? (float)$request->heading : null,
            'speed' => $request->speed ? (float)$request->speed : null,
            'accuracy' => $request->accuracy ? (float)$request->accuracy : null,
            'updated_at' => now()->timezone('Asia/Jakarta')->format('Y-m-d H:i:s'),
        ], now()->addHours(12));

        return response()->json([
            'success' => true,
            'message' => 'Koordinat GPS live berhasil diperbarui.',
            'data' => [
                'user_id' => $user->id,
                'latitude' => (float)$request->latitude,
                'longitude' => (float)$request->longitude,
                'updated_at' => now()->timezone('Asia/Jakarta')->format('H:i:s') . ' WIB',
            ],
        ]);
    }

    protected function getLiveTrackingData(): array
    {
        $sites = Site::with(['checkpoints' => function ($q) {
            $q->where('is_active', true)->orderBy('order_index');
        }])->where('is_active', true)->get();

        // All guards who have checked in today and haven't checked out yet
        $activeAttendances = Attendance::with(['user', 'site'])
            ->whereDate('check_in_at', today())
            ->whereNull('check_out_at')
            ->get();

        $activeGuards = $activeAttendances->map(function ($att) {
            $user = $att->user;
            if (!$user) return null;

            // Get user's latest patrol log today
            $lastLog = PatrolLog::with('checkpoint.site')
                ->where('user_id', $user->id)
                ->whereDate('scanned_at', today())
                ->latest('scanned_at')
                ->first();

            // Get user's active session
            $activeSession = PatrolSession::where('user_id', $user->id)
                ->where('status', 'in_progress')
                ->latest('started_at')
                ->first();

            $statusText = 'Standby di Pos';
            if ($activeSession) {
                $statusText = "Patroli Aktif (Round {$activeSession->round_number})";
            } elseif ($lastLog) {
                $statusText = 'Patroli Selesai (Standby)';
            }

            // Check if there is a live GPS ping from mobile
            $liveLoc = Cache::get("guard_live_loc_{$user->id}");

            if ($liveLoc && !empty($liveLoc['latitude']) && !empty($liveLoc['longitude'])) {
                $currentLat = (float)$liveLoc['latitude'];
                $currentLng = (float)$liveLoc['longitude'];
            } else {
                $currentLat = $lastLog ? (float)$lastLog->latitude : ($att->check_in_lat ? (float)$att->check_in_lat : (float)($att->site?->latitude ?? -6.2297465));
                $currentLng = $lastLog ? (float)$lastLog->longitude : ($att->check_in_lng ? (float)$att->check_in_lng : (float)($att->site?->longitude ?? 106.8295180));
            }

            return [
                'id' => $user->id,
                'name' => $user->name,
                'role' => strtoupper($user->role),
                'badge_number' => $user->badge_number ?? 'SEC-00',
                'phone' => $user->phone ?? '-',
                'site_id' => $att->site_id,
                'site_name' => $att->site?->name ?? 'Gedung Menara Utama',
                'site_code' => $att->site?->code ?? 'SITE-01',
                'check_in_at' => $att->check_in_at->format('H:i:s'),
                'status' => $statusText,
                'latitude' => $currentLat,
                'longitude' => $currentLng,
                'last_checkpoint_name' => $lastLog?->checkpoint?->name ?? 'Check-in Shift',
                'last_scanned_at' => $lastLog ? $lastLog->scanned_at->format('H:i:s') . ' WIB' : 'Baru Check-in',
                'last_distance_meters' => $lastLog?->distance_meters ?? 0,
                'last_selfie_url' => $lastLog?->selfie_photo_path ? asset($lastLog->selfie_photo_path) : ($att->check_in_photo ? asset($att->check_in_photo) : null),
                'is_in_patrol' => (bool)$activeSession,
                'live_updated_at' => $liveLoc['updated_at'] ?? null,
            ];
        })->filter()->values();

        // Recent 15 scan logs across all guards
        $recentLogs = PatrolLog::with(['checkpoint.site', 'user'])
            ->whereDate('scanned_at', today())
            ->latest('scanned_at')
            ->take(15)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user_name' => $log->user?->name ?? 'Petugas',
                    'user_badge' => $log->user?->badge_number ?? '-',
                    'site_name' => $log->checkpoint?->site?->name ?? '-',
                    'checkpoint_name' => $log->checkpoint?->name ?? '-',
                    'scanned_at' => $log->scanned_at->format('H:i:s') . ' WIB',
                    'distance_meters' => $log->distance_meters,
                    'condition_status' => $log->condition_status,
                    'selfie_url' => $log->selfie_photo_path ? asset($log->selfie_photo_path) : null,
                ];
            });

        return [
            'sites' => $sites,
            'active_guards' => $activeGuards,
            'recent_logs' => $recentLogs,
            'total_guards_present' => $activeGuards->count(),
            'total_in_patrol' => $activeGuards->where('is_in_patrol', true)->count(),
        ];
    }
}
