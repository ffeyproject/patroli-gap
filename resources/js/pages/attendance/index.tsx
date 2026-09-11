import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    CalendarCheck,
    CheckCircle2,
    Clock,
    Eye,
    LocateFixed,
    LogOut,
    MapPin,
    Shield,
    UserCheck,
    X,
} from 'lucide-react';

interface AttendanceRecord {
    id: number;
    user_name: string;
    user_role: string;
    user_badge: string;
    site_name: string;
    check_in_at: string;
    check_out_at?: string;
    status: string;
    notes?: string;
    photo_url?: string;
}

interface Site {
    id: number;
    name: string;
}

interface Props {
    my_attendance: {
        id: number;
        site_id: number;
        site_name: string;
        check_in_at: string;
        check_out_at?: string;
        status: string;
        photo_url?: string;
    } | null;
    today_attendances: AttendanceRecord[];
    sites: Site[];
}

export default function AttendanceIndex({
    my_attendance,
    today_attendances,
    sites,
}: Props) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [isDetectingGps, setIsDetectingGps] = useState(false);

    const checkInForm = useForm({
        site_id: sites[0]?.id || 1,
        latitude: '-6.2297465',
        longitude: '106.8295180',
        notes: 'Hadir siap tugas',
    });

    const checkOutForm = useForm({});

    const handleDetectGps = () => {
        if (!navigator.geolocation) {
            alert('Browser tidak mendukung Geolocation.');
            return;
        }

        setIsDetectingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                checkInForm.setData({
                    ...checkInForm.data,
                    latitude: pos.coords.latitude.toFixed(7),
                    longitude: pos.coords.longitude.toFixed(7),
                });
                setIsDetectingGps(false);
            },
            (err) => {
                alert('Gagal mengambil GPS: ' + err.message);
                setIsDetectingGps(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCheckIn = (e: React.FormEvent) => {
        e.preventDefault();
        checkInForm.post('/presensi/check-in');
    };

    const handleCheckOut = () => {
        if (confirm('Konfirmasi check-out selesai tugas shift hari ini?')) {
            checkOutForm.post('/presensi/check-out');
        }
    };

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Presensi & Check-in Shift - Patroli Security" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <CalendarCheck className="size-7 text-emerald-400" />
                        Presensi & Check-in Shift Satpam
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Catat kehadiran awal shift tugas dan verifikasi posisi GPS petugas di lokasi site.
                    </p>
                </div>
            </div>

            {/* User Check-In Action Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-6 shadow-xl space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Status Presensi Anda Hari Ini
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            my_attendance && !my_attendance.check_out_at
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : my_attendance && my_attendance.check_out_at
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                            <span className="size-2 rounded-full bg-current animate-pulse" />
                            {my_attendance && !my_attendance.check_out_at
                                ? 'Sedang Bertugas (Hadir)'
                                : my_attendance && my_attendance.check_out_at
                                ? 'Selesai Shift (Checked Out)'
                                : 'Belum Check-in'}
                        </span>
                    </div>

                    {!my_attendance ? (
                        /* Check In Form */
                        <form onSubmit={handleCheckIn} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Lokasi Site Penugasan *
                                </label>
                                <select
                                    value={checkInForm.data.site_id}
                                    onChange={(e) => checkInForm.setData('site_id', parseInt(e.target.value))}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    {sites.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* GPS Detector */}
                            <div className="rounded-xl bg-[#141e33] border border-slate-800 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white">Koordinat GPS Presensi</span>
                                    <button
                                        type="button"
                                        onClick={handleDetectGps}
                                        disabled={isDetectingGps}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
                                    >
                                        <LocateFixed className={`size-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                                        <span>{isDetectingGps ? 'Mencari GPS...' : 'Ambil GPS Saya'}</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                                    <div className="bg-[#0c1222] p-2 rounded-lg border border-slate-800">
                                        Lat: {checkInForm.data.latitude}
                                    </div>
                                    <div className="bg-[#0c1222] p-2 rounded-lg border border-slate-800">
                                        Lng: {checkInForm.data.longitude}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Catatan Kehadiran
                                </label>
                                <input
                                    type="text"
                                    value={checkInForm.data.notes}
                                    onChange={(e) => checkInForm.setData('notes', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={checkInForm.processing}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm py-3 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <UserCheck className="size-5" />
                                <span>Check-in Masuk Shift</span>
                            </button>
                        </form>
                    ) : (
                        /* Checked In Status View */
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-[#141e33] border border-slate-800 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Lokasi Site:</span>
                                    <strong className="text-white">{my_attendance.site_name}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Waktu Masuk:</span>
                                    <span className="text-emerald-400 font-bold font-mono">{my_attendance.check_in_at} WIB</span>
                                </div>
                                {my_attendance.check_out_at && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Waktu Pulang:</span>
                                        <span className="text-slate-300 font-mono">{my_attendance.check_out_at} WIB</span>
                                    </div>
                                )}
                            </div>

                            {!my_attendance.check_out_at && (
                                <button
                                    onClick={handleCheckOut}
                                    disabled={checkOutForm.processing}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-xs py-3 transition-colors cursor-pointer"
                                >
                                    <LogOut className="size-4" />
                                    <span>Check-out Selesai Tugas Shift</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side: Informational Guide */}
                <div className="lg:col-span-7 rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Shield className="size-5 text-blue-400" />
                            Aturan Presensi & Patroli Petugas Keamanan
                        </h2>

                        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                            <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800/80 flex items-start gap-3">
                                <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 font-bold text-xs shrink-0">1</div>
                                <div>
                                    <strong className="text-white">Wajib Check-in di Awal Shift:</strong> Setiap satpam wajib melakukan presensi masuk di awal shift agar status di dashboard terbaca sebagai <em>Petugas Aktif / Hadir</em>.
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800/80 flex items-start gap-3">
                                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-950 text-blue-400 font-bold text-xs shrink-0">2</div>
                                <div>
                                    <strong className="text-white">Pembatasan Sesi Patroli:</strong> Hanya satpam yang dijadwalkan oleh admin/danru yang dapat memulai sesi putaran patroli checkpoint.
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800/80 flex items-start gap-3">
                                <div className="flex size-6 items-center justify-center rounded-lg bg-purple-950 text-purple-400 font-bold text-xs shrink-0">3</div>
                                <div>
                                    <strong className="text-white">Radius Ketat 10 Meter:</strong> Scan titik checkpoint hanya dapat diterima jika posisi GPS berada dalam jarak &le; 10 meter dari titik fisik.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's All Guards Attendance Table */}
            <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <UserCheck className="size-4 text-blue-400" />
                            Daftar Kehadiran Satpam Hari Ini
                        </h2>
                        <p className="text-xs text-slate-400">
                            Log kehadiran masuk & pulang seluruh petugas keamanan
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-lg">
                        {today_attendances.filter(a => !a.check_out_at).length} Petugas Aktif
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#131b2e]/60 text-slate-400 uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Petugas</th>
                                <th className="px-4 py-3">Role & NIK</th>
                                <th className="px-4 py-3">Lokasi Site</th>
                                <th className="px-4 py-3">Waktu Masuk</th>
                                <th className="px-4 py-3">Waktu Pulang</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-r-lg text-center">Foto Presensi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {today_attendances.map((att) => (
                                <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-white">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex size-7 items-center justify-center rounded-full bg-slate-800 font-bold text-emerald-400 border border-slate-700 text-xs">
                                                {att.user_name.charAt(0)}
                                            </div>
                                            <span>{att.user_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                                        {att.user_role} • {att.user_badge}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">{att.site_name}</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-emerald-400 font-bold">
                                        {att.check_in_at} WIB
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                                        {att.check_out_at ? `${att.check_out_at} WIB` : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                            !att.check_out_at
                                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}>
                                            <span className="size-1.5 rounded-full bg-current" />
                                            {!att.check_out_at ? 'Hadir / Aktif' : 'Sudah Pulang'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {att.photo_url ? (
                                            <button
                                                onClick={() => setSelectedPhoto(att.photo_url || null)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                                            >
                                                <Eye className="size-3.5" />
                                                <span>Lihat Foto</span>
                                            </button>
                                        ) : (
                                            <span className="text-slate-500 text-xs">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Preview Foto Presensi */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-2xl w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <span className="text-white font-semibold text-sm">Foto Presensi Kehadiran Petugas</span>
                            <button onClick={() => setSelectedPhoto(null)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-black">
                            <img src={selectedPhoto} alt="Foto Presensi" className="max-h-[65vh] w-auto object-contain rounded-lg" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
