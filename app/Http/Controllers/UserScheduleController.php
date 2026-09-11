<?php

namespace App\Http\Controllers;

use App\Models\PatrolSchedule;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserScheduleController extends Controller
{
    public function index(): Response
    {
        $users = User::orderBy('name')->get();
        $sites = Site::where('is_active', true)->get();
        $schedules = PatrolSchedule::with(['site', 'users'])->latest()->get();

        return Inertia::render('users/index', [
            'users' => $users,
            'sites' => $sites,
            'schedules' => $schedules,
        ]);
    }

    public function storeUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'badge_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'role' => 'required|in:superadmin,admin,danru,satpam',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['is_active'] = true;

        User::create($validated);

        return back()->with('success', 'User / Petugas baru berhasil didaftarkan.');
    }

    public function storeSchedule(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'shift_name' => 'required|string|max:255',
            'start_time' => 'required',
            'end_time' => 'required',
            'schedule_date' => 'nullable|date',
            'min_patrol_rounds' => 'required|integer|min:1',
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $schedule = PatrolSchedule::create([
            'site_id' => $validated['site_id'],
            'shift_name' => $validated['shift_name'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'schedule_date' => $validated['schedule_date'] ?? today(),
            'min_patrol_rounds' => $validated['min_patrol_rounds'],
            'is_active' => true,
        ]);

        $schedule->users()->sync($validated['user_ids']);

        return back()->with('success', 'Jadwal shift & penugasan satpam berhasil disimpan.');
    }

    public function updateSchedule(Request $request, int $id): RedirectResponse
    {
        $schedule = PatrolSchedule::findOrFail($id);

        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'shift_name' => 'required|string|max:255',
            'start_time' => 'required',
            'end_time' => 'required',
            'schedule_date' => 'nullable|date',
            'min_patrol_rounds' => 'required|integer|min:1',
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $schedule->update([
            'site_id' => $validated['site_id'],
            'shift_name' => $validated['shift_name'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'schedule_date' => $validated['schedule_date'] ?? $schedule->schedule_date,
            'min_patrol_rounds' => $validated['min_patrol_rounds'],
        ]);

        $schedule->users()->sync($validated['user_ids']);

        return back()->with('success', 'Jadwal shift & penugasan satpam berhasil diperbarui.');
    }

    public function destroySchedule(int $id): RedirectResponse
    {
        $schedule = PatrolSchedule::findOrFail($id);
        $schedule->users()->detach();
        $schedule->delete();

        return back()->with('success', 'Jadwal shift berhasil dihapus.');
    }
}
