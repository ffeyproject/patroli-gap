<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\Visitor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitorController extends Controller
{
    public function index(): Response
    {
        $visitors = Visitor::with(['site', 'user'])
            ->latest('check_in_at')
            ->paginate(15);

        $sites = Site::where('is_active', true)->get();

        return Inertia::render('visitors/index', [
            'visitors' => $visitors,
            'sites' => $sites,
        ]);
    }

    public function checkOut(int $id): RedirectResponse
    {
        $visitor = Visitor::findOrFail($id);
        $visitor->update([
            'check_out_at' => now(),
            'status' => 'checked_out',
        ]);

        return back()->with('success', 'Pengunjung berhasil dicatat keluar.');
    }
}
