<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Site;
use App\Services\GeofenceService;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceApiController extends Controller
{
    public function __construct(
        protected GeofenceService $geofenceService,
        protected WatermarkService $watermarkService
    ) {}

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = $user->attendances()
            ->with('site')
            ->whereDate('check_in_at', today())
            ->latest('check_in_at')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'has_checked_in' => (bool)$today,
                'is_checked_out' => $today && $today->check_out_at !== null,
                'attendance' => $today,
            ],
        ]);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'site_id' => 'required|exists:sites,id',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'photo' => 'nullable', // file or base64
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $site = Site::findOrFail($request->site_id);

        // Check if already checked in today without check-out
        $existing = Attendance::where('user_id', $user->id)
            ->whereDate('check_in_at', today())
            ->whereNull('check_out_at')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah melakukan check-in hari ini.',
                'data' => $existing,
            ], 422);
        }

        // Check geofence with site if site coordinates are defined
        if ($site->latitude && $site->longitude) {
            $distance = $this->geofenceService->calculateDistance(
                (float)$request->latitude,
                (float)$request->longitude,
                (float)$site->latitude,
                (float)$site->longitude
            );

            // If radius exceeds site geofence radius (default 50m / 100m)
            $allowedRadius = $site->geofence_radius_meters ?: 100;
            if ($distance > $allowedRadius) {
                return response()->json([
                    'success' => false,
                    'message' => "Anda berada di luar radius lokasi {$site->name} ({$distance} meter, maksimal {$allowedRadius} meter).",
                    'distance_meters' => $distance,
                ], 422);
            }
        }

        $photoPath = null;
        if ($request->hasFile('photo') || $request->filled('photo')) {
            $photoPath = $this->watermarkService->watermarkAndSave(
                $request->file('photo') ?? $request->photo,
                [
                    'userName' => $user->name,
                    'userRole' => $user->role,
                    'siteName' => $site->name,
                    'checkpointName' => 'Check-in Shift Kehadiran',
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'distanceMeters' => 0,
                    'scannedAt' => now()->timezone('Asia/Jakarta')->format('d M Y, H:i:s') . ' WIB',
                ],
                'attendance_photos'
            );
        }

        $attendance = Attendance::create([
            'user_id' => $user->id,
            'site_id' => $site->id,
            'check_in_at' => now(),
            'check_in_photo' => $photoPath,
            'check_in_lat' => $request->latitude,
            'check_in_lng' => $request->longitude,
            'status' => 'present',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Check-in kehadiran berhasil dicatat.',
            'data' => $attendance->load('site'),
        ]);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $user = $request->user();

        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('check_in_at', today())
            ->whereNull('check_out_at')
            ->latest('check_in_at')
            ->first();

        if (!$attendance) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ditemukan data check-in aktif hari ini untuk di-checkout.',
            ], 404);
        }

        $attendance->update([
            'check_out_at' => now(),
            'notes' => $request->notes ?? $attendance->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Check-out kehadiran berhasil dicatat. Selamat beristirahat!',
            'data' => $attendance,
        ]);
    }
}
