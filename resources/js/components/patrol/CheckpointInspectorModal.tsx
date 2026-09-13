import React, { useState } from 'react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    ExternalLink,
    FileSpreadsheet,
    MapPin,
    QrCode,
    Shield,
    ShieldCheck,
    User,
    Users,
    X,
} from 'lucide-react';
import { CheckpointRecapExport, exportCheckpointsToExcel, ExportFilters } from '@/lib/patrol-export';

interface CheckpointInspectorModalProps {
    checkpoint: CheckpointRecapExport | null;
    onClose: () => void;
    onOpenPhoto: (path?: string | null) => void;
    filters: ExportFilters;
}

export default function CheckpointInspectorModal({
    checkpoint,
    onClose,
    onOpenPhoto,
    filters,
}: CheckpointInspectorModalProps) {
    const [logSearch, setLogSearch] = useState<string>('');
    const [conditionFilter, setConditionFilter] = useState<'all' | 'normal' | 'issue'>('all');

    if (!checkpoint) return null;

    const filteredLogs = checkpoint.recent_logs.filter((log) => {
        if (conditionFilter === 'normal' && log.condition_status !== 'normal') return false;
        if (conditionFilter === 'issue' && log.condition_status === 'normal') return false;
        if (!logSearch) return true;
        const q = logSearch.toLowerCase();
        return (
            log.guard_name.toLowerCase().includes(q) ||
            log.guard_badge.toLowerCase().includes(q) ||
            (log.notes && log.notes.toLowerCase().includes(q)) ||
            log.scanned_at.toLowerCase().includes(q)
        );
    });

    const handleExportSingleToExcel = () => {
        exportCheckpointsToExcel(
            [checkpoint],
            {
                total_checkpoints: 1,
                covered_checkpoints: checkpoint.total_scans > 0 ? 1 : 0,
                missed_checkpoints: checkpoint.total_scans === 0 ? 1 : 0,
                coverage_percentage: checkpoint.total_scans > 0 ? 100 : 0,
                total_scans: checkpoint.total_scans,
                avg_distance: checkpoint.avg_distance_meters || 0,
                total_anomalies: checkpoint.abnormal_scans || 0,
                total_out_of_radius: checkpoint.invalid_location_scans || 0,
            },
            filters,
            `Rekap_${checkpoint.code.replace(/[^a-zA-Z0-9]/g, '_')}`
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5">
            <div className="relative w-full max-w-4xl bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#131b2e] shrink-0">
                    <div className="flex items-start gap-3">
                        <div className="size-11 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                            <MapPin className="size-6" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-white">
                                    {checkpoint.name}
                                </h2>
                                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-900/60 text-blue-300 border border-blue-700/60 font-semibold">
                                    {checkpoint.code}
                                </span>
                                <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        checkpoint.total_scans > 0
                                            ? (checkpoint.abnormal_scans || 0) > 0
                                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                                    }`}
                                >
                                    {checkpoint.total_scans > 0
                                        ? (checkpoint.abnormal_scans || 0) > 0
                                            ? 'Ada Temuan Masalah'
                                            : 'Terpatroli Normal'
                                        : 'Belum Discan (Missed)'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {checkpoint.site_name} • Toleransi Radius:{' '}
                                <strong className="text-cyan-400 font-mono">
                                    {checkpoint.max_radius_meters}m
                                </strong>{' '}
                                • QR Token:{' '}
                                <span className="font-mono text-slate-300">{checkpoint.qr_token}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportSingleToExcel}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                            title="Ekspor rekap titik ini ke Excel"
                        >
                            <FileSpreadsheet className="size-4 text-emerald-400" />
                            <span>Ekspor Titik Ini</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                </div>

                {/* Checkpoint Detail KPI Matrix */}
                <div className="p-4 sm:p-5 bg-[#0d1424] border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
                    <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-medium">Total Scan Periode Ini</span>
                        <div className="text-xl font-bold font-mono text-white">
                            {checkpoint.total_scans}x
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-medium">Scan Normal</span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                            {checkpoint.normal_scans ?? (checkpoint.last_condition_status === 'normal' ? checkpoint.total_scans : 0)}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-medium">Temuan / Anomali</span>
                        <div className="text-xl font-bold font-mono text-amber-400">
                            {checkpoint.abnormal_scans ?? 0}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-medium">Rata-rata Jarak GPS</span>
                        <div className="text-xl font-bold font-mono text-cyan-400">
                            {checkpoint.avg_distance_meters !== null ? `${checkpoint.avg_distance_meters}m` : '-'}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141e33] border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-medium">Personil Satpam</span>
                        <div className="text-xl font-bold font-mono text-blue-400">
                            {checkpoint.unique_guards ? checkpoint.unique_guards.length : 1} Orang
                        </div>
                    </div>
                </div>

                {/* Location Description & GPS Specs */}
                {checkpoint.location_description && (
                    <div className="px-5 py-2.5 bg-blue-950/30 border-b border-blue-900/40 text-xs text-blue-200 flex items-center gap-2">
                        <MapPin className="size-4 text-blue-400 shrink-0" />
                        <span>
                            <strong>Petunjuk Penempatan / Deskripsi:</strong> {checkpoint.location_description}
                        </span>
                    </div>
                )}

                {/* Timeline Controls */}
                <div className="px-5 py-3 bg-[#0f172a] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <Clock className="size-4 text-blue-400" />
                        <span>Riwayat Scan Kronologis ({filteredLogs.length})</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Condition Filter */}
                        <div className="flex items-center bg-[#141e33] p-0.5 rounded-lg border border-slate-700 text-xs">
                            <button
                                onClick={() => setConditionFilter('all')}
                                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                    conditionFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setConditionFilter('normal')}
                                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                    conditionFilter === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Normal
                            </button>
                            <button
                                onClick={() => setConditionFilter('issue')}
                                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                    conditionFilter === 'issue' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Temuan
                            </button>
                        </div>

                        {/* Search in logs */}
                        <input
                            type="text"
                            placeholder="Cari satpam / catatan..."
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            className="rounded-lg bg-[#141e33] border border-slate-700 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Timeline Body */}
                <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-800/80">
                    {filteredLogs.length === 0 ? (
                        <div className="py-14 text-center text-slate-500 space-y-2">
                            <Shield className="size-10 mx-auto text-slate-700" />
                            <p className="font-semibold text-slate-400">Tidak ada data log scan yang cocok.</p>
                            <p className="text-xs text-slate-600">
                                Checkpoint ini belum memiliki riwayat scan pada rentang filter yang dipilih.
                            </p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => {
                            const isWithinRadius = log.distance_meters <= checkpoint.max_radius_meters;
                            return (
                                <div
                                    key={log.id}
                                    className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-white text-xs flex items-center gap-1.5">
                                                <User className="size-3.5 text-blue-400" />
                                                {log.guard_name}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                                Badge: {log.guard_badge}
                                            </span>
                                            {log.round_number && (
                                                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                                                    Round {log.round_number}
                                                </span>
                                            )}
                                            <span
                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                    log.condition_status === 'normal'
                                                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                                                }`}
                                            >
                                                {(log.condition_status || 'normal').toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                                            <span className="flex items-center gap-1 text-slate-300">
                                                <Clock className="size-3 text-slate-500" />
                                                Waktu: <strong className="text-white">{log.scanned_at} WIB</strong>
                                            </span>
                                            <span>
                                                Jarak Scan:{' '}
                                                <strong className={isWithinRadius ? 'text-emerald-400' : 'text-rose-400'}>
                                                    {log.distance_meters}m
                                                </strong>
                                                <span className="text-[10px] text-slate-500 ml-1">
                                                    (Maks {checkpoint.max_radius_meters}m)
                                                </span>
                                            </span>
                                            {log.latitude && log.longitude && (
                                                <span className="text-[11px] text-slate-500">
                                                    GPS: {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                                                </span>
                                            )}
                                        </div>

                                        {log.notes && (
                                            <div className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl mt-1">
                                                <strong>Catatan / Temuan:</strong> {log.notes}
                                            </div>
                                        )}
                                    </div>

                                    {log.selfie_photo_path && (
                                        <button
                                            onClick={() => onOpenPhoto(log.selfie_photo_path)}
                                            className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                                        >
                                            <Eye className="size-4" />
                                            <span>Lihat Foto Watermark</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
