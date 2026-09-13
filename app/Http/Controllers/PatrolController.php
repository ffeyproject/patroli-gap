<?php

namespace App\Http\Controllers;

use App\Models\Checkpoint;
use App\Models\PatrolLog;
use App\Models\PatrolSchedule;
use App\Models\PatrolSession;
use App\Models\Site;
use App\Services\GeofenceService;
use App\Services\WatermarkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatrolController extends Controller
{
    public function __construct(
        protected GeofenceService $geofenceService,
        protected WatermarkService $watermarkService
    ) {}

    public function index(Request $request): Response
    {
        $siteId = $request->query('site_id');
        $today = now()->timezone('Asia/Jakarta')->toDateString();

        // Default to today if no date filter is provided
        $startDate = $request->has('start_date') ? $request->query('start_date') : $today;
        $endDate = $request->has('end_date') ? $request->query('end_date') : $today;
        $search = $request->query('search');
        $activeTab = $request->query('tab', 'sessions');

        // 1. Sessions Query
        $sessionsQuery = PatrolSession::with(['schedule', 'site', 'user', 'logs.checkpoint'])
            ->latest('started_at');

        if ($siteId) {
            $sessionsQuery->where('site_id', $siteId);
        }
        if (!empty($startDate)) {
            $sessionsQuery->whereDate('started_at', '>=', $startDate);
        }
        if (!empty($endDate)) {
            $sessionsQuery->whereDate('started_at', '<=', $endDate);
        }
        if (!empty($search)) {
            $sessionsQuery->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%")
                       ->orWhere('badge_number', 'like', "%{$search}%");
                })->orWhereHas('site', function ($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%")
                       ->orWhere('code', 'like', "%{$search}%");
                })->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('logs.checkpoint', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $sessions = $sessionsQuery->paginate(15)->withQueryString();

        // 2. Checkpoints Recap Query with Complete Audit Data
        $checkpointsQuery = Checkpoint::with(['site'])
            ->withCount(['logs' => function ($q) use ($startDate, $endDate) {
                if (!empty($startDate)) $q->whereDate('scanned_at', '>=', $startDate);
                if (!empty($endDate)) $q->whereDate('scanned_at', '<=', $endDate);
            }])
            ->with(['logs' => function ($q) use ($startDate, $endDate) {
                if (!empty($startDate)) $q->whereDate('scanned_at', '>=', $startDate);
                if (!empty($endDate)) $q->whereDate('scanned_at', '<=', $endDate);
                $q->with(['user', 'session'])->latest('scanned_at')->limit(100);
            }]);

        if ($siteId) {
            $checkpointsQuery->where('site_id', $siteId);
        }
        if (!empty($search)) {
            $checkpointsQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('qr_token', 'like', "%{$search}%")
                  ->orWhere('location_description', 'like', "%{$search}%")
                  ->orWhereHas('site', fn($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        $checkpointsRecap = $checkpointsQuery->orderBy('site_id')->orderBy('order_index')->get()->map(function ($cp) {
            $lastLog = $cp->logs->first();
            $avgDist = $cp->logs->avg('distance_meters');
            $minDist = $cp->logs->min('distance_meters');
            $maxDist = $cp->logs->max('distance_meters');

            $normalScans = $cp->logs->where('condition_status', 'normal')->count();
            $abnormalScans = $cp->logs->where('condition_status', '!=', 'normal')->count();
            $validLocScans = $cp->logs->filter(fn($l) => $l->distance_meters <= $cp->max_radius_meters)->count();
            $invalidLocScans = $cp->logs->filter(fn($l) => $l->distance_meters > $cp->max_radius_meters)->count();

            $uniqueGuards = $cp->logs->map(function ($l) {
                return [
                    'name' => $l->user?->name ?? 'Petugas',
                    'badge' => $l->user?->badge_number ?? '-',
                ];
            })->unique('name')->values()->all();

            $statusCompliance = 'not_scanned';
            if ($cp->logs_count > 0) {
                $statusCompliance = $abnormalScans > 0 ? 'scanned_with_issue' : 'scanned_normal';
            }

            return [
                'id' => $cp->id,
                'name' => $cp->name,
                'code' => $cp->code,
                'qr_token' => $cp->qr_token,
                'location_description' => $cp->location_description ?? '',
                'site_id' => $cp->site_id,
                'site_name' => $cp->site?->name ?? '-',
                'site_code' => $cp->site?->code ?? '-',
                'max_radius_meters' => $cp->max_radius_meters,
                'order_index' => $cp->order_index,
                'is_active' => (bool)$cp->is_active,
                'latitude' => $cp->latitude,
                'longitude' => $cp->longitude,
                'total_scans' => $cp->logs_count,
                'normal_scans' => $normalScans,
                'abnormal_scans' => $abnormalScans,
                'valid_location_scans' => $validLocScans,
                'invalid_location_scans' => $invalidLocScans,
                'avg_distance_meters' => $avgDist !== null ? round((float)$avgDist, 1) : null,
                'min_distance_meters' => $minDist !== null ? round((float)$minDist, 1) : null,
                'max_distance_meters' => $maxDist !== null ? round((float)$maxDist, 1) : null,
                'unique_guards' => $uniqueGuards,
                'status_compliance' => $statusCompliance,
                'last_scanned_at' => $lastLog ? $lastLog->scanned_at->timezone('Asia/Jakarta')->format('d M Y, H:i') : null,
                'last_scanned_at_iso' => $lastLog ? $lastLog->scanned_at->toISOString() : null,
                'last_guard_name' => $lastLog?->user?->name ?? null,
                'last_guard_badge' => $lastLog?->user?->badge_number ?? null,
                'last_condition_status' => $lastLog?->condition_status ?? 'normal',
                'last_notes' => $lastLog?->notes ?? null,
                'last_distance_meters' => $lastLog ? round((float)$lastLog->distance_meters, 1) : null,
                'recent_logs' => $cp->logs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'session_id' => $log->patrol_session_id,
                        'round_number' => $log->session?->round_number ?? 1,
                        'scanned_at' => $log->scanned_at->timezone('Asia/Jakarta')->format('d M Y, H:i:s'),
                        'scanned_at_iso' => $log->scanned_at->toISOString(),
                        'guard_name' => $log->user?->name ?? 'Petugas',
                        'guard_badge' => $log->user?->badge_number ?? '-',
                        'latitude' => $log->latitude,
                        'longitude' => $log->longitude,
                        'distance_meters' => round((float)$log->distance_meters, 1),
                        'is_valid_location' => (bool)$log->is_valid_location,
                        'condition_status' => $log->condition_status ?? 'normal',
                        'selfie_photo_path' => $log->selfie_photo_path,
                        'notes' => $log->notes,
                    ];
                })->values()->all(),
            ];
        });

        // Summary Metrics (filtered to current scope)
        $totalCheckpoints = Checkpoint::when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->when(!empty($search), fn($q) => $q->where('name', 'like', "%{$search}%"))
            ->count();

        $coveredCheckpoints = $checkpointsRecap->where('total_scans', '>', 0)->count();
        $missedCheckpoints = max(0, $totalCheckpoints - $coveredCheckpoints);
        $coveragePercentage = $totalCheckpoints > 0 ? round(($coveredCheckpoints / $totalCheckpoints) * 100, 1) : 0;

        $logsQuery = PatrolLog::when($siteId, function ($q) use ($siteId) {
            $q->whereHas('checkpoint', fn($cp) => $cp->where('site_id', $siteId));
        })->when(!empty($startDate), fn($q) => $q->whereDate('scanned_at', '>=', $startDate))
          ->when(!empty($endDate), fn($q) => $q->whereDate('scanned_at', '<=', $endDate));

        $totalScans = (clone $logsQuery)->count();
        $avgDistance = (clone $logsQuery)->avg('distance_meters');
        $totalAnomalies = (clone $logsQuery)->where('condition_status', '!=', 'normal')->count();
        $totalOutOfRadius = (clone $logsQuery)->where('is_valid_location', false)->count();

        $sites = Site::where('is_active', true)->get(['id', 'name', 'code']);

        return Inertia::render('patrol/index', [
            'sessions' => $sessions,
            'checkpointsRecap' => $checkpointsRecap,
            'metrics' => [
                'total_checkpoints' => $totalCheckpoints,
                'covered_checkpoints' => $coveredCheckpoints,
                'missed_checkpoints' => $missedCheckpoints,
                'coverage_percentage' => $coveragePercentage,
                'total_scans' => $totalScans,
                'avg_distance' => $avgDistance !== null ? round((float)$avgDistance, 1) : 0,
                'total_anomalies' => $totalAnomalies,
                'total_out_of_radius' => $totalOutOfRadius,
            ],
            'sites' => $sites,
            'filters' => [
                'site_id' => $siteId ? (int)$siteId : '',
                'start_date' => $startDate ?? '',
                'end_date' => $endDate ?? '',
                'search' => $search ?? '',
                'tab' => $activeTab,
                'is_today' => ($startDate === $today && $endDate === $today),
            ],
        ]);
    }

    public function show(int $id): Response
    {
        $session = PatrolSession::with(['schedule', 'site.checkpoints', 'user', 'logs.checkpoint'])
            ->findOrFail($id);

        return Inertia::render('patrol/show', [
            'session' => $session,
        ]);
    }
}
