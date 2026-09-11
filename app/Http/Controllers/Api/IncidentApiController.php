<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidentApiController extends Controller
{
    public function __construct(protected WatermarkService $watermarkService) {}

    public function index(Request $request): JsonResponse
    {
        $incidents = Incident::with(['site', 'user', 'checkpoint'])
            ->latest('reported_at')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $incidents,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'site_id' => 'required|exists:sites,id',
            'checkpoint_id' => 'nullable|exists:checkpoints,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'severity' => 'required|in:low,medium,high,critical',
            'photo' => 'nullable',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $user = $request->user();
        $photoPath = null;

        if ($request->hasFile('photo') || $request->filled('photo')) {
            $photoPath = $this->watermarkService->watermarkAndSave(
                $request->file('photo') ?? $request->photo,
                [
                    'userName' => $user->name,
                    'userRole' => $user->role,
                    'siteName' => 'Laporan Insiden',
                    'checkpointName' => $request->title,
                    'latitude' => $request->latitude ?? 0,
                    'longitude' => $request->longitude ?? 0,
                    'distanceMeters' => 0,
                    'scannedAt' => now()->timezone('Asia/Jakarta')->format('d M Y, H:i:s') . ' WIB',
                ],
                'incident_photos'
            );
        }

        $incident = Incident::create([
            'site_id' => $request->site_id,
            'user_id' => $user->id,
            'checkpoint_id' => $request->checkpoint_id,
            'title' => $request->title,
            'description' => $request->description,
            'severity' => $request->severity,
            'photo_path' => $photoPath,
            'status' => 'open',
            'reported_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan insiden berhasil dikirim.',
            'data' => $incident->load(['site', 'checkpoint', 'user']),
        ], 201);
    }
}
