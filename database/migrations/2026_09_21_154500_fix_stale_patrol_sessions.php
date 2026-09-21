<?php

use App\Models\PatrolLog;
use App\Models\PatrolSchedule;
use App\Models\PatrolSession;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Find Shift Siang schedule
        $siangSchedule = PatrolSchedule::where('shift_name', 'like', '%Siang%')
            ->orWhere(function ($q) {
                $q->where('start_time', '>=', '14:00:00')->where('end_time', '<=', '23:00:00');
            })
            ->first();

        // 2. Fix any patrol session scanned by Toni Sudrajat (or today's sessions attached to old night shift)
        $sessionsToday = PatrolSession::whereHas('logs', function ($q) {
            $q->whereDate('scanned_at', '2026-09-21');
        })->get();

        foreach ($sessionsToday as $session) {
            $firstLog = $session->logs()->orderBy('scanned_at', 'asc')->first();
            $scannerUserId = $firstLog ? $firstLog->user_id : $session->user_id;

            $updateData = [
                'user_id' => $scannerUserId,
                'round_number' => 1,
            ];

            if ($siangSchedule) {
                $updateData['patrol_schedule_id'] = $siangSchedule->id;
            }

            if ($firstLog) {
                $updateData['started_at'] = '2026-09-21 14:13:37';
            }

            // Check if within active hours right now
            $now = now()->timezone('Asia/Jakarta');
            $currentTime = $now->format('H:i:s');
            if ($siangSchedule && $currentTime >= $siangSchedule->start_time && $currentTime <= $siangSchedule->end_time) {
                $updateData['status'] = 'in_progress';
                $updateData['completed_at'] = null;
            }

            $session->update($updateData);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed for data repair
    }
};
