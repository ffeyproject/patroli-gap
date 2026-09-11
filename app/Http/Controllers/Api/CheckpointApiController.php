<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Checkpoint;
use App\Models\Site;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CheckpointApiController extends Controller
{
    public function __construct(protected QrCodeService $qrCodeService) {}

    /**
     * Get all sites with their checkpoints.
     */
    public function getSites(): JsonResponse
    {
        $sites = Site::with(['checkpoints' => function ($q) {
            $q->orderBy('order_index');
        }])->get()->map(function ($site) {
            return [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'address' => $site->address,
                'latitude' => $site->latitude,
                'longitude' => $site->longitude,
                'geofence_radius_meters' => $site->geofence_radius_meters,
                'is_active' => $site->is_active,
                'checkpoints_count' => $site->checkpoints->count(),
                'checkpoints' => $site->checkpoints->map(function ($cp) {
                    return [
                        'id' => $cp->id,
                        'site_id' => $cp->site_id,
                        'name' => $cp->name,
                        'code' => $cp->code,
                        'qr_token' => $cp->qr_token,
                        'qr_image_url' => $this->qrCodeService->getQrImageUrl($cp->qr_token),
                        'location_description' => $cp->location_description,
                        'latitude' => $cp->latitude,
                        'longitude' => $cp->longitude,
                        'max_radius_meters' => $cp->max_radius_meters,
                        'order_index' => $cp->order_index,
                        'is_active' => $cp->is_active,
                    ];
                }),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $sites,
        ]);
    }

    /**
     * Store a new Site (Add Gedung / Lokasi baru).
     */
    public function storeSite(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:sites,code',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'geofence_radius_meters' => 'nullable|integer|min:10',
        ]);

        $validated['geofence_radius_meters'] = $validated['geofence_radius_meters'] ?? 50;
        $validated['is_active'] = true;

        $site = Site::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Site / Lokasi baru berhasil ditambahkan.',
            'data' => $site,
        ], 201);
    }

    /**
     * Update Site.
     */
    public function updateSite(Request $request, int $id): JsonResponse
    {
        $site = Site::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:sites,code,' . $site->id,
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'geofence_radius_meters' => 'nullable|integer|min:10',
            'is_active' => 'nullable|boolean',
        ]);

        $site->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data Site / Lokasi berhasil diperbarui.',
            'data' => $site,
        ]);
    }

    /**
     * Delete Site.
     */
    public function destroySite(int $id): JsonResponse
    {
        $site = Site::findOrFail($id);
        $site->delete();

        return response()->json([
            'success' => true,
            'message' => 'Site / Lokasi berhasil dihapus.',
        ]);
    }

    /**
     * Get checkpoints for a specific site.
     */
    public function getCheckpointsBySite(int $siteId): JsonResponse
    {
        $site = Site::with(['checkpoints' => function ($q) {
            $q->orderBy('order_index');
        }])->findOrFail($siteId);

        $checkpoints = $site->checkpoints->map(function ($cp) {
            return [
                'id' => $cp->id,
                'site_id' => $cp->site_id,
                'name' => $cp->name,
                'code' => $cp->code,
                'qr_token' => $cp->qr_token,
                'qr_image_url' => $this->qrCodeService->getQrImageUrl($cp->qr_token),
                'location_description' => $cp->location_description,
                'latitude' => $cp->latitude,
                'longitude' => $cp->longitude,
                'max_radius_meters' => $cp->max_radius_meters,
                'order_index' => $cp->order_index,
                'is_active' => $cp->is_active,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'site' => $site,
                'checkpoints' => $checkpoints,
            ],
        ]);
    }

    /**
     * Store a new patrol checkpoint (Add titik patroli baru).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'site_id' => 'required|exists:sites,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'location_description' => 'nullable|string',
            'max_radius_meters' => 'nullable|integer|min:1',
            'order_index' => 'nullable|integer',
        ]);

        $qrToken = 'CP-' . strtoupper(Str::random(12));

        $checkpoint = Checkpoint::create([
            'site_id' => $request->site_id,
            'name' => $request->name,
            'code' => $request->code,
            'qr_token' => $qrToken,
            'location_description' => $request->location_description,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'max_radius_meters' => $request->max_radius_meters ?? 10,
            'order_index' => $request->order_index ?? 0,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Titik lokasi patroli baru berhasil ditambahkan.',
            'data' => [
                'checkpoint' => $checkpoint,
                'qr_image_url' => $this->qrCodeService->getQrImageUrl($checkpoint->qr_token),
            ],
        ], 201);
    }

    /**
     * Update checkpoint.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $checkpoint = Checkpoint::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50',
            'latitude' => 'sometimes|required|numeric',
            'longitude' => 'sometimes|required|numeric',
            'location_description' => 'nullable|string',
            'max_radius_meters' => 'nullable|integer|min:1',
            'order_index' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'regenerate_qr' => 'nullable|boolean',
            'qr_token' => 'nullable|string|max:100',
        ]);

        $data = $request->only([
            'name', 'code', 'latitude', 'longitude',
            'location_description', 'max_radius_meters', 'order_index', 'is_active'
        ]);

        if ($request->boolean('regenerate_qr')) {
            $data['qr_token'] = 'CP-' . strtoupper(Str::random(12));
        } elseif ($request->filled('qr_token')) {
            $data['qr_token'] = $request->input('qr_token');
        }

        $checkpoint->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Titik lokasi patroli berhasil diperbarui.',
            'data' => [
                'checkpoint' => $checkpoint,
                'qr_image_url' => $this->qrCodeService->getQrImageUrl($checkpoint->qr_token),
            ],
        ]);
    }

    /**
     * Dedicated Endpoint to Regenerate Checkpoint QR Token
     */
    public function regenerateQrToken(int $id): JsonResponse
    {
        $checkpoint = Checkpoint::findOrFail($id);
        $newToken = 'CP-' . strtoupper(Str::random(12));
        $checkpoint->update(['qr_token' => $newToken]);

        return response()->json([
            'success' => true,
            'message' => 'QR Token baru berhasil di-generate.',
            'data' => [
                'checkpoint' => $checkpoint,
                'qr_token' => $newToken,
                'qr_image_url' => $this->qrCodeService->getQrImageUrl($newToken),
            ],
        ]);
    }

    /**
     * Delete checkpoint.
     */
    public function destroy(int $id): JsonResponse
    {
        $checkpoint = Checkpoint::findOrFail($id);
        $checkpoint->delete();

        return response()->json([
            'success' => true,
            'message' => 'Titik lokasi patroli berhasil dihapus.',
        ]);
    }
}
