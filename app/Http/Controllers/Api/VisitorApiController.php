<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visitor;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitorApiController extends Controller
{
    public function __construct(protected WatermarkService $watermarkService) {}

    public function index(Request $request): JsonResponse
    {
        $visitors = Visitor::with(['site', 'user'])
            ->latest('check_in_at')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $visitors,
        ]);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'site_id' => 'required|exists:sites,id',
            'guest_name' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'destination' => 'required|string|max:255',
            'purpose' => 'required|string|max:255',
            'vehicle_number' => 'nullable|string|max:50',
            'photo' => 'nullable',
        ]);

        $user = $request->user();
        $photoPath = null;

        if ($request->hasFile('photo') || $request->filled('photo')) {
            $photoPath = $this->watermarkService->watermarkAndSave(
                $request->file('photo') ?? $request->photo,
                [
                    'userName' => $user->name,
                    'userRole' => 'Buku Tamu',
                    'siteName' => 'Registrasi Pengunjung',
                    'checkpointName' => $request->guest_name,
                    'latitude' => 0,
                    'longitude' => 0,
                    'distanceMeters' => 0,
                    'scannedAt' => now()->timezone('Asia/Jakarta')->format('d M Y, H:i:s') . ' WIB',
                ],
                'visitor_photos'
            );
        }

        $visitor = Visitor::create([
            'site_id' => $request->site_id,
            'user_id' => $user->id,
            'guest_name' => $request->guest_name,
            'company' => $request->company,
            'destination' => $request->destination,
            'purpose' => $request->purpose,
            'vehicle_number' => $request->vehicle_number,
            'id_photo_path' => $photoPath,
            'check_in_at' => now(),
            'status' => 'checked_in',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tamu berhasil dicatat masuk.',
            'data' => $visitor,
        ], 201);
    }

    public function checkOut(int $id): JsonResponse
    {
        $visitor = Visitor::findOrFail($id);
        $visitor->update([
            'check_out_at' => now(),
            'status' => 'checked_out',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tamu berhasil dicatat keluar.',
            'data' => $visitor,
        ]);
    }
}
