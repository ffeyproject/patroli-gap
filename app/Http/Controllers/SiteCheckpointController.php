<?php

namespace App\Http\Controllers;

use App\Models\Checkpoint;
use App\Models\Site;
use App\Services\QrCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SiteCheckpointController extends Controller
{
    public function __construct(protected QrCodeService $qrCodeService) {}

    public function index(): Response
    {
        $sites = Site::with(['checkpoints' => function ($q) {
            $q->orderBy('order_index');
        }])->get()->map(function (Site $site) {
            return [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'address' => $site->address,
                'latitude' => $site->latitude,
                'longitude' => $site->longitude,
                'geofence_radius_meters' => $site->geofence_radius_meters,
                'is_active' => $site->is_active,
                'checkpoints' => $site->checkpoints->map(function (Checkpoint $cp) {
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

        return Inertia::render('sites/index', [
            'sites' => $sites,
        ]);
    }

    public function storeSite(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:sites,code',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'geofence_radius_meters' => 'nullable|integer|min:10|max:900',
        ]);

        Site::create($validated);

        return back()->with('success', 'Site/Lokasi baru berhasil ditambahkan.');
    }

    public function updateSite(Request $request, int $id): RedirectResponse
    {
        $site = Site::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:sites,code,' . $site->id,
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'geofence_radius_meters' => 'nullable|integer|min:10|max:900',
        ]);

        $site->update($validated);

        return back()->with('success', 'Data Site/Lokasi berhasil diperbarui.');
    }

    public function destroySite(int $id): RedirectResponse
    {
        $site = Site::findOrFail($id);
        $site->delete();

        return back()->with('success', 'Site/Lokasi berhasil dihapus.');
    }

    public function storeCheckpoint(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'location_description' => 'nullable|string',
            'max_radius_meters' => 'nullable|integer|min:1|max:900',
            'order_index' => 'nullable|integer',
        ]);

        $validated['qr_token'] = 'CP-' . strtoupper(Str::random(12));
        $validated['max_radius_meters'] = $validated['max_radius_meters'] ?? 10;
        $validated['order_index'] = $validated['order_index'] ?? 0;
        $validated['is_active'] = true;

        Checkpoint::create($validated);

        return back()->with('success', 'Titik lokasi patroli berhasil ditambahkan.');
    }

    public function updateCheckpoint(Request $request, int $id): RedirectResponse
    {
        $checkpoint = Checkpoint::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'location_description' => 'nullable|string',
            'max_radius_meters' => 'nullable|integer|min:1|max:900',
            'order_index' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'regenerate_qr' => 'nullable|boolean',
        ]);

        if ($request->boolean('regenerate_qr')) {
            $validated['qr_token'] = 'CP-' . strtoupper(Str::random(12));
        }

        $checkpoint->update($validated);

        return back()->with('success', 'Titik lokasi patroli berhasil diperbarui.');
    }

    public function regenerateQrToken(int $id): RedirectResponse
    {
        $checkpoint = Checkpoint::findOrFail($id);
        $checkpoint->update([
            'qr_token' => 'CP-' . strtoupper(Str::random(12)),
        ]);

        return back()->with('success', 'QR Token berhasil diperbarui dengan kode baru.');
    }

    public function destroyCheckpoint(int $id): RedirectResponse
    {
        $checkpoint = Checkpoint::findOrFail($id);
        $checkpoint->delete();

        return back()->with('success', 'Titik lokasi patroli berhasil dihapus.');
    }
}
