import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Eye,
    MapPin,
    RefreshCw,
    Shield,
    ShieldCheck,
    UserCheck,
    Users,
    X,
} from 'lucide-react';

interface Props {
    metrics: {
        active_guards: number;
        today_scans: number;
        today_incidents: number;
        active_visitors: number;
    };
    sites_status: Array<{
        id: number;
        name: string;
        code: string;
        total_checkpoints: number;
        scanned_today: number;
        percentage: number;
        status: string;
    }>;
    latest_incidents: Array<{
        id: number;
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        status: string;
        site_name: string;
        reporter_name: string;
        reported_at: string;
        photo_url?: string;
    }>;
    guards_status: Array<{
        id: number;
        name: string;
        role: string;
        badge_number: string;
        site_name: string;
        progress: number;
        scanned_count: number;
        status: string;
        last_patrol: string;
    }>;
    latest_logs: Array<{
        id: number;
        scanned_at: string;
        scanned_date: string;
        user_name: string;
        user_role: string;
        user_badge: string;
        site_name: string;
        checkpoint_name: string;
        checkpoint_code: string;
        latitude: number;
        longitude: number;
        distance_meters: number;
        is_valid_location: boolean;
        condition_status: string;
        notes?: string;
        selfie_photo_url?: string;
    }>;
}

