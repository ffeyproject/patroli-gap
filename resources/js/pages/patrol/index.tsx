import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    Eye,
    FileSpreadsheet,
    FileText,
    Filter,
    Layers,
    ListFilter,
    MapPin,
    RotateCcw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    TrendingUp,
    User,
    Users,
    X,
} from 'lucide-react';
import {
    exportCheckpointsToExcel,
    CheckpointRecapExport,
    ExportFilters,
    ExportMetrics,
} from '@/lib/patrol-export';
import CheckpointPdfViewer from '@/components/patrol/CheckpointPdfViewer';
import CheckpointInspectorModal from '@/components/patrol/CheckpointInspectorModal';

interface SessionData {
    id: number;
    round_number: number;
    status: string;
    started_at: string;
    completed_at?: string;
    notes?: string;
    site: { name: string; code: string };
    user: { name: string; role: string; badge_number?: string };
    logs: Array<{
        id: number;
        scanned_at: string;
        distance_meters: number;
        selfie_photo_path?: string;
        condition_status: string;
        checkpoint: { name: string; code: string };
    }>;
}

interface Props {
    sessions: {
        data: SessionData[];
        current_page: number;
        last_page: number;
        total: number;
    };
    checkpointsRecap: CheckpointRecapExport[];
    metrics: {
        total_checkpoints: number;
        covered_checkpoints?: number;
        missed_checkpoints?: number;
        coverage_percentage?: number;
        total_scans: number;
        avg_distance: number;
        total_anomalies?: number;
        total_out_of_radius?: number;
    };
    sites: Array<{ id: number; name: string; code: string }>;
    filters: {
        site_id: number | string;
        start_date: string;
        end_date: string;
        search?: string;
        tab: string;
        is_today?: boolean;
    };
}

