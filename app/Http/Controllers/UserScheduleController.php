<?php

namespace App\Http\Controllers;

use App\Models\PatrolSchedule;
use App\Models\Site;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserScheduleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('users/index', [
            'users' => User::orderBy('name')->get(),
        ]);
    }

    public function schedules(): Response
    {
        $schedules = PatrolSchedule::with(['site', 'users'])
            ->orderByDesc('schedule_date')
            ->orderBy('start_time')
            ->get()
            ->map(function (PatrolSchedule $s) {
                $data = $s->toArray();
                $data['schedule_date'] = $s->schedule_date?->toDateString();

                return $data;
            });

        return Inertia::render('schedules/index', [
            'users' => User::orderBy('name')->get(),
            'sites' => Site::where('is_active', true)->get(),
            'schedules' => $schedules,
        ]);
    }

    public function storeUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:255|unique:users,username',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'badge_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'role' => 'required|in:superadmin,admin,danru,satpam',
            'theme' => 'nullable|string|in:midnight,carbon,cyberpunk,emerald,amber,crimson,ocean,nordic,blackout,royal,toxic,light,sandstone,rosegold',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['is_active'] = true;
        $validated['theme'] = $validated['theme'] ?? 'midnight';

        $user = User::create($validated);

        try {
            $user->syncRoles([$validated['role']]);
        } catch (\Throwable $e) {
            // Ignore if Spatie role does not exist yet
        }

        return back()->with('success', 'User / Petugas baru berhasil didaftarkan.');
    }

    public function updateUser(Request $request, int $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        $rules = [
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:255|unique:users,username,' . $user->id,
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'badge_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'role' => 'required|in:superadmin,admin,danru,satpam',
            'is_active' => 'nullable|boolean',
            'theme' => 'nullable|string|in:midnight,carbon,cyberpunk,emerald,amber,crimson,ocean,nordic,blackout,royal,toxic,light,sandstone,rosegold',
        ];

        if ($request->filled('password')) {
            $rules['password'] = 'required|string|min:6';
        }

        $validated = $request->validate($rules);

        if ($request->filled('password')) {
            $validated['password'] = Hash::make($request->input('password'));
        } else {
            unset($validated['password']);
        }

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $user->update($validated);

        try {
            $user->syncRoles([$validated['role']]);
        } catch (\Throwable $e) {
            // Ignore if Spatie role does not exist yet
        }

        return back()->with('success', 'Data Petugas / User berhasil diperbarui.');
    }

    public function destroyUser(Request $request, int $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        if ($request->user() && $request->user()->id === $user->id) {
            return back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
        }

        $user->schedules()->detach();
        $user->delete();

        return back()->with('success', 'Petugas / User berhasil dihapus.');
    }

    public function storeSchedule(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'shift_name' => 'required|string|max:255',
            'start_time' => 'required',
            'end_time' => 'required',
            'schedule_date' => 'nullable|date',
            'schedule_dates' => 'nullable|array',
            'schedule_dates.*' => 'date',
            'min_patrol_rounds' => 'required|integer|min:1',
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        // Satu shift bisa langsung dibuat untuk banyak tanggal sekaligus.
        $dates = collect($validated['schedule_dates'] ?? [])
            ->when(empty($validated['schedule_dates']), fn ($c) => $c->push($validated['schedule_date'] ?? today()->toDateString()))
            ->unique()
            ->values();

        foreach ($dates as $date) {
            $schedule = PatrolSchedule::create([
                'site_id' => $validated['site_id'],
                'shift_name' => $validated['shift_name'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'schedule_date' => $date,
                'min_patrol_rounds' => $validated['min_patrol_rounds'],
                'is_active' => true,
            ]);

            $schedule->users()->sync($validated['user_ids']);
        }

        return back()->with('success', $dates->count().' jadwal shift & penugasan satpam berhasil disimpan.');
    }

    public function updateScheduleUsers(Request $request, int $id): RedirectResponse
    {
        $schedule = PatrolSchedule::findOrFail($id);

        $validated = $request->validate([
            'user_ids' => 'present|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $schedule->users()->sync($validated['user_ids']);

        return back()->with('success', 'Petugas shift "'.$schedule->shift_name.'" berhasil diperbarui.');
    }

    public function copyWeek(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from_date' => 'required|date',
            'to_date' => 'required|date',
            'keep_users' => 'boolean',
        ]);

        $from = Carbon::parse($validated['from_date'])->startOfWeek();
        $to = Carbon::parse($validated['to_date'])->startOfWeek();
        $keepUsers = $validated['keep_users'] ?? true;

        $sources = PatrolSchedule::with('users')
            ->whereBetween('schedule_date', [$from->toDateString(), $from->copy()->endOfWeek()->toDateString()])
            ->get();

        $created = 0;
        foreach ($sources as $source) {
            $offset = $from->diffInDays(Carbon::parse($source->schedule_date)->startOfDay());
            $newDate = $to->copy()->addDays($offset)->toDateString();

            $exists = PatrolSchedule::where('site_id', $source->site_id)
                ->where('shift_name', $source->shift_name)
                ->whereDate('schedule_date', $newDate)
                ->exists();
            if ($exists) {
                continue;
            }

            $copy = PatrolSchedule::create([
                'site_id' => $source->site_id,
                'shift_name' => $source->shift_name,
                'start_time' => $source->start_time,
                'end_time' => $source->end_time,
                'schedule_date' => $newDate,
                'min_patrol_rounds' => $source->min_patrol_rounds,
                'is_active' => true,
            ]);

            if ($keepUsers) {
                $copy->users()->sync($source->users->pluck('id'));
            }
            $created++;
        }

        return back()->with('success', $created > 0
            ? "$created jadwal shift berhasil disalin ke minggu tujuan."
            : 'Tidak ada jadwal baru yang disalin (kosong atau sudah ada).');
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
