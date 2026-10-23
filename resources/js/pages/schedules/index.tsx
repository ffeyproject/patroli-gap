import { Head } from '@inertiajs/react';
import { CalendarDays } from 'lucide-react';
import ScheduleManager, {
    type Schedule,
    type ScheduleSite,
    type ScheduleUser,
} from '@/components/patrol/schedule-manager';

interface Props {
    users: ScheduleUser[];
    sites: ScheduleSite[];
    schedules: Schedule[];
}

export default function SchedulesIndex({ users, sites, schedules }: Props) {
    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Jadwal Shift - PT. Gajah Angkasa Perkasa" />

            <div className="pb-2 border-b border-slate-800/80">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    <CalendarDays className="size-7 text-blue-500" />
                    Jadwal Shift
                </h1>
            </div>

            <ScheduleManager users={users} sites={sites} schedules={schedules} />
        </div>
    );
}