export default function Dashboard({
    metrics,
    sites_status,
    latest_incidents,
    guards_status,
    latest_logs,
}: Props) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => setIsRefreshing(false),
        });
    };

    const todayDateFormatted = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Ringkasan Operasional - Patroli Security" />

            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <ShieldCheck className="size-7 text-blue-500" />
                        Ringkasan Operasional
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Sistem Pemantauan Titik Patroli, Presensi Satpam & Logbook Real-time
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-[#11192e] border border-slate-800 px-3.5 py-1.5 text-xs text-slate-300 font-medium shadow-inner">
                        <Clock className="size-3.5 text-slate-400" />
                        <span>{todayDateFormatted}</span>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* 4 Stat KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Petugas Aktif */}
                <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-4 flex items-center justify-between shadow-sm hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            <UserCheck className="size-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">
                                {metrics.active_guards}
                            </div>
                            <div className="text-xs font-medium text-slate-400">Petugas Aktif</div>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        Shift Aktif
                    </span>
                </div>

                {/* Card 2: Scan Patroli Hari Ini */}
                <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-4 flex items-center justify-between shadow-sm hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 className="size-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">
                                {metrics.today_scans}
                            </div>
                            <div className="text-xs font-medium text-slate-400">Scan Patroli Hari Ini</div>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded-full">
                        Checkpoint
                    </span>
                </div>

                {/* Card 3: Insiden Hari Ini */}
                <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-4 flex items-center justify-between shadow-sm hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
                            <AlertTriangle className="size-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">
                                {metrics.today_incidents}
                            </div>
                            <div className="text-xs font-medium text-slate-400">Insiden Hari Ini</div>
                        </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        metrics.today_incidents > 0
                            ? 'text-amber-300 bg-amber-950/60 border border-amber-800/60'
                            : 'text-slate-400 bg-slate-900 border border-slate-800'
                    }`}>
                        {metrics.today_incidents > 0 ? 'Perlu Perhatian' : 'Aman'}
                    </span>
                </div>

                {/* Card 4: Tamu Aktif */}
                <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-4 flex items-center justify-between shadow-sm hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                            <Users className="size-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">
                                {metrics.active_visitors}
                            </div>
                            <div className="text-xs font-medium text-slate-400">Tamu Aktif</div>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full">
                        Di Lokasi
                    </span>
                </div>
            </div>

            {/* Second Row: Status Patroli per Site & Insiden Terbaru */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Status Patroli per Site */}
                <div className="lg:col-span-7 rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <MapPin className="size-4 text-blue-400" />
                                Status Patroli per Site
                            </h2>
                            <p className="text-xs text-slate-400">Progres patroli checkpoint hari ini</p>
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg">
                            Progres hari ini
                        </span>
                    </div>

                    <div className="space-y-4">
                        {sites_status.map((site) => (
                            <div
                                key={site.id}
                                className="rounded-xl bg-[#141e33] border border-slate-800/80 p-4 space-y-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-semibold text-white">
                                            {site.name}
                                        </span>
                                        <span className="ml-2 text-xs font-mono text-slate-400">
                                            ({site.code})
                                        </span>
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                        site.percentage >= 100
                                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/70'
                                            : site.percentage > 0
                                            ? 'bg-blue-950/80 text-blue-400 border border-blue-800/70'
                                            : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {site.status}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 to-cyan-400 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${site.percentage}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>{site.scanned_today} dari {site.total_checkpoints} titik terverifikasi</span>
                                    <span className="font-bold text-white">{site.percentage}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Insiden Terbaru */}
                <div className="lg:col-span-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-amber-400" />
                                    Insiden Terbaru
                                </h2>
                                <p className="text-xs text-slate-400">Laporan kejadian keamanan</p>
                            </div>
                            <span className="text-xs font-medium text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg">
                                5 laporan terakhir
                            </span>
                        </div>

                        {latest_incidents.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs">
                                Tidak ada laporan insiden hari ini. Area aman terkendali.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {latest_incidents.map((incident) => (
                                    <div
                                        key={incident.id}
                                        className="rounded-xl bg-[#141e33] border border-slate-800/80 p-3 space-y-1.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-xs font-bold text-white">
                                                {incident.title}
                                            </h3>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                                incident.severity === 'critical' || incident.severity === 'high'
                                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                            }`}>
                                                {incident.severity}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 line-clamp-2">
                                            {incident.description}
                                        </p>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                                            <span>{incident.reporter_name} • {incident.site_name}</span>
                                            <span className="font-mono text-slate-400">{incident.reported_at}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 3: Status Patroli per Petugas */}
            <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Shield className="size-4 text-indigo-400" />
                            Status Patroli per Petugas
                        </h2>
                        <p className="text-xs text-slate-400">
                            Progres checkpoint hari ini per Danru dan Satpam
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#131b2e]/60 text-slate-400 uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Petugas</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Site</th>
                                <th className="px-4 py-3">Progres</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-r-lg">Patroli Terakhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {guards_status.map((guard) => (
                                <tr key={guard.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-white">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex size-7 items-center justify-center rounded-full bg-slate-800 font-bold text-blue-400 border border-slate-700 text-[11px]">
                                                {guard.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div>{guard.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {guard.badge_number || 'SEC-00'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-[11px] text-slate-300 font-medium">
                                            {guard.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">{guard.site_name}</td>
                                    <td className="px-4 py-3 min-w-[150px]">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{ width: `${guard.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-mono text-slate-300">
                                                {guard.scanned_count} pts
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                            guard.status.includes('Aktif')
                                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                                : guard.status.includes('Hadir')
                                                ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}>
                                            <span className="size-1.5 rounded-full bg-current" />
                                            {guard.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                                        {guard.last_patrol}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 4: Aktivitas Scan Patroli Terbaru */}
            <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Activity className="size-4 text-emerald-400" />
                            Aktivitas Scan Patroli Terbaru
                        </h2>
                        <p className="text-xs text-slate-400">
                            10 aktivitas terakhir (termasuk foto selfie petugas, validasi radius 10m & watermark GPS)
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#131b2e]/60 text-slate-400 uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Waktu</th>
                                <th className="px-4 py-3">Petugas</th>
                                <th className="px-4 py-3">Checkpoint</th>
                                <th className="px-4 py-3">Validasi Radius (Maks 10m)</th>
                                <th className="px-4 py-3">Kondisi / Catatan</th>
                                <th className="px-4 py-3 rounded-r-lg text-center">Foto Selfie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {latest_logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-slate-400">
                                        Belum ada aktivitas scan patroli hari ini.
                                    </td>
                                </tr>
                            ) : (
                                latest_logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                                            <div className="font-bold text-white">{log.scanned_at} WIB</div>
                                            <div className="text-[10px] text-slate-400">{log.scanned_date}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-white">{log.user_name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {log.user_role} • {log.user_badge}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{log.checkpoint_name}</div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <MapPin className="size-3 text-slate-500" />
                                                {log.site_name} ({log.checkpoint_code})
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                log.distance_meters <= 10
                                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/70'
                                                    : 'bg-red-950/80 text-red-400 border border-red-800/70'
                                            }`}>
                                                <CheckCircle2 className="size-3" />
                                                {log.distance_meters}m (Valid &lt;= 10m)
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    log.condition_status === 'normal'
                                                        ? 'bg-slate-800 text-slate-300'
                                                        : log.condition_status === 'warning'
                                                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                                        : 'bg-red-950 text-red-300 border border-red-800'
                                                }`}>
                                                    {log.condition_status}
                                                </span>
                                                <span className="text-slate-400 truncate max-w-[200px]">
                                                    {log.notes || 'Normal'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {log.selfie_photo_url ? (
                                                <button
                                                    onClick={() => setSelectedPhoto(log.selfie_photo_url || null)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-medium transition-colors cursor-pointer"
                                                >
                                                    <Eye className="size-3.5" />
                                                    <span>Lihat Foto</span>
                                                </button>
                                            ) : (
                                                <span className="text-slate-500 text-xs">Tidak ada foto</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Preview Foto Selfie & Watermark */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-3xl w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <ShieldCheck className="size-5 text-emerald-400" />
                                <span>Bukti Selfie Petugas (Watermark Terverifikasi)</span>
                            </div>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-black">
                            <img
                                src={selectedPhoto}
                                alt="Selfie Watermark"
                                className="max-h-[70vh] w-auto object-contain rounded-lg border border-slate-800"
                            />
                        </div>
                        <div className="p-3 bg-[#0c1222] text-center text-xs text-slate-400 border-t border-slate-800">
                            Foto dilengkapi overlay digital: Nama Petugas, Tanggal & Jam, Titik Checkpoint, GPS Lat/Lng & Status Jarak.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
