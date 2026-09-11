import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Calendar,
    CheckCircle,
    Clock,
    Edit2,
    Lock,
    Plus,
    Shield,
    ShieldCheck,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    username?: string;
    email: string;
    badge_number?: string;
    phone?: string;
    role: 'superadmin' | 'admin' | 'danru' | 'satpam';
    is_active: boolean;
}

interface Site {
    id: number;
    name: string;
}

interface PatrolSchedule {
    id: number;
    site_id?: number;
    shift_name: string;
    start_time: string;
    end_time: string;
    schedule_date?: string;
    min_patrol_rounds: number;
    site: Site;
    users: User[];
}

interface Props {
    users: User[];
    sites: Site[];
    schedules: PatrolSchedule[];
}

export default function UsersIndex({ users, sites, schedules }: Props) {
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<PatrolSchedule | null>(null);

    // Form for Adding User
    const userForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        badge_number: '',
        phone: '',
        role: 'satpam',
    });

    // Form for Adding / Editing Schedule & Assigning Guards
    const scheduleForm = useForm({
        site_id: sites[0]?.id || 1,
        shift_name: '',
        start_time: '07:00',
        end_time: '15:00',
        schedule_date: new Date().toISOString().split('T')[0],
        min_patrol_rounds: 3,
        user_ids: [] as number[],
    });

    const openCreateScheduleModal = () => {
        setEditingSchedule(null);
        scheduleForm.setData({
            site_id: sites[0]?.id || 1,
            shift_name: '',
            start_time: '07:00',
            end_time: '15:00',
            schedule_date: new Date().toISOString().split('T')[0],
            min_patrol_rounds: 3,
            user_ids: [],
        });
        setIsAddScheduleModalOpen(true);
    };

    const openEditScheduleModal = (sch: PatrolSchedule) => {
        setEditingSchedule(sch);
        scheduleForm.setData({
            site_id: sch.site?.id || sch.site_id || sites[0]?.id || 1,
            shift_name: sch.shift_name,
            start_time: sch.start_time.slice(0, 5),
            end_time: sch.end_time.slice(0, 5),
            schedule_date: sch.schedule_date || new Date().toISOString().split('T')[0],
            min_patrol_rounds: sch.min_patrol_rounds || 3,
            user_ids: sch.users ? sch.users.map((u) => u.id) : [],
        });
        setIsAddScheduleModalOpen(true);
    };

    const submitUser = (e: React.FormEvent) => {
        e.preventDefault();
        userForm.post('/users/store', {
            onSuccess: () => {
                setIsAddUserModalOpen(false);
                userForm.reset();
            },
        });
    };

    const submitSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSchedule) {
            scheduleForm.post(`/schedules/${editingSchedule.id}/update`, {
                onSuccess: () => {
                    setIsAddScheduleModalOpen(false);
                    setEditingSchedule(null);
                    scheduleForm.reset();
                },
            });
        } else {
            scheduleForm.post('/schedules/store', {
                onSuccess: () => {
                    setIsAddScheduleModalOpen(false);
                    scheduleForm.reset();
                },
            });
        }
    };

    const deleteSchedule = (sch: PatrolSchedule) => {
        if (confirm(`Yakin ingin menghapus jadwal "${sch.shift_name}"?`)) {
            router.delete(`/schedules/${sch.id}`);
        }
    };

    const toggleUserInSchedule = (userId: number) => {
        const current = [...scheduleForm.data.user_ids];
        const index = current.indexOf(userId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(userId);
        }
        scheduleForm.setData('user_ids', current);
    };

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Kelola User & Jadwal Patroli - Patroli Security" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <Users className="size-7 text-blue-500" />
                        Kelola User & Pengaturan Jadwal Patroli
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Atur hak akses petugas dan jadwal shift patroli. Hanya petugas yang ditugaskan yang dapat melakukan scan titik.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-semibold border border-slate-700 transition-all active:scale-95 cursor-pointer"
                    >
                        <UserPlus className="size-4" />
                        <span>Tambah Petugas</span>
                    </button>
                    <button
                        onClick={openCreateScheduleModal}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                        <Calendar className="size-4" />
                        <span>Atur Jadwal & Shift Patroli</span>
                    </button>
                </div>
            </div>

            {/* Section 1: Jadwal Shift Patroli Aktif (Restricted Access) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Lock className="size-4 text-emerald-400" />
                            Jadwal Shift & Petugas yang Berhak Scan Patroli
                        </h2>
                        <p className="text-xs text-slate-400">
                            Sistem membatasi scan QR hanya untuk petugas yang terdaftar di jadwal aktif berikut
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedules.map((sch) => (
                        <div
                            key={sch.id}
                            className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-white">
                                            {sch.shift_name}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                                            {sch.min_patrol_rounds} Round Wajib
                                        </span>
                                        <button
                                            onClick={() => openEditScheduleModal(sch)}
                                            title="Edit Jadwal"
                                            className="p-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-400 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Edit2 className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => deleteSchedule(sch)}
                                            title="Hapus Jadwal"
                                            className="p-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-900 text-red-400 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#141e33] text-xs text-slate-300 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Lokasi Site:</span>
                                        <strong className="text-white">{sch.site?.name}</strong>
                                    </div>
                                    <div className="flex items-center justify-between font-mono text-[11px]">
                                        <span className="text-slate-400">Jam Shift:</span>
                                        <span className="text-cyan-400 font-bold">{sch.start_time} - {sch.end_time} WIB</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-xs font-semibold text-slate-300 block mb-2">
                                        Petugas Terjadwal ({sch.users?.length || 0} Satpam):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sch.users?.map((u) => (
                                            <span
                                                key={u.id}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200"
                                            >
                                                <UserCheck className="size-3 text-emerald-400" />
                                                {u.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 2: Daftar Seluruh User / Petugas */}
            <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="size-4 text-blue-400" />
                    Daftar Petugas & Pengguna Sistem
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#131b2e]/60 text-slate-400 uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Nama Lengkap</th>
                                <th className="px-4 py-3">Username</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">No Badge / NIK</th>
                                <th className="px-4 py-3">No. HP</th>
                                <th className="px-4 py-3">Role Akses</th>
                                <th className="px-4 py-3 rounded-r-lg">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-white">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex size-7 items-center justify-center rounded-full bg-slate-800 font-bold text-blue-400 border border-slate-700 text-xs">
                                                {user.name.charAt(0)}
                                            </div>
                                            <span>{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-cyan-400 font-mono text-[11px]">{user.username || '-'}</td>
                                    <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">{user.email}</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{user.badge_number || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{user.phone || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                                            user.role === 'superadmin' || user.role === 'admin'
                                                ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                                : user.role === 'danru'
                                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                                : 'bg-slate-800 text-slate-300'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-emerald-400 text-xs font-semibold">Aktif</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah User Baru */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-md w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <span className="text-white font-semibold text-sm">Tambah Petugas / User Baru</span>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitUser} className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    required
                                    value={userForm.data.name}
                                    onChange={(e) => userForm.setData('name', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        placeholder="agus"
                                        value={userForm.data.username}
                                        onChange={(e) => userForm.setData('username', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={userForm.data.email}
                                        onChange={(e) => userForm.setData('email', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={userForm.data.password}
                                        onChange={(e) => userForm.setData('password', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">No. HP</label>
                                    <input
                                        type="text"
                                        placeholder="08123456789"
                                        value={userForm.data.phone}
                                        onChange={(e) => userForm.setData('phone', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">No. Badge / NIK</label>
                                    <input
                                        type="text"
                                        placeholder="SEC-005"
                                        value={userForm.data.badge_number}
                                        onChange={(e) => userForm.setData('badge_number', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Role *</label>
                                    <select
                                        value={userForm.data.role}
                                        onChange={(e) => userForm.setData('role', e.target.value as any)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="satpam">Satpam (Petugas)</option>
                                        <option value="danru">Danru (Komandan Regu)</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Super Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium">Batal</button>
                                <button type="submit" disabled={userForm.processing} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold">Simpan Petugas</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Atur / Edit Jadwal Shift & Penugasan Satpam */}
            {isAddScheduleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-lg w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <span className="text-white font-semibold text-sm">
                                {editingSchedule ? 'Edit Jadwal Shift Patroli' : 'Atur Jadwal Shift & Penugasan Satpam'}
                            </span>
                            <button onClick={() => { setIsAddScheduleModalOpen(false); setEditingSchedule(null); }} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitSchedule} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Lokasi Site *</label>
                                <select
                                    value={scheduleForm.data.site_id}
                                    onChange={(e) => scheduleForm.setData('site_id', parseInt(e.target.value))}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
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
                                    placeholder="Contoh: Shift Pagi (07:00 - 15:00)"
                                    value={scheduleForm.data.shift_name}
                                    onChange={(e) => scheduleForm.setData('shift_name', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Mulai *</label>
                                    <input
                                        type="time"
                                        required
                                        value={scheduleForm.data.start_time}
                                        onChange={(e) => scheduleForm.setData('start_time', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Selesai *</label>
                                    <input
                                        type="time"
                                        required
                                        value={scheduleForm.data.end_time}
                                        onChange={(e) => scheduleForm.setData('end_time', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Round Wajib *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        required
                                        value={scheduleForm.data.min_patrol_rounds}
                                        onChange={(e) => scheduleForm.setData('min_patrol_rounds', parseInt(e.target.value) || 1)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Select Guards who have permission to patrol this shift */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    Pilih Satpam yang Ditugaskan (Hanya mereka yang bisa scan) *
                                </label>
                                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#141e33] border border-slate-700">
                                    {users.filter(u => u.role === 'satpam' || u.role === 'danru').map((u) => {
                                        const isChecked = scheduleForm.data.user_ids.includes(u.id);
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => toggleUserInSchedule(u.id)}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                                    isChecked ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-800 text-slate-300'
                                                }`}
                                            >
                                                <span>{u.name} ({u.badge_number || u.role})</span>
                                                {isChecked && <CheckCircle className="size-4" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button type="button" onClick={() => { setIsAddScheduleModalOpen(false); setEditingSchedule(null); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium">Batal</button>
                                <button type="submit" disabled={scheduleForm.processing || scheduleForm.data.user_ids.length === 0} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50">
                                    {editingSchedule ? 'Perbarui Jadwal Shift' : 'Simpan & Kunci Hak Akses'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
