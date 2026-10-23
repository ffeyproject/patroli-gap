import { useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Copy,
    CopyPlus,
    Edit2,
    Loader2,
    Lock,
    Plus,
    Search,
    Trash2,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ScheduleUser {
    id: number;
    name: string;
    badge_number?: string;
    role: string;
    is_active?: boolean;
}

export interface ScheduleSite {
    id: number;
    name: string;
}

export interface Schedule {
    id: number;
    site_id?: number;
    shift_name: string;
    start_time: string;
    end_time: string;
    schedule_date?: string | null;
    min_patrol_rounds: number;
    site: ScheduleSite;
    users: ScheduleUser[];
}

interface Props {
    users: ScheduleUser[];
    sites: ScheduleSite[];
    schedules: Schedule[];
}

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
};
const startOfWeek = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
    return c;
};
const shortDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const toMinutes = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
};
const overlaps = (aS: string, aE: string, bS: string, bE: string) => {
    const norm = (s: string, e: string): [number, number] => {
        const st = toMinutes(s);
        let en = toMinutes(e);
        if (en <= st) en += 1440;
        return [st, en];
    };
    const [s1, e1] = norm(aS, aE);
    const [s2, e2] = norm(bS, bE);
    return s1 < e2 && s2 < e1;
};

const inputCls =
    'w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500';