export default function PatrolIndex({
    sessions,
    checkpointsRecap,
    metrics,
    sites,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState<'sessions' | 'recap'>(
        (filters.tab as 'sessions' | 'recap') || 'sessions'
    );
    const [selectedSiteId, setSelectedSiteId] = useState<string>(
        filters.site_id ? String(filters.site_id) : ''
    );
    const [startDate, setStartDate] = useState<string>(filters.start_date || '');
    const [endDate, setEndDate] = useState<string>(filters.end_date || '');
    const [searchQuery, setSearchQuery] = useState<string>(filters.search || '');

    // Status & Condition filters for Recap tab
    const [recapStatusFilter, setRecapStatusFilter] = useState<'all' | 'covered' | 'missed'>('all');
    const [recapConditionFilter, setRecapConditionFilter] = useState<'all' | 'normal' | 'issue'>('all');

    // Modals
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);
    const [selectedCheckpointDetail, setSelectedCheckpointDetail] = useState<CheckpointRecapExport | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [imageError, setImageError] = useState<boolean>(false);

    const getPhotoUrl = (path?: string | null): string => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        if (!cleanPath.startsWith('storage/')) {
            return `/storage/${cleanPath}`;
        }
        return `/${cleanPath}`;
    };

    const openPhoto = (path?: string | null) => {
        if (!path) return;
        setImageError(false);
        setSelectedPhoto(getPhotoUrl(path));
    };

    const applyFilter = (params?: {
        newTab?: 'sessions' | 'recap';
        newSiteId?: string;
        newStartDate?: string;
        newEndDate?: string;
        newSearch?: string;
    }) => {
        router.get(
            '/patroli',
            {
                tab: params?.newTab ?? activeTab,
                site_id: params?.newSiteId !== undefined ? (params.newSiteId || undefined) : (selectedSiteId || undefined),
                start_date: params?.newStartDate !== undefined ? params.newStartDate : (startDate || undefined),
                end_date: params?.newEndDate !== undefined ? params.newEndDate : (endDate || undefined),
                search: params?.newSearch !== undefined ? (params.newSearch || undefined) : (searchQuery || undefined),
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter();
    };

    // Quick Date Preset Handlers
    const handleTodayFilter = () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        setStartDate(todayStr);
        setEndDate(todayStr);
        applyFilter({ newStartDate: todayStr, newEndDate: todayStr });
    };

    const handleYesterdayFilter = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yestStr = d.toLocaleDateString('en-CA');
        setStartDate(yestStr);
        setEndDate(yestStr);
        applyFilter({ newStartDate: yestStr, newEndDate: yestStr });
    };

    const handleLast7DaysFilter = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        const startStr = start.toLocaleDateString('en-CA');
        const endStr = end.toLocaleDateString('en-CA');
        setStartDate(startStr);
        setEndDate(endStr);
        applyFilter({ newStartDate: startStr, newEndDate: endStr });
    };

    const handleThisMonthFilter = () => {
        const now = new Date();
        const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
        const endStr = now.toLocaleDateString('en-CA');
        setStartDate(startStr);
        setEndDate(endStr);
        applyFilter({ newStartDate: startStr, newEndDate: endStr });
    };

    const handleAllDatesFilter = () => {
        setStartDate('');
        setEndDate('');
        applyFilter({ newStartDate: '', newEndDate: '' });
    };

    const handleResetFilter = () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        setSelectedSiteId('');
        setStartDate(todayStr);
        setEndDate(todayStr);
        setSearchQuery('');
        setRecapStatusFilter('all');
        setRecapConditionFilter('all');
        applyFilter({
            newSiteId: '',
            newStartDate: todayStr,
            newEndDate: todayStr,
            newSearch: '',
        });
    };

    const switchTab = (tab: 'sessions' | 'recap') => {
        setActiveTab(tab);
        applyFilter({ newTab: tab });
    };

    // Client-side filtering for Checkpoint Recap table
    const filteredCheckpoints = checkpointsRecap.filter((cp) => {
        // Status filter (covered vs missed)
        if (recapStatusFilter === 'covered' && cp.total_scans === 0) return false;
        if (recapStatusFilter === 'missed' && cp.total_scans > 0) return false;

        // Condition filter
        if (recapConditionFilter === 'normal' && (cp.abnormal_scans || 0) > 0) return false;
        if (recapConditionFilter === 'issue' && (cp.abnormal_scans || 0) === 0) return false;

        // Search text refinement
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            cp.name.toLowerCase().includes(query) ||
            cp.code.toLowerCase().includes(query) ||
            cp.site_name.toLowerCase().includes(query) ||
            cp.qr_token.toLowerCase().includes(query) ||
            (cp.location_description && cp.location_description.toLowerCase().includes(query)) ||
            (cp.last_guard_name && cp.last_guard_name.toLowerCase().includes(query))
        );
    });

    const isTodayActive = Boolean(filters.is_today);
    const selectedSiteObj = sites.find((s) => String(s.id) === String(selectedSiteId));

    // Dynamic metrics calculation for recap
    const totalCp = metrics.total_checkpoints || checkpointsRecap.length;
    const coveredCp = metrics.covered_checkpoints ?? checkpointsRecap.filter((c) => c.total_scans > 0).length;
    const missedCp = metrics.missed_checkpoints ?? Math.max(0, totalCp - coveredCp);
    const coveragePct = metrics.coverage_percentage ?? (totalCp > 0 ? Math.round((coveredCp / totalCp) * 100) : 0);

    const handleTriggerExcelExport = () => {
        exportCheckpointsToExcel(
            filteredCheckpoints,
            metrics,
            {
                site_id: selectedSiteId,
                site_name: selectedSiteObj ? selectedSiteObj.name : 'Semua Site / Gedung',
                start_date: startDate,
                end_date: endDate,
                search: searchQuery,
                is_today: isTodayActive,
            }
        );
    };

    return (
        <div className="min-h-screen bg-[var(--bg-card)]/30 p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Rekap & Audit Patroli - PT. Gajah Angkasa Perkasa" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <ShieldCheck className="size-7 text-blue-500" />
                        Rekap & Audit Log Patroli Keamanan
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Sistem audit ronda titik checkpoint, verifikasi geofence radius, foto selfie watermark, ekspor Excel & laporan resmi PDF.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                        onClick={() => switchTab('sessions')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'sessions'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <Clock className="size-4" />
                        <span>Sesi & Putaran</span>
                    </button>
                    <button
                        onClick={() => switchTab('recap')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'recap'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <Layers className="size-4" />
                        <span>Rekap per Titik</span>
                        {missedCp > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {missedCp} Missed
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Active Date Context & Quick Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-blue-950/40 border border-blue-800/50 text-xs">
                <div className="flex items-center gap-2 text-blue-300">
                    <Calendar className="size-4 text-blue-400 shrink-0" />
                    {isTodayActive ? (
                        <span>
                            Menampilkan data <strong>Hari Ini</strong> ({new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}).
                        </span>
                    ) : (startDate || endDate) ? (
                        <span>
                            Menampilkan data periode <strong>{startDate || 'Awal'}</strong> s/d <strong>{endDate || 'Sekarang'}</strong>.
                        </span>
                    ) : (
                        <span>
                            Menampilkan <strong>Semua Riwayat Data</strong> (tanpa filter tanggal).
                        </span>
                    )}
                    {filters.search && (
                        <span className="bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-md text-[11px] border border-blue-700/50 ml-1">
                            Pencarian: "{filters.search}"
                        </span>
                    )}
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={handleTodayFilter}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            isTodayActive
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                        }`}
                    >
                        Hari Ini
                    </button>
                    <button
                        onClick={handleYesterdayFilter}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                    >
                        Kemarin
                    </button>
                    <button
                        onClick={handleLast7DaysFilter}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                    >
                        7 Hari Terakhir
                    </button>
                    <button
                        onClick={handleThisMonthFilter}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                    >
                        Bulan Ini
                    </button>
                    <button
                        onClick={handleAllDatesFilter}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            !startDate && !endDate
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                        }`}
                    >
                        Semua Periode
                    </button>
                </div>
            </div>

            {/* Comprehensive KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
                {/* Total Checkpoints */}
                <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">Total Checkpoint</span>
                        <div className="size-8 rounded-lg bg-blue-950/70 border border-blue-800 flex items-center justify-center text-blue-400">
                            <MapPin className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-white">{totalCp}</div>
                        <span className="text-[10px] text-slate-500">Titik aktif terdaftar</span>
                    </div>
                </div>

                {/* Covered Checkpoints */}
                <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">Titik Terpatroli</span>
                        <div className="size-8 rounded-lg bg-emerald-950/70 border border-emerald-800 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-emerald-400">{coveredCp}</span>
                            <span className="text-xs font-mono text-emerald-500 font-semibold">({coveragePct}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, coveragePct)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Missed Checkpoints */}
                <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">Belum Discan</span>
                        <div className="size-8 rounded-lg bg-rose-950/70 border border-rose-800 flex items-center justify-center text-rose-400">
                            <AlertCircle className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-rose-400">{missedCp}</div>
                        <span className="text-[10px] text-rose-400/80">
                            {missedCp > 0 ? 'Titik perlu dironda' : 'Seluruh titik tercover!'}
                        </span>
                    </div>
                </div>

                {/* Total Scans */}
                <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">Total Scan</span>
                        <div className="size-8 rounded-lg bg-blue-950/70 border border-blue-800 flex items-center justify-center text-blue-400">
                            <TrendingUp className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-blue-400">{metrics.total_scans}x</div>
                        <span className="text-[10px] text-slate-500">Akumulasi scan periode ini</span>
                    </div>
                </div>

                {/* Avg Distance */}
                <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">Rata-rata Jarak</span>
                        <div className="size-8 rounded-lg bg-cyan-950/70 border border-cyan-800 flex items-center justify-center text-cyan-400">
                            <Activity className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-cyan-400">{metrics.avg_distance}m</div>
                        <span className="text-[10px] text-slate-500">Presisi GPS scanner satpam</span>
                    </div>
                </div>

                {/* Total Anomalies / Temuan */}
                <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">Temuan / Masalah</span>
                        <div className="size-8 rounded-lg bg-amber-950/70 border border-amber-800 flex items-center justify-center text-amber-400">
                            <ShieldAlert className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-amber-400">
                            {metrics.total_anomalies ?? 0}
                        </div>
                        <span className="text-[10px] text-slate-500">Laporan catatan abnormal</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar & Export Actions */}
            <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Filter className="size-4 text-blue-400" />
                        <span>Filter:</span>
                    </div>

                    {/* Site Filter */}
                    <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="rounded-xl bg-[#141e33] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                        <option value="">Semua Site / Gedung</option>
                        {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                                {site.name} ({site.code})
                            </option>
                        ))}
                    </select>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-xl bg-[#141e33] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                            title="Dari Tanggal"
                        />
                        <span className="text-xs text-slate-500">s/d</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-xl bg-[#141e33] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                            title="Sampai Tanggal"
                        />
                    </div>

                    <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                        <span>Terapkan</span>
                    </button>

                    {(selectedSiteId || !isTodayActive || searchQuery) && (
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                            title="Reset ke Hari Ini"
                        >
                            <RotateCcw className="size-3.5" />
                            <span>Reset (Hari Ini)</span>
                        </button>
                    )}
                </form>

                {/* Export & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Field */}
                    <form onSubmit={handleSearchSubmit} className="relative min-w-[220px]">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari satpam, titik, catatan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#141e33] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </form>

                    {/* Export Excel Button */}
                    <button
                        onClick={handleTriggerExcelExport}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 text-xs font-semibold shadow-sm transition-all cursor-pointer hover:border-emerald-600"
                        title="Ekspor rekapitulasi checkpoint ke file Microsoft Excel (.xlsx)"
                    >
                        <FileSpreadsheet className="size-4 text-emerald-400" />
                        <span>Export Excel</span>
                    </button>

                    {/* PDF Viewer Button */}
                    <button
                        onClick={() => setIsPdfViewerOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                        title="Buka pratinjau dokumen resmi dan cetak / unduh PDF"
                    >
                        <FileText className="size-4 text-white" />
                        <span>Buka PDF Viewer</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* TAB 1: Sesi & Putaran Patroli                            */}
            {/* ======================================================== */}
            {activeTab === 'sessions' && (
                <div className="space-y-4">
                    {sessions.data.length === 0 ? (
                        <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-12 text-center text-slate-400 space-y-2">
                            <ShieldCheck className="size-12 mx-auto text-slate-600 mb-2" />
                            <p className="font-semibold text-white">Tidak ada data sesi patroli pada periode ini.</p>
                            <p className="text-xs text-slate-500">Coba ubah filter site atau rentang tanggal di atas.</p>
                        </div>
                    ) : (
                        sessions.data.map((session) => (
                            <div
                                key={session.id}
                                className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 space-y-4 shadow-sm hover:border-slate-700 transition-all"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-950 border border-blue-800 font-bold text-blue-400 text-sm">
                                            R{session.round_number}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-white">
                                                    Patroli Round {session.round_number} • {session.site?.name}
                                                </h3>
                                                <span
                                                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                                                        session.status === 'completed'
                                                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                                                    }`}
                                                >
                                                    {session.status === 'completed' ? 'Selesai' : 'Sedang Berjalan'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <User className="size-3 text-slate-500" />
                                                    {session.user?.name} ({session.user?.badge_number || 'Satpam'})
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-3 text-slate-500" />
                                                    {new Date(session.started_at).toLocaleTimeString('id-ID')} WIB
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-lg font-mono">
                                            {session.logs?.length || 0} Titik Selesai
                                        </span>
                                    </div>
                                </div>

                                {/* Checkpoints Scanned in this session */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {session.logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="rounded-xl bg-[#141e33] border border-slate-800 p-3 space-y-2 text-xs"
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <div className="font-semibold text-white line-clamp-1">
                                                    {log.checkpoint?.name}
                                                </div>
                                                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                                <span>
                                                    Jarak: <strong className="text-emerald-400">{log.distance_meters}m</strong>
                                                </span>
                                                <span>{new Date(log.scanned_at).toLocaleTimeString('id-ID')}</span>
                                            </div>

                                            {log.selfie_photo_path && (
                                                <button
                                                    onClick={() => openPhoto(log.selfie_photo_path)}
                                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 py-1 text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
                                                >
                                                    <Eye className="size-3" />
                                                    <span>Lihat Foto Watermark</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: Rekapitulasi per Titik Checkpoint                 */}
            {/* ======================================================== */}
            {activeTab === 'recap' && (
                <div className="space-y-4">
                    {/* Sub-Filters: Status & Condition Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0f172a] border border-slate-800 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                                <ListFilter className="size-3.5 text-blue-400" />
                                Status Titik:
                            </span>
                            <button
                                onClick={() => setRecapStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                    recapStatusFilter === 'all'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-[#141e33] text-slate-400 hover:text-white border border-slate-700'
                                }`}
                            >
                                Semua Titik ({totalCp})
                            </button>
                            <button
                                onClick={() => setRecapStatusFilter('covered')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                    recapStatusFilter === 'covered'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-[#141e33] text-emerald-400/90 hover:text-emerald-300 border border-slate-700'
                                }`}
                            >
                                Sudah Discan ({coveredCp})
                            </button>
                            <button
                                onClick={() => setRecapStatusFilter('missed')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                    recapStatusFilter === 'missed'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : 'bg-[#141e33] text-rose-400/90 hover:text-rose-300 border border-slate-700'
                                }`}
                            >
                                Belum Discan / Missed ({missedCp})
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                                <Shield className="size-3.5 text-amber-400" />
                                Kondisi:
                            </span>
                            <button
                                onClick={() => setRecapConditionFilter('all')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                    recapConditionFilter === 'all'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-[#141e33] text-slate-400 hover:text-white border border-slate-700'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setRecapConditionFilter('normal')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                    recapConditionFilter === 'normal'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-[#141e33] text-slate-300 hover:text-white border border-slate-700'
                                }`}
                            >
                                Normal Saja
                            </button>
                            <button
                                onClick={() => setRecapConditionFilter('issue')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                    recapConditionFilter === 'issue'
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'bg-[#141e33] text-amber-400/90 hover:text-amber-300 border border-slate-700'
                                }`}
                            >
                                Ada Temuan ({metrics.total_anomalies ?? 0})
                            </button>
                        </div>
                    </div>

                    {/* Detailed Checkpoint Table */}
                    <div className="rounded-2xl bg-[#0f172a] border border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-[#131b2e] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                    <tr>
                                        <th className="px-4 py-3.5">No / Kode</th>
                                        <th className="px-4 py-3.5">Nama Titik Checkpoint</th>
                                        <th className="px-4 py-3.5">Lokasi Site</th>
                                        <th className="px-4 py-3.5 text-center">Toleransi Radius</th>
                                        <th className="px-4 py-3.5 text-center">Frekuensi Scan</th>
                                        <th className="px-4 py-3.5 text-center">Rata-rata Jarak</th>
                                        <th className="px-4 py-3.5">Status Kepatuhan</th>
                                        <th className="px-4 py-3.5">Scan Terakhir</th>
                                        <th className="px-4 py-3.5 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80">
                                    {filteredCheckpoints.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-12 text-center text-slate-500 space-y-2">
                                                <Shield className="size-10 mx-auto text-slate-700" />
                                                <p className="font-semibold text-slate-400">
                                                    Tidak ada data titik checkpoint yang sesuai filter.
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    Coba ubah filter status, site, atau rentang tanggal.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCheckpoints.map((cp, idx) => (
                                            <tr
                                                key={cp.id}
                                                className="hover:bg-slate-800/40 transition-colors group"
                                            >
                                                <td className="px-4 py-3.5 font-mono font-bold text-blue-400 whitespace-nowrap">
                                                    #{cp.order_index || idx + 1} • {cp.code}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                                                        {cp.name}
                                                    </div>
                                                    <div className="font-mono text-[10px] text-slate-500">
                                                        Token: {cp.qr_token}
                                                    </div>
                                                    {cp.location_description && (
                                                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 italic">
                                                            {cp.location_description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                                                    <span className="font-medium">{cp.site_name}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-mono text-[11px] font-semibold">
                                                        Maks {cp.max_radius_meters}m
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                            cp.total_scans > 0
                                                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                                                        }`}
                                                    >
                                                        {cp.total_scans}x Scan
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center font-mono whitespace-nowrap">
                                                    {cp.avg_distance_meters !== null ? (
                                                        <span className="text-emerald-400 font-bold">
                                                            {cp.avg_distance_meters}m
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {cp.total_scans === 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800 text-[10px] font-bold">
                                                            <AlertCircle className="size-3" />
                                                            <span>MISSED / 0 SCAN</span>
                                                        </span>
                                                    ) : (cp.abnormal_scans || 0) > 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800 text-[10px] font-bold">
                                                            <AlertTriangle className="size-3" />
                                                            <span>ADA TEMUAN ({cp.abnormal_scans})</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                                                            <CheckCircle2 className="size-3" />
                                                            <span>TERCOVER (NORMAL)</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {cp.last_scanned_at ? (
                                                        <div>
                                                            <div className="font-semibold text-white">
                                                                {cp.last_scanned_at} WIB
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                <User className="size-3 text-slate-500" />
                                                                <span>
                                                                    Oleh: <strong className="text-blue-400">{cp.last_guard_name}</strong>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 italic text-[11px]">
                                                            Belum pernah discan
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <button
                                                        onClick={() => setSelectedCheckpointDetail(cp)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                                                        title="Lihat Detail Riwayat & Audit Scan Titik Ini"
                                                    >
                                                        <Eye className="size-3.5 text-blue-400" />
                                                        <span>Detail Audit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* Modal Detail & Inspector Riwayat Checkpoint              */}
            {/* ======================================================== */}
            <CheckpointInspectorModal
                checkpoint={selectedCheckpointDetail}
                onClose={() => setSelectedCheckpointDetail(null)}
                onOpenPhoto={openPhoto}
                filters={{
                    site_id: selectedSiteId,
                    site_name: selectedSiteObj ? selectedSiteObj.name : 'Semua Site / Gedung',
                    start_date: startDate,
                    end_date: endDate,
                    search: searchQuery,
                    is_today: isTodayActive,
                }}
            />

            {/* ======================================================== */}
            {/* Interactive Official PDF Document Viewer Modal           */}
            {/* ======================================================== */}
            <CheckpointPdfViewer
                isOpen={isPdfViewerOpen}
                onClose={() => setIsPdfViewerOpen(false)}
                checkpoints={filteredCheckpoints}
                metrics={metrics}
                filters={{
                    site_id: selectedSiteId,
                    site_name: selectedSiteObj ? selectedSiteObj.name : 'Semua Site / Gedung',
                    start_date: startDate,
                    end_date: endDate,
                    search: searchQuery,
                    is_today: isTodayActive,
                }}
                onExportExcel={handleTriggerExcelExport}
                onOpenPhoto={openPhoto}
            />

            {/* ======================================================== */}
            {/* Modal Preview Foto Selfie Ber-watermark                   */}
            {/* ======================================================== */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                    <div className="relative max-w-2xl w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <ShieldCheck className="size-4 text-emerald-400" />
                                <span>Foto Selfie Petugas Ber-watermark</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <a
                                    href={selectedPhoto}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                                    title="Buka di tab baru"
                                >
                                    <ExternalLink className="size-4" />
                                </a>
                                <button
                                    onClick={() => {
                                        setSelectedPhoto(null);
                                        setImageError(false);
                                    }}
                                    className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Tutup"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 min-h-[300px] flex items-center justify-center bg-black/90">
                            {imageError ? (
                                <div className="text-center p-6 space-y-2">
                                    <AlertCircle className="size-10 text-amber-400 mx-auto" />
                                    <p className="text-sm font-semibold text-slate-200">Foto selfie tidak dapat dimuat</p>
                                    <p className="text-xs text-slate-400 max-w-md font-mono bg-slate-900 p-2 rounded border border-slate-800 break-all">
                                        Path: {selectedPhoto}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        Pastikan folder storage terhubung (`php artisan storage:link`) dan file gambar tersedia.
                                    </p>
                                </div>
                            ) : (
                                <img
                                    src={selectedPhoto}
                                    alt="Foto Selfie Watermark"
                                    className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
                                    onError={() => setImageError(true)}
                                />
                            )}
                        </div>
                        <div className="p-3 bg-[#0c1222] text-center text-xs text-slate-400 border-t border-slate-800 flex items-center justify-between px-4">
                            <span>Bukti selfie dan watermark terverifikasi sistem GPS & Checkpoint.</span>
                            <a
                                href={selectedPhoto}
                                download
                                className="text-blue-400 hover:text-blue-300 font-medium underline"
                            >
                                Unduh Foto
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
