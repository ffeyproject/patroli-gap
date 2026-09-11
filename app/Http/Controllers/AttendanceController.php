<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Site;
use App\Services\GeofenceService;
use App\Services\WatermarkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function __construct(
        protected GeofenceService $geofenceService,
        protected WatermarkService $watermarkService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        // Today's attendance for current logged-in user
        $myTodayAttendance = Attendance::with('site')
            ->where('user_id', $user->id)
            ->whereDate('check_in_at', today())
            ->latest('check_in_at')
            ->first();

        // All guards attendance records today
        $todayAttendances = Attendance::with(['user', 'site'])
            ->whereDate('check_in_at', today())
            ->latest('check_in_at')
            ->get()
            ->map(function ($att) {
                return [
                    'id' => $att->id,
                    'user_name' => $att->user?->name ?? 'Petugas',
                    'user_role' => strtoupper($att->user?->role ?? 'SATPAM'),
                    'user_badge' => $att->user?->badge_number ?? '-',
                    'site_name' => $att->site?->name ?? 'Menara Utama',
                    'check_in_at' => $att->check_in_at ? $att->check_in_at->format('H:i:s') : '-',
                    'check_out_at' => $att->check_out_at ? $att->check_out_at->format('H:i:s') : null,
                    'status' => $att->status,
                    'notes' => $att->notes,
                    'check_in_lat' => $att->check_in_lat,
                    'check_in_lng' => $att->check_in_lng,
                    'photo_url' => $att->check_in_photo ? asset($att->check_in_photo) : null,
                ];
            });

        $sites = Site::where('is_active', true)->get();

        return Inertia::render('attendance/index', [
            'my_attendance' => $myTodayAttendance ? [
                'id' => $myTodayAttendance->id,
                'site_id' => $myTodayAttendance->site_id,
                'site_name' => $myTodayAttendance->site?->name ?? '-',
                'check_in_at' => $myTodayAttendance->check_in_at->format('H:i:s'),
                'check_out_at' => $myTodayAttendance->check_out_at ? $myTodayAttendance->check_out_at->format('H:i:s') : null,
                'status' => $myTodayAttendance->status,
                'photo_url' => $myTodayAttendance->check_in_photo ? asset($myTodayAttendance->check_in_photo) : null,
            ] : null,
            'today_attendances' => $todayAttendances,
            'sites' => $sites,
        ]);
    }

    public function checkIn(Request $request): RedirectResponse
    {
        $request->validate([
            'site_id' => 'required|exists:sites,id',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'photo' => 'nullable',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $site = Site::findOrFail($request->site_id);

        $lat = $request->latitude ?? $site->latitude ?? -6.2297465;
        $lng = $request->longitude ?? $site->longitude ?? 106.8295180;

        $photoPath = null;
        if ($request->hasFile('photo') || $request->filled('photo')) {
            $photoPath = $this->watermarkService->watermarkAndSave(
                $request->file('photo') ?? $request->photo,
                [
                    'userName' => $user->name,
                    'userRole' => $user->role,
                    'siteName' => $site->name,
                    'checkpointName' => 'Check-in Shift Kehadiran',
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'distanceMeters' => 0,
                    'scannedAt' => now()->timezone('Asia/Jakarta')->format('d M Y, H:i:s') . ' WIB',
                ],
                'attendance_photos'
            );
        } else {
            // Generate standard watermarked attendance badge photo
            $photoPath = $this->watermarkService->watermarkAndSave(
                null,
                [
                    'userName' => $user->name,
                    'userRole' => $user->role,
                    'siteName' => $site->name,
                    'checkpointName' => 'Presensi Masuk Shift',
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'distanceMeters' => 0,
                    'scannedAt' => now()->timezone('Asia/Jakarta')->format('d M Y, H:i:s') . ' WIB',
                ],
                'attendance_photos'
            );
        }

        Attendance::create([
            'user_id' => $user->id,
            'site_id' => $site->id,
            'check_in_at' => now(),
            'check_in_photo' => $photoPath,
            'check_in_lat' => $lat,
            'check_in_lng' => $lng,
            'status' => 'present',
            'notes' => $request->notes ?? 'Hadir bertugas',
        ]);

        return back()->with('success', 'Check-in kehadiran shift berhasil dicatat!');
    }

    public function checkOut(Request $request): RedirectResponse
    {
        $user = $request->user();

        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('check_in_at', today())
            ->whereNull('check_out_at')
            ->latest('check_in_at')
            ->first();

        if ($attendance) {
            $attendance->update([
                'check_out_at' => now(),
            ]);
        }

        return back()->with('success', 'Check-out berhasil dicatat. Selamat beristirahat!');
    }
}