/* Input jam 24 jam (WIB) yang bisa diketik: "7", "730", "0730", "7:30", "07.30" */
const parseTime = (raw: string): string | null => {
    const t = raw.trim().replace('.', ':');
    let h: number;
    let m: number;
    if (t.includes(':')) {
        const [hs, ms = '0'] = t.split(':');
        h = Number(hs);
        m = Number(ms);
    } else if (/^\d{1,2}$/.test(t)) {
        h = Number(t);
        m = 0;
    } else if (/^\d{3,4}$/.test(t)) {
        h = Number(t.slice(0, -2));
        m = Number(t.slice(-2));
    } else {
        return null;
    }
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [draft, setDraft] = useState(value);
    const invalid = parseTime(draft) === null;

    return (
        <div className="relative">
            <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="07:00"
                value={draft}
                onChange={(e) => {
                    const v = e.target.value.replace(/[^\d:.]/g, '');
                    setDraft(v);
                    const ok = parseTime(v);
                    if (ok && /^\d{2}[:.]\d{2}$/.test(v)) onChange(ok);
                }}
                onBlur={() => {
                    const ok = parseTime(draft);
                    if (ok) {
                        setDraft(ok);
                        onChange(ok);
                    } else {
                        setDraft(value);
                    }
                }}
                className={`w-full rounded-xl bg-[#141e33] border pl-3.5 pr-11 py-2 text-xs text-white font-mono focus:outline-none ${
                    invalid ? 'border-rose-500' : 'border-slate-700 focus:border-blue-500'
                }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 pointer-events-none">
                WIB
            </span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Roster picker: pilih petugas dengan cepat (cari, filter, salin)      */
/* ------------------------------------------------------------------ */
function RosterPicker({
    users,
    schedules,
    selected,
    onChange,
    dates,
    start,
    end,
    excludeId,
}: {
    users: ScheduleUser[];
    schedules: Schedule[];
    selected: number[];
    onChange: (ids: number[]) => void;
    dates: string[];
    start: string;
    end: string;
    excludeId?: number;
}) {
    const [q, setQ] = useState('');
    const [view, setView] = useState<'all' | 'selected' | 'free'>('all');

    const guards = useMemo(
        () => users.filter((u) => (u.role === 'satpam' || u.role === 'danru') && u.is_active !== false),
        [users],
    );

    // petugas -> nama shift lain yang bentrok di tanggal & jam yang sama
    const conflicts = useMemo(() => {
        const map = new Map<number, string>();
        schedules.forEach((s) => {
            if (s.id === excludeId || !s.schedule_date || !dates.includes(s.schedule_date)) return;
            if (!overlaps(start, end, s.start_time, s.end_time)) return;
            s.users?.forEach((u) => {
                if (!map.has(u.id)) map.set(u.id, `${s.shift_name} (${s.site?.name ?? '-'})`);
            });
        });
        return map;
    }, [schedules, dates, start, end, excludeId]);

    const list = guards.filter((u) => {
        if (view === 'selected' && !selected.includes(u.id)) return false;
        if (view === 'free' && conflicts.has(u.id)) return false;
        if (!q) return true;
        const s = q.toLowerCase();
        return u.name.toLowerCase().includes(s) || (u.badge_number ?? '').toLowerCase().includes(s);
    });

    const toggle = (id: number) =>
        onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

    const addAllVisible = () => onChange(Array.from(new Set([...selected, ...list.map((u) => u.id)])));
    const removeAllVisible = () => onChange(selected.filter((id) => !list.some((u) => u.id === id)));

    // sumber salin: shift lain yang punya petugas, urut terbaru
    const copySources = useMemo(
        () =>
            schedules
                .filter((s) => s.id !== excludeId && s.users?.length > 0)
                .sort((a, b) => (b.schedule_date ?? '').localeCompare(a.schedule_date ?? ''))
                .slice(0, 40),
        [schedules, excludeId],
    );

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama / NIK petugas..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141e33] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex rounded-xl border border-slate-700 overflow-hidden text-[11px] font-semibold">
                    {(
                        [
                            ['all', 'Semua'],
                            ['selected', `Terpilih (${selected.length})`],
                            ['free', 'Belum bertugas'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setView(key)}
                            className={`px-2.5 py-1.5 cursor-pointer transition-colors ${
                                view === key ? 'bg-blue-600 text-white' : 'bg-[#141e33] text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                    type="button"
                    onClick={addAllVisible}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                >
                    Pilih semua yang tampil
                </button>
                <button
                    type="button"
                    onClick={removeAllVisible}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                >
                    Kosongkan yang tampil
                </button>
                {copySources.length > 0 && (
                    <select
                        value=""
                        onChange={(e) => {
                            const src = copySources.find((s) => s.id === Number(e.target.value));
                            if (src) {
                                onChange(src.users.map((u) => u.id));
                                toast.success(`Petugas disalin dari "${src.shift_name}".`);
                            }
                        }}
                        className="ml-auto max-w-[220px] rounded-lg bg-[#141e33] border border-slate-700 px-2 py-1 text-[11px] text-slate-200 cursor-pointer focus:outline-none"
                    >
                        <option value="">Salin petugas dari shift lain...</option>
                        {copySources.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.schedule_date ? shortDate(parseDate(s.schedule_date)) : '-'} · {s.shift_name} ({s.users.length})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-xl bg-[#141e33] border border-slate-700">
                {list.length === 0 ? (
                    <p className="col-span-full text-center text-xs text-slate-500 py-4">Tidak ada petugas yang cocok.</p>
                ) : (
                    list.map((u) => {
                        const on = selected.includes(u.id);
                        const conflict = conflicts.get(u.id);
                        return (
                            <button
                                type="button"
                                key={u.id}
                                onClick={() => toggle(u.id)}
                                className={`flex items-center justify-between gap-2 p-2 rounded-lg text-left text-xs cursor-pointer transition-colors ${
                                    on ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-800 text-slate-300'
                                }`}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate">{u.name}</span>
                                    <span className={`block text-[10px] truncate ${on ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {u.badge_number || u.role}
                                    </span>
                                    {conflict && (
                                        <span
                                            className={`mt-0.5 flex items-center gap-1 text-[10px] ${on ? 'text-amber-200' : 'text-amber-400'}`}
                                        >
                                            <AlertTriangle className="size-3 shrink-0" />
                                            <span className="truncate">Sudah di {conflict}</span>
                                        </span>
                                    )}
                                </span>
                                {on && <CheckCircle className="size-4 shrink-0" />}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Modal: Atur Petugas (cepat, khusus ganti orang)                     */
/* ------------------------------------------------------------------ */
function RosterModal({
    schedule,
    users,
    schedules,
    onClose,
}: {
    schedule: Schedule;
    users: ScheduleUser[];
    schedules: Schedule[];
    onClose: () => void;
}) {
    const [ids, setIds] = useState<number[]>(schedule.users?.map((u) => u.id) ?? []);
    const [saving, setSaving] = useState(false);

    const save = () => {
        setSaving(true);
        router.post(
            `/schedules/${schedule.id}/users`,
            { user_ids: ids },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Petugas shift berhasil diperbarui.');
                    onClose();
                },
                onError: (errors) => toast.error(Object.values(errors)[0] || 'Gagal memperbarui petugas.'),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-xl w-full max-h-[92vh] overflow-y-auto bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e] sticky top-0 z-10">
                    <div>
                        <div className="text-white font-semibold text-sm">Atur Petugas · {schedule.shift_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                            {schedule.schedule_date ? shortDate(parseDate(schedule.schedule_date)) : '-'} ·{' '}
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)} WIB · {schedule.site?.name}
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer">
                        <X className="size-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <RosterPicker
                        users={users}
                        schedules={schedules}
                        selected={ids}
                        onChange={setIds}
                        dates={schedule.schedule_date ? [schedule.schedule_date] : []}
                        start={schedule.start_time}
                        end={schedule.end_time}
                        excludeId={schedule.id}
                    />
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                        <span className="text-xs text-slate-400">{ids.length} petugas dipilih</span>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-md shadow-blue-600/30"
                            >
                                {saving && <Loader2 className="size-3.5 animate-spin" />}
                                Simpan Petugas
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Modal: Buat / Edit Shift                                            */
/* ------------------------------------------------------------------ */
function ShiftModal({
    editing,
    initialDate,
    weekStart,
    users,
    sites,
    schedules,
    onClose,
}: {
    editing: Schedule | null;
    initialDate: string;
    weekStart: Date;
    users: ScheduleUser[];
    sites: ScheduleSite[];
    schedules: Schedule[];
    onClose: () => void;
}) {
    const form = useForm({
        site_id: editing?.site?.id ?? editing?.site_id ?? sites[0]?.id ?? 1,
        shift_name: editing?.shift_name ?? 'Shift Pagi',
        start_time: editing?.start_time.slice(0, 5) ?? '07:00',
        end_time: editing?.end_time.slice(0, 5) ?? '15:00',
        schedule_date: editing?.schedule_date ?? initialDate,
        schedule_dates: [initialDate] as string[],
        min_patrol_rounds: editing?.min_patrol_rounds ?? 1,
        user_ids: (editing?.users?.map((u) => u.id) ?? []) as number[],
    });

    const weekDays = Array.from({ length: 7 }, (_, i) => fmt(addDays(weekStart, i)));
    const dates = editing ? [form.data.schedule_date] : form.data.schedule_dates;

    const toggleDate = (d: string) => {
        const cur = form.data.schedule_dates;
        form.setData('schedule_dates', cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort());
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Jadwal shift berhasil diperbarui.' : 'Jadwal shift berhasil dibuat.');
                onClose();
            },
            onError: (errors: Record<string, string>) =>
                toast.error(Object.values(errors)[0] || 'Gagal menyimpan jadwal shift.'),
        };
        if (editing) form.post(`/schedules/${editing.id}/update`, opts);
        else form.post('/schedules/store', opts);
    };

    const canSubmit = form.data.user_ids.length > 0 && (editing || form.data.schedule_dates.length > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-2xl w-full max-h-[92vh] overflow-y-auto bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e] sticky top-0 z-10">
                    <span className="text-white font-semibold text-sm">
                        {editing ? 'Edit Jadwal Shift' : 'Buat Jadwal Shift Baru'}
                    </span>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer">
                        <X className="size-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-5">
                    {/* Langkah 1: Shift */}
                    <section className="space-y-3">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Lokasi Site *</label>
                                <select
                                    value={form.data.site_id}
                                    onChange={(e) => form.setData('site_id', parseInt(e.target.value))}
                                    className={inputCls}
                                >
                                    {sites.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Shift *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.data.shift_name}
                                    onChange={(e) => form.setData('shift_name', e.target.value)}
                                    className={inputCls}
                                />
                                {form.errors.shift_name && (
                                    <span className="text-[11px] text-rose-400 mt-1 block">{form.errors.shift_name}</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Mulai (WIB) *</label>
                                <TimeInput value={form.data.start_time} onChange={(v) => form.setData('start_time', v)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Selesai (WIB) *</label>
                                <TimeInput value={form.data.end_time} onChange={(v) => form.setData('end_time', v)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Round Wajib *</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    required
                                    value={form.data.min_patrol_rounds}
                                    onChange={(e) => form.setData('min_patrol_rounds', parseInt(e.target.value) || 1)}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Langkah 2: Tanggal */}
                    <section className="space-y-2.5">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">1 · Tanggal</h4>
                        {editing ? (
                            <input
                                type="date"
                                required
                                value={form.data.schedule_date}
                                onChange={(e) => form.setData('schedule_date', e.target.value)}
                                className={`${inputCls} max-w-[200px]`}
                            />
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-1.5">
                                    {weekDays.map((d, i) => {
                                        const on = form.data.schedule_dates.includes(d);
                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => toggleDate(d)}
                                                className={`min-w-[54px] px-2 py-1.5 rounded-lg border text-center cursor-pointer transition-colors ${
                                                    on
                                                        ? 'bg-blue-600 border-blue-500 text-white'
                                                        : 'bg-[#141e33] border-slate-700 text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                <span className="block text-[11px] font-bold">{DAY_LABELS[i]}</span>
                                                <span className="block text-[10px] opacity-80">{shortDate(parseDate(d))}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2 text-[11px]">
                                    <button type="button" onClick={() => form.setData('schedule_dates', weekDays)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer">
                                        Seminggu penuh
                                    </button>
                                    <button type="button" onClick={() => form.setData('schedule_dates', weekDays.slice(0, 5))} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer">
                                        Sen–Jum
                                    </button>
                                    <button type="button" onClick={() => form.setData('schedule_dates', [])} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer">
                                        Reset
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Pilih beberapa hari sekaligus — satu shift dengan petugas yang sama dibuat untuk tiap hari terpilih.
                                </p>
                            </>
                        )}
                        {form.errors.schedule_dates && (
                            <span className="text-[11px] text-rose-400 block">{form.errors.schedule_dates}</span>
                        )}
                    </section>

                    {/* Langkah 3: Petugas */}
                    <section className="space-y-2.5">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">2 · Petugas yang Berhak Scan</h4>
                        <RosterPicker
                            users={users}
                            schedules={schedules}
                            selected={form.data.user_ids}
                            onChange={(ids) => form.setData('user_ids', ids)}
                            dates={dates}
                            start={form.data.start_time}
                            end={form.data.end_time}
                            excludeId={editing?.id}
                        />
                        {form.errors.user_ids && (
                            <span className="text-[11px] text-rose-400 block">{form.errors.user_ids}</span>
                        )}
                    </section>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                        <span className="text-xs text-slate-400">
                            {form.data.user_ids.length} petugas
                            {!editing && ` · ${form.data.schedule_dates.length} hari`}
                        </span>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing || !canSubmit}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/30"
                            >
                                {form.processing && <Loader2 className="size-3.5 animate-spin" />}
                                {form.processing ? 'Menyimpan...' : editing ? 'Perbarui Jadwal' : 'Simpan Jadwal'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Utama: kalender mingguan                                            */
/* ------------------------------------------------------------------ */
export default function ScheduleManager({ users, sites, schedules }: Props) {
    const todayStr = fmt(new Date());
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [siteFilter, setSiteFilter] = useState('all');
    const [search, setSearch] = useState('');

    const [shiftModal, setShiftModal] = useState<{ editing: Schedule | null; date: string } | null>(null);
    const [rosterFor, setRosterFor] = useState<Schedule | null>(null);

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = days[6];

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return schedules.filter((s) => {
            if (siteFilter !== 'all' && String(s.site?.id ?? s.site_id) !== siteFilter) return false;
            if (!q) return true;
            return (
                s.shift_name.toLowerCase().includes(q) ||
                s.users?.some((u) => u.name.toLowerCase().includes(q) || (u.badge_number ?? '').toLowerCase().includes(q))
            );
        });
    }, [schedules, siteFilter, search]);

    const byDay = (d: Date) =>
        visible
            .filter((s) => s.schedule_date === fmt(d))
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const weekCount = days.reduce((n, d) => n + schedules.filter((s) => s.schedule_date === fmt(d)).length, 0);
    const prevWeekStart = addDays(weekStart, -7);
    const prevWeekCount = Array.from({ length: 7 }, (_, i) => fmt(addDays(prevWeekStart, i))).reduce(
        (n, d) => n + schedules.filter((s) => s.schedule_date === d).length,
        0,
    );

    const copyFromPrevWeek = () => {
        const msg = weekCount > 0
            ? `Minggu ini sudah punya ${weekCount} shift. Salin ${prevWeekCount} shift dari minggu sebelumnya (shift yang sama akan dilewati)?`
            : `Salin ${prevWeekCount} shift beserta petugasnya dari minggu sebelumnya?`;
        if (!confirm(msg)) return;
        router.post(
            '/schedules/copy-week',
            { from_date: fmt(prevWeekStart), to_date: fmt(weekStart), keep_users: true },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Jadwal minggu lalu berhasil disalin.'),
                onError: (e) => toast.error(Object.values(e)[0] || 'Gagal menyalin jadwal.'),
            },
        );
    };

    const duplicate = (s: Schedule) => {
        const next = s.schedule_date ? fmt(addDays(parseDate(s.schedule_date), 1)) : todayStr;
        router.post(
            '/schedules/store',
            {
                site_id: s.site?.id ?? s.site_id,
                shift_name: s.shift_name,
                start_time: s.start_time.slice(0, 5),
                end_time: s.end_time.slice(0, 5),
                schedule_dates: [next],
                min_patrol_rounds: s.min_patrol_rounds,
                user_ids: s.users.map((u) => u.id),
            },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Shift disalin ke ${shortDate(parseDate(next))}.`),
                onError: (e) => toast.error(Object.values(e)[0] || 'Gagal menyalin shift.'),
            },
        );
    };

    const remove = (s: Schedule) => {
        if (!confirm(`Yakin ingin menghapus jadwal "${s.shift_name}"?`)) return;
        router.delete(`/schedules/${s.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Jadwal shift berhasil dihapus.'),
            onError: (e) => toast.error(Object.values(e)[0] || 'Gagal menghapus jadwal shift.'),
        });
    };

    const defaultDate = fmt(weekStart) <= todayStr && todayStr <= fmt(weekEnd) ? todayStr : fmt(weekStart);
    const isThisWeek = fmt(weekStart) === fmt(startOfWeek(new Date()));

    return (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Lock className="size-4 text-emerald-400" />
                        Jadwal Shift & Petugas yang Berhak Scan Patroli
                    </h2>
                    <p className="text-xs text-slate-400">
                        Scan QR hanya untuk petugas yang terdaftar di shift pada hari tersebut. Klik <strong>Atur Petugas</strong> untuk ganti orang dengan cepat.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={copyFromPrevWeek}
                        disabled={prevWeekCount === 0}
                        title={prevWeekCount === 0 ? 'Minggu sebelumnya tidak punya jadwal' : 'Salin jadwal & petugas minggu lalu'}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-2 text-xs font-semibold border border-slate-700 cursor-pointer"
                    >
                        <CopyPlus className="size-4 text-emerald-400" />
                        Salin dari Minggu Lalu
                    </button>
                    <button
                        onClick={() => setShiftModal({ editing: null, date: defaultDate })}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-xs font-semibold shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                        <Plus className="size-4" />
                        Tambah Shift
                    </button>
                </div>
            </div>

            {/* Toolbar: navigasi minggu + filter */}
            <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-3">
                <div className="flex items-center gap-1">
                    <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer" title="Minggu sebelumnya">
                        <ChevronLeft className="size-4" />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 text-xs font-semibold text-white min-w-[170px] justify-center">
                        <CalendarDays className="size-4 text-blue-400" />
                        {shortDate(weekStart)} – {shortDate(weekEnd)} {weekEnd.getFullYear()}
                    </div>
                    <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer" title="Minggu berikutnya">
                        <ChevronRight className="size-4" />
                    </button>
                    {!isThisWeek && (
                        <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="ml-1 px-2.5 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 text-[11px] font-semibold cursor-pointer">
                            Minggu Ini
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="rounded-xl bg-[#141e33] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer">
                        <option value="all">Semua Site</option>
                        {sites.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <div className="relative min-w-[200px]">
                        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari shift atau nama petugas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141e33] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Kalender mingguan */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
                {days.map((d, i) => {
                    const items = byDay(d);
                    const isToday = fmt(d) === todayStr;
                    return (
                        <div
                            key={fmt(d)}
                            className={`rounded-2xl border p-2.5 flex flex-col gap-2 min-h-[120px] ${
                                isToday ? 'bg-blue-950/20 border-blue-800' : 'bg-[#0f172a]/90 border-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between px-1">
                                <div>
                                    <span className={`text-xs font-bold ${isToday ? 'text-blue-300' : 'text-white'}`}>{DAY_LABELS[i]}</span>
                                    <span className="text-[11px] text-slate-400 ml-1.5">{shortDate(d)}</span>
                                    {isToday && <span className="ml-1.5 text-[9px] font-bold uppercase text-blue-300 bg-blue-900/60 px-1.5 py-0.5 rounded">Hari ini</span>}
                                </div>
                                <button
                                    onClick={() => setShiftModal({ editing: null, date: fmt(d) })}
                                    title={`Tambah shift ${DAY_LABELS[i]}`}
                                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                                >
                                    <Plus className="size-3.5" />
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <button
                                    onClick={() => setShiftModal({ editing: null, date: fmt(d) })}
                                    className="flex-1 min-h-[56px] rounded-xl border border-dashed border-slate-700 text-[11px] text-slate-500 hover:text-slate-300 hover:border-slate-500 cursor-pointer transition-colors"
                                >
                                    + Tambah shift
                                </button>
                            ) : (
                                items.map((s) => (
                                    <div key={s.id} className="rounded-xl bg-[#141e33] border border-slate-700/80 p-2.5 space-y-2">
                                        <div>
                                            <div className="flex items-start justify-between gap-1">
                                                <h3 className="text-xs font-bold text-white leading-tight">{s.shift_name}</h3>
                                                <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                    {s.min_patrol_rounds}x
                                                </span>
                                            </div>
                                            <div className="font-mono text-[11px] text-cyan-400 font-bold">
                                                {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)} WIB
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate">{s.site?.name}</div>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {s.users?.length ? (
                                                <>
                                                    {s.users.slice(0, 4).map((u) => (
                                                        <span key={u.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-200 max-w-full">
                                                            <UserCheck className="size-2.5 text-emerald-400 shrink-0" />
                                                            <span className="truncate">{u.name}</span>
                                                        </span>
                                                    ))}
                                                    {s.users.length > 4 && (
                                                        <button onClick={() => setRosterFor(s)} className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:text-white cursor-pointer">
                                                            +{s.users.length - 4}
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                                    <AlertTriangle className="size-3" /> Belum ada petugas
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 pt-1.5 border-t border-slate-700/60">
                                            <button
                                                onClick={() => setRosterFor(s)}
                                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                                            >
                                                <Users className="size-3" />
                                                Atur Petugas ({s.users?.length ?? 0})
                                            </button>
                                            <button onClick={() => duplicate(s)} title="Duplikat ke hari berikutnya" className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer">
                                                <Copy className="size-3" />
                                            </button>
                                            <button onClick={() => setShiftModal({ editing: s, date: s.schedule_date ?? todayStr })} title="Edit Shift" className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 hover:text-white cursor-pointer">
                                                <Edit2 className="size-3" />
                                            </button>
                                            <button onClick={() => remove(s)} title="Hapus Shift" className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 border border-slate-700 text-red-400 hover:text-white cursor-pointer">
                                                <Trash2 className="size-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    );
                })}
            </div>

            {shiftModal && (
                <ShiftModal
                    key={shiftModal.editing?.id ?? `new-${shiftModal.date}`}
                    editing={shiftModal.editing}
                    initialDate={shiftModal.date}
                    weekStart={shiftModal.date ? startOfWeek(parseDate(shiftModal.date)) : weekStart}
                    users={users}
                    sites={sites}
                    schedules={schedules}
                    onClose={() => setShiftModal(null)}
                />
            )}
            {rosterFor && (
                <RosterModal
                    key={rosterFor.id}
                    schedule={rosterFor}
                    users={users}
                    schedules={schedules}
                    onClose={() => setRosterFor(null)}
                />
            )}
        </div>
    );
}
