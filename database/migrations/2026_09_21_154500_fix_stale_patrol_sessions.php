<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Find Shift Siang schedule ID
        $siangSchedule = DB::table('patrol_schedules')
            ->where('shift_name', 'ILIKE', '%siang%')
            ->first();

        if (!$siangSchedule) {
            $siangSchedule = DB::table('patrol_schedules')
                ->where('shift_name', 'LIKE', '%Siang%')
                ->first();
        }

        $siangId = $siangSchedule ? $siangSchedule->id : 5;

        // 2. Find Toni Sudrajat user ID
        $toniUser = DB::table('users')
            ->where('name', 'ILIKE', '%Toni Sudrajat%')
            ->first();
        $toniId = $toniUser ? $toniUser->id : 22;

        // 3. Update all sessions containing logs scanned on 2026-09-21
        $sessionIds = DB::table('patrol_logs')
            ->whereDate('scanned_at', '2026-09-21')
            ->pluck('patrol_session_id')
            ->unique()
            ->toArray();

        if (!empty($sessionIds)) {
            DB::table('patrol_sessions')
                ->whereIn('id', $sessionIds)
                ->update([
                    'user_id' => $toniId,
                    'patrol_schedule_id' => $siangId,
                    'round_number' => 1,
                    'started_at' => '2026-09-21 14:13:37',
                    'status' => 'in_progress',
                    'completed_at' => null,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
