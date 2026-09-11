<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Incident;
use App\Models\PatrolLog;
use App\Models\PatrolSession;
use App\Models\Site;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        // 1. Four Top Metric Cards
        $activeGuardsCount = Attendance::whereDate('check_in_at', today())
            ->whereNull('check_out_at')
            ->count();

        $todayScansCount = PatrolLog::whereDate('scanned_at', today())->count();

        $todayIncidentsCount = Incident::whereDate('reported_at', today())->count();

        $activeVisitorsCount = Visitor::where('status', 'checked_in')->count();

        // 2. Status Patroli per Site
        $sites = Site::with(['checkpoints' => function ($q) {
            $q->where('is_active', true);
        }])->where('is_active', true)->get()->map(function ($site) {
            $totalCheckpoints = $site->checkpoints->count();

            // Total distinct checkpoints scanned today in this site
            $scannedToday = PatrolLog::whereDate('scanned_at', today())
                ->whereIn('checkpoint_id', $site->checkpoints->pluck('id'))
                ->distinct('checkpoint_id')
                ->count('checkpoint_id');

            $percentage = $totalCheckpoints > 0 ? round(($scannedToday / $totalCheckpoints) * 100) : 0;

            return [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'total_checkpoints' => $totalCheckpoints,
                'scanned_today' => $scannedToday,
                'percentage' => $percentage,
                'status' => $percentage >= 100 ? 'Lengkap' : ($percentage > 0 ? 'Sedang Berjalan' : 'Belum Mulai'),
            ];
        });

        // 3. Insiden Terbaru (Latest 5 incidents)
        $latestIncidents = Incident::with(['site', 'user', 'checkpoint'])
            ->latest('reported_at')
            ->take(5)
            ->get()
            ->map(function ($incident) {
                return [
                    'id' => $incident->id,
                    'title' => $incident->title,
                    'description' => $incident->description,
                    'severity' => $incident->severity,
                    'status' => $incident->status,
                    'site_name' => $incident->site?->name ?? '-',
                    'reporter_name' => $incident->user?->name ?? 'Petugas',
                    'reported_at' => $incident->reported_at->format('H:i, d M Y'),
                    'photo_url' => $incident->photo_path ? asset($incident->photo_path) : null,
                ];
            });

        // 4. Status Patroli per Petugas (Danru & Satpam)
        $guards = User::whereIn('role', ['danru', 'satpam'])
            ->where('is_active', true)
            ->with(['attendances' => function ($q) {
                $q->whereDate('check_in_at', today())->latest('check_in_at');
            }, 'patrolLogs' => function ($q) {
                $q->whereDate('scanned_at', today())->latest('scanned_at')->with('checkpoint.site');
            }])
            ->get()
            ->map(function ($user) {
                $attendance = $user->attendances->first();
                $lastLog = $user->patrolLogs->first();
                $scannedCount = $user->patrolLogs->count();

                // Estimated target of rounds
                $targetPoints = 6;
                $progressPercent = min(100, round(($scannedCount / $targetPoints) * 100));

                $status = 'Offline';
                if ($attendance && !$attendance->check_out_at) {
                    $status = $user->patrolSessions()->where('status', 'in_progress')->exists()
                        ? 'Patroli Aktif'
                        : 'Standby / Hadir';
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => strtoupper($user->role),
                    'badge_number' => $user->badge_number,
                    'avatar' => $user->avatar,
                    'site_name' => $lastLog?->checkpoint?->site?->name ?? 'Menara Utama',
                    'progress' => $progressPercent,
                    'scanned_count' => $scannedCount,
                    'status' => $status,
                    'last_patrol' => $lastLog ? $lastLog->scanned_at->format('H:i') . ' WIB (' . $lastLog->checkpoint->name . ')' : 'Belum ada',
                ];
            });

        // 5. Aktivitas Scan Patroli Terbaru (10 scan terakhir beserta foto selfie petugas & watermark metadata)
        $latestLogs = PatrolLog::with(['user', 'checkpoint.site', 'session'])
            ->latest('scanned_at')
            ->take(10)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'scanned_at' => $log->scanned_at->format('H:i:s'),
                    'scanned_date' => $log->scanned_at->format('d M Y'),
                    'user_name' => $log->user?->name ?? 'Petugas',
                    'user_role' => strtoupper($log->user?->role ?? 'SATPAM'),
                    'user_badge' => $log->user?->badge_number ?? '-',
                    'site_name' => $log->checkpoint?->site?->name ?? '-',
                    'checkpoint_name' => $log->checkpoint?->name ?? 'Titik Patroli',
                    'checkpoint_code' => $log->checkpoint?->code ?? '-',
                    'latitude' => $log->latitude,
                    'longitude' => $log->longitude,
                    'distance_meters' => $log->distance_meters,
                    'is_valid_location' => $log->is_valid_location,
                    'condition_status' => $log->condition_status,
                    'notes' => $log->notes,
                    'selfie_photo_url' => $log->selfie_photo_path ? asset($log->selfie_photo_path) : null,
                ];
            });

        return Inertia::render('dashboard', [
            'metrics' => [
                'active_guards' => $activeGuardsCount,
                'today_scans' => $todayScansCount,
                'today_incidents' => $todayIncidentsCount,
                'active_visitors' => $activeVisitorsCount,
            ],
            'sites_status' => $sites,
            'latest_incidents' => $latestIncidents,
            'guards_status' => $guards,
            'latest_logs' => $latestLogs,
        ]);
    }
}
