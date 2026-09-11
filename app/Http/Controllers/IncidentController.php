<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentController extends Controller
{
    public function index(): Response
    {
        $incidents = Incident::with(['site', 'user', 'checkpoint'])
            ->latest('reported_at')
            ->paginate(15);

        $sites = Site::with('checkpoints')->where('is_active', true)->get();

        return Inertia::render('incidents/index', [
            'incidents' => $incidents,
            'sites' => $sites,
        ]);
    }

    public function updateStatus(Request $request, int $id): RedirectResponse
    {
        $incident = Incident::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:open,investigating,resolved',
            'resolution_notes' => 'nullable|string',
        ]);

        if ($validated['status'] === 'resolved') {
            $validated['resolved_at'] = now();
        }

        $incident->update($validated);

        return back()->with('success', 'Status insiden berhasil diperbarui.');
    }
}
