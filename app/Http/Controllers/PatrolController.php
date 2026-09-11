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

        // 2. Checkpoints Recap Query
        $checkpointsQuery = Checkpoint::with(['site'])
            ->withCount(['logs' => function ($q) use ($startDate, $endDate) {
                if (!empty($startDate)) $q->whereDate('scanned_at', '>=', $startDate);
                if (!empty($endDate)) $q->whereDate('scanned_at', '<=', $endDate);
            }])
            ->with(['logs' => function ($q) use ($startDate, $endDate) {
                if (!empty($startDate)) $q->whereDate('scanned_at', '>=', $startDate);
                if (!empty($endDate)) $q->whereDate('scanned_at', '<=', $endDate);
                $q->with('user')->latest('scanned_at')->limit(15);
            }]);

        if ($siteId) {
            $checkpointsQuery->where('site_id', $siteId);
        }
        if (!empty($search)) {
            $checkpointsQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('qr_token', 'like', "%{$search}%")
                  ->orWhereHas('site', fn($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        $checkpointsRecap = $checkpointsQuery->orderBy('site_id')->orderBy('order_index')->get()->map(function ($cp) {
            $lastLog = $cp->logs->first();
            $avgDist = $cp->logs->avg('distance_meters');

            return [
                'id' => $cp->id,
                'name' => $cp->name,
                'code' => $cp->code,
                'qr_token' => $cp->qr_token,
                'site_id' => $cp->site_id,
                'site_name' => $cp->site?->name ?? '-',
                'max_radius_meters' => $cp->max_radius_meters,
                'order_index' => $cp->order_index,
                'is_active' => $cp->is_active,
                'latitude' => $cp->latitude,
                'longitude' => $cp->longitude,
                'total_scans' => $cp->logs_count,
                'avg_distance_meters' => $avgDist !== null ? round($avgDist, 1) : null,
                'last_scanned_at' => $lastLog ? $lastLog->scanned_at->timezone('Asia/Jakarta')->format('d M Y, H:i') : null,
                'last_guard_name' => $lastLog?->user?->name ?? null,
                'last_guard_badge' => $lastLog?->user?->badge_number ?? null,
                'last_condition_status' => $lastLog?->condition_status ?? 'normal',
                'recent_logs' => $cp->logs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'scanned_at' => $log->scanned_at->timezone('Asia/Jakarta')->format('d M Y, H:i:s'),
                        'guard_name' => $log->user?->name ?? 'Petugas',
                        'guard_badge' => $log->user?->badge_number ?? '-',
                        'distance_meters' => $log->distance_meters,
                        'condition_status' => $log->condition_status,
                        'selfie_photo_path' => $log->selfie_photo_path,
                        'notes' => $log->notes,
                    ];
                }),
            ];
        });

        // Summary Metrics (filtered to current scope)
        $totalCheckpoints = Checkpoint::when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->when(!empty($search), fn($q) => $q->where('name', 'like', "%{$search}%"))
            ->count();

        $totalScans = PatrolLog::when($siteId, function ($q) use ($siteId) {
            $q->whereHas('checkpoint', fn($cp) => $cp->where('site_id', $siteId));
        })->when(!empty($startDate), fn($q) => $q->whereDate('scanned_at', '>=', $startDate))
          ->when(!empty($endDate), fn($q) => $q->whereDate('scanned_at', '<=', $endDate))
          ->count();

        $avgDistance = PatrolLog::when($siteId, function ($q) use ($siteId) {
            $q->whereHas('checkpoint', fn($cp) => $cp->where('site_id', $siteId));
        })->when(!empty($startDate), fn($q) => $q->whereDate('scanned_at', '>=', $startDate))
          ->when(!empty($endDate), fn($q) => $q->whereDate('scanned_at', '<=', $endDate))
          ->avg('distance_meters');

        $sites = Site::where('is_active', true)->get(['id', 'name', 'code']);

        return Inertia::render('patrol/index', [
            'sessions' => $sessions,
            'checkpointsRecap' => $checkpointsRecap,
            'metrics' => [
                'total_checkpoints' => $totalCheckpoints,
                'total_scans' => $totalScans,
                'avg_distance' => $avgDistance !== null ? round($avgDistance, 1) : 0,
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
