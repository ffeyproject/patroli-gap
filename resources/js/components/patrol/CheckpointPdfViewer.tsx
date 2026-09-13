import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Layers,
    MapPin,
    Maximize2,
    Minimize2,
    Printer,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { CheckpointRecapExport, ExportFilters, ExportMetrics } from '@/lib/patrol-export';

interface CheckpointPdfViewerProps {
    isOpen: boolean;
    onClose: () => void;
    checkpoints: CheckpointRecapExport[];
    metrics: ExportMetrics;
    filters: ExportFilters;
    onExportExcel?: () => void;
    onOpenPhoto?: (path?: string | null) => void;
}

export default function CheckpointPdfViewer({
    isOpen,
    onClose,
    checkpoints,
    metrics,
    filters,
    onExportExcel,
    onOpenPhoto,
}: CheckpointPdfViewerProps) {
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'summary' | 'full'>('full');
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const printContainerRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const todayDateStr = new Date().toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
    });

    const periodStr = filters.is_today
        ? `Hari Ini (${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})`
        : filters.start_date || filters.end_date
        ? `${filters.start_date || 'Awal'} s/d ${filters.end_date || 'Sekarang'}`
        : 'Semua Periode Riwayat Operasional';

    const siteStr = filters.site_name || 'Seluruh Site / Gedung Area';

    const coveredCount = metrics.covered_checkpoints ?? checkpoints.filter((c) => c.total_scans > 0).length;
    const totalCpCount = metrics.total_checkpoints || checkpoints.length;
    const missedCount = metrics.missed_checkpoints ?? Math.max(0, totalCpCount - coveredCount);
    const coveragePct = metrics.coverage_percentage ?? (totalCpCount > 0 ? Math.round((coveredCount / totalCpCount) * 100) : 0);

    const filteredCheckpointsForDoc = checkpoints.filter((cp) => {
        if (!searchFilter) return true;
        const q = searchFilter.toLowerCase();
        return (
            cp.name.toLowerCase().includes(q) ||
            cp.code.toLowerCase().includes(q) ||
            cp.site_name.toLowerCase().includes(q) ||
            (cp.last_guard_name && cp.last_guard_name.toLowerCase().includes(q))
        );
    });

    const allLogsList = filteredCheckpointsForDoc.flatMap((cp) =>
        cp.recent_logs.map((log) => ({
            ...log,
            checkpoint_code: cp.code,
            checkpoint_name: cp.name,
            site_name: cp.site_name,
            max_radius_meters: cp.max_radius_meters,
        }))
    );

    const logsWithPhotos = allLogsList.filter((log) => log.selfie_photo_path);

    const getPhotoUrl = (path?: string | null): string => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        if (!cleanPath.startsWith('storage/')) {
            return `/storage/${cleanPath}`;
        }
        return `/${cleanPath}`;
    };

    // Trigger Native Browser Print Dialog
    const handlePrint = () => {
        window.print();
    };

    // Trigger Direct High-Quality PDF Download via HTML2Canvas + jsPDF
    const handleDownloadPdf = async () => {
        if (!printContainerRef.current) return;
        setIsGeneratingPdf(true);

        try {
            const element = printContainerRef.current;
            const originalTransform = element.style.transform;
            element.style.transform = 'scale(1)';

            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1200,
            });

            element.style.transform = originalTransform;

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pageHeight;
            }

            const cleanFileName = `Laporan_Rekap_Patroli_${(filters.start_date || 'ALL').replace(/-/g, '')}.pdf`;
            pdf.save(cleanFileName);
        } catch (error) {
            console.error('Gagal membuat file PDF:', error);
            // Fallback to native print if canvas failed
            window.print();
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 150));
    const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
    const handleResetZoom = () => setZoomLevel(100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            {/* Main Modal Card */}
            <div
                className={`relative w-full bg-[#0b1120] border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all ${
                    isFullscreen ? 'h-full max-w-full' : 'h-[94vh] max-w-6xl'
                }`}
            >
                {/* PDF Viewer Top Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0f172a] border-b border-slate-800 shrink-0 select-none">
                    <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                            <FileText className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                Pratinjau Dokumen Rekap Checkpoint
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
                                    PDF Viewer
                                </span>
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Format Laporan Resmi Keamanan PT. Gajah Angkasa Perkasa
                            </p>
                        </div>
                    </div>

                    {/* Toolbar Controls */}
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="hidden sm:flex items-center bg-[#131d33] p-1 rounded-xl border border-slate-700 text-xs">
                            <button
                                onClick={() => setViewMode('summary')}
                                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                                    viewMode === 'summary'
                                        ? 'bg-blue-600 text-white font-semibold'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Ringkasan Titik
                            </button>
                            <button
                                onClick={() => setViewMode('full')}
                                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                                    viewMode === 'full'
                                        ? 'bg-blue-600 text-white font-semibold'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Lengkap + Log Audit
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center bg-[#131d33] p-1 rounded-xl border border-slate-700 text-xs text-slate-300">
                            <button
                                onClick={handleZoomOut}
                                className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                                title="Perkecil (Zoom Out)"
                            >
                                <ZoomOut className="size-4" />
                            </button>
                            <button
                                onClick={handleResetZoom}
                                className="px-2 font-mono text-[11px] hover:text-white cursor-pointer"
                                title="Reset 100%"
                            >
                                {zoomLevel}%
                            </button>
                            <button
                                onClick={handleZoomIn}
                                className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                                title="Perbesar (Zoom In)"
                            >
                                <ZoomIn className="size-4" />
                            </button>
                        </div>

                        {/* Export Excel Shortcut */}
                        {onExportExcel && (
                            <button
                                onClick={onExportExcel}
                                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                                title="Ekspor juga ke file Excel (.xlsx)"
                            >
                                <FileSpreadsheet className="size-4 text-emerald-400" />
                                <span>Excel</span>
                            </button>
                        )}

                        {/* Direct Print Button */}
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                            title="Cetak via dialog printer browser"
                        >
                            <Printer className="size-4 text-slate-300" />
                            <span className="hidden sm:inline">Cetak</span>
                        </button>

                        {/* Download PDF Button */}
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-blue-600/30"
                            title="Unduh file PDF ke komputer"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <RefreshCw className="size-4 animate-spin text-white" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="size-4" />
                                    <span>Unduh PDF</span>
                                </>
                            )}
                        </button>

                        {/* Fullscreen Toggle */}
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                        </button>

                        {/* Close Modal */}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                            title="Tutup Viewer"
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                </div>

                {/* PDF Document Container Scroll Area */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 bg-[#070b14] flex justify-center items-start">
                    {/* The Printable A4 Sheet Paper */}
                    <div
                        id="printable-report-document"
                        ref={printContainerRef}
                        style={{
                            transform: `scale(${zoomLevel / 100})`,
                            transformOrigin: 'top center',
                        }}
                        className="w-full max-w-[840px] bg-white text-slate-900 rounded-sm shadow-2xl p-8 sm:p-10 transition-transform duration-150 relative font-sans print:p-0 print:shadow-none print:max-w-none print:transform-none"
                    >
                        {/* ======================================================== */}
                        {/* 1. KOP SURAT RESMI PERUSAHAAN (COMPANY HEADER)            */}
                        {/* ======================================================== */}
                        <div className="border-b-2 border-slate-900 pb-4 mb-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="size-14 rounded-xl bg-blue-900 flex items-center justify-center text-white font-black text-2xl tracking-tighter shadow-md shrink-0">
                                        GAP
                                    </div>
                                    <div>
                                        <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase leading-none">
                                            PT. Gajah Angkasa Perkasa
                                        </h1>
                                        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider mt-1">
                                            Divisi Keamanan & Perlindungan Aset (Security & Safety)
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                            Sistem Patroli Mandiri Terverifikasi QR & GPS Watermark
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="inline-block px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900 font-mono text-[11px] font-bold">
                                        LAPORAN AUDIT CHECKPOINT
                                    </span>
                                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                        Ref: GAP-SEC-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Title of Document */}
                        <div className="text-center mb-6">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                                Rekapitulasi Audit & Log Titik Checkpoint Patroli
                            </h2>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Evaluasi Kepatuhan Ronda Satpam, Jarak Akurasi Radius GPS, dan Temuan Kondisi Lapangan
                            </p>
                        </div>

                        {/* ======================================================== */}
                        {/* 2. PARAMETER EVALUASI & METADATA GRID                    */}
                        {/* ======================================================== */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-6">
                            <div>
                                <span className="text-[10px] font-medium text-slate-500 uppercase block">
                                    Periode Evaluasi
                                </span>
                                <strong className="text-slate-900 font-semibold">{periodStr}</strong>
                            </div>
                            <div>
                                <span className="text-[10px] font-medium text-slate-500 uppercase block">
                                    Cakupan Site / Lokasi
                                </span>
                                <strong className="text-slate-900 font-semibold">{siteStr}</strong>
                            </div>
                            <div>
                                <span className="text-[10px] font-medium text-slate-500 uppercase block">
                                    Waktu Cetak Laporan
                                </span>
                                <span className="text-slate-800">{todayDateStr} WIB</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-medium text-slate-500 uppercase block">
                                    Tingkat Kepatuhan (Coverage)
                                </span>
                                <strong
                                    className={`font-mono font-bold ${
                                        coveragePct >= 80 ? 'text-emerald-700' : 'text-amber-700'
                                    }`}
                                >
                                    {coveragePct}% Selesai
                                </strong>
                            </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 3. EXECUTIVE KPI SCORECARD (RINGKASAN METRIK)             */}
                        {/* ======================================================== */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center mb-6">
                            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                                <span className="text-[10px] text-slate-600 block">Total Checkpoint</span>
                                <span className="text-lg font-black text-slate-900">{totalCpCount}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                                <span className="text-[10px] text-emerald-800 block">Terpatroli</span>
                                <span className="text-lg font-black text-emerald-700">{coveredCount}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                                <span className="text-[10px] text-rose-800 block">Belum Discan</span>
                                <span className="text-lg font-black text-rose-700">{missedCount}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                                <span className="text-[10px] text-blue-900 block">Total Frekuensi Scan</span>
                                <span className="text-lg font-black text-blue-800">{metrics.total_scans}x</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-cyan-50 border border-cyan-200">
                                <span className="text-[10px] text-cyan-900 block">Rata-rata Jarak</span>
                                <span className="text-lg font-black text-cyan-800">{metrics.avg_distance}m</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                <span className="text-[10px] text-amber-900 block">Temuan Masalah</span>
                                <span className="text-lg font-black text-amber-800">{metrics.total_anomalies ?? 0}</span>
                            </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 4. TABEL 1: REKAPITULASI CHECKPOINT (PER TITIK)          */}
                        {/* ======================================================== */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin className="size-3.5 text-blue-700" />
                                    I. Matriks Rekapitulasi Titik Checkpoint
                                </h3>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    Menampilkan {filteredCheckpointsForDoc.length} Titik
                                </span>
                            </div>

                            <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                                    <tr>
                                        <th className="border border-slate-300 px-2 py-2 text-center w-8">No</th>
                                        <th className="border border-slate-300 px-2.5 py-2">Kode & Nama Checkpoint</th>
                                        <th className="border border-slate-300 px-2.5 py-2">Site / Gedung</th>
                                        <th className="border border-slate-300 px-2 py-2 text-center">Radius</th>
                                        <th className="border border-slate-300 px-2 py-2 text-center">Scan</th>
                                        <th className="border border-slate-300 px-2 py-2 text-center">Rata-rata Jarak</th>
                                        <th className="border border-slate-300 px-2.5 py-2">Status Kepatuhan</th>
                                        <th className="border border-slate-300 px-2.5 py-2">Scan Terakhir</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCheckpointsForDoc.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="border border-slate-300 p-4 text-center text-slate-500 italic">
                                                Tidak ada data checkpoint yang cocok.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCheckpointsForDoc.map((cp, idx) => (
                                            <tr key={cp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                                <td className="border border-slate-300 px-2 py-1.5 text-center font-mono text-[10px]">
                                                    {idx + 1}
                                                </td>
                                                <td className="border border-slate-300 px-2.5 py-1.5">
                                                    <div className="font-bold text-slate-900">{cp.name}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                        Kode: {cp.code} • Token: {cp.qr_token}
                                                    </div>
                                                    {cp.location_description && (
                                                        <div className="text-[9px] text-slate-600 italic">
                                                            Loc: {cp.location_description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="border border-slate-300 px-2.5 py-1.5 text-slate-800">
                                                    {cp.site_name}
                                                </td>
                                                <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                                                    {cp.max_radius_meters}m
                                                </td>
                                                <td className="border border-slate-300 px-2 py-1.5 text-center font-bold font-mono">
                                                    {cp.total_scans > 0 ? (
                                                        <span className="text-blue-900">{cp.total_scans}x</span>
                                                    ) : (
                                                        <span className="text-rose-600">0x</span>
                                                    )}
                                                </td>
                                                <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                                                    {cp.avg_distance_meters !== null ? `${cp.avg_distance_meters}m` : '-'}
                                                </td>
                                                <td className="border border-slate-300 px-2.5 py-1.5">
                                                    {cp.total_scans === 0 ? (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                            BELUM DISCAN
                                                        </span>
                                                    ) : (cp.abnormal_scans || 0) > 0 ? (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                            ADA TEMUAN
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                            TERCOVER (NORMAL)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border border-slate-300 px-2.5 py-1.5 text-[10px]">
                                                    {cp.last_scanned_at ? (
                                                        <div>
                                                            <strong className="text-slate-900">{cp.last_guard_name}</strong>
                                                            <div className="text-slate-500">{cp.last_scanned_at} WIB</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ======================================================== */}
                        {/* 5. TABEL 2: LOG DETAIL AUDIT SCAN KRONOLOGIS             */}
                        {/* ======================================================== */}
                        {viewMode === 'full' && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <Activity className="size-3.5 text-blue-700" />
                                        II. Log Audit Kronologis Scan Lapangan
                                    </h3>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        Total {allLogsList.length} Catatan Log
                                    </span>
                                </div>

                                <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                                    <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[9px]">
                                        <tr>
                                            <th className="border border-slate-300 px-2 py-1.5 text-center w-8">No</th>
                                            <th className="border border-slate-300 px-2 py-1.5">Waktu Scan (WIB)</th>
                                            <th className="border border-slate-300 px-2 py-1.5">Titik Checkpoint</th>
                                            <th className="border border-slate-300 px-2 py-1.5">Petugas Satpam</th>
                                            <th className="border border-slate-300 px-2 py-1.5 text-center">Jarak (m)</th>
                                            <th className="border border-slate-300 px-2 py-1.5 text-center">Status Toleransi</th>
                                            <th className="border border-slate-300 px-2 py-1.5 text-center">Kondisi</th>
                                            <th className="border border-slate-300 px-2 py-1.5">Catatan Temuan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allLogsList.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="border border-slate-300 p-4 text-center text-slate-500 italic">
                                                    Belum ada riwayat aktivitas scan pada periode ini.
                                                </td>
                                            </tr>
                                        ) : (
                                            allLogsList.slice(0, 100).map((log, idx) => {
                                                const isValid = log.distance_meters <= log.max_radius_meters;
                                                return (
                                                    <tr key={log.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="border border-slate-300 px-2 py-1.5 font-mono">
                                                            {log.scanned_at}
                                                        </td>
                                                        <td className="border border-slate-300 px-2 py-1.5">
                                                            <strong>{log.checkpoint_name}</strong>
                                                            <span className="text-slate-500 block text-[9px] font-mono">
                                                                {log.checkpoint_code} • {log.site_name}
                                                            </span>
                                                        </td>
                                                        <td className="border border-slate-300 px-2 py-1.5">
                                                            <strong>{log.guard_name}</strong>
                                                            <span className="text-slate-500 block text-[9px] font-mono">
                                                                Badge: {log.guard_badge}
                                                            </span>
                                                        </td>
                                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold">
                                                            {log.distance_meters}m
                                                        </td>
                                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                                                            {isValid ? (
                                                                <span className="text-emerald-700 font-semibold">Valid</span>
                                                            ) : (
                                                                <span className="text-rose-700 font-bold">Di Luar Batas</span>
                                                            )}
                                                        </td>
                                                        <td className="border border-slate-300 px-2 py-1.5 text-center">
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                    log.condition_status === 'normal'
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : 'bg-amber-100 text-amber-800'
                                                                }`}
                                                            >
                                                                {(log.condition_status || 'normal').toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="border border-slate-300 px-2 py-1.5 text-slate-700 italic">
                                                            {log.notes || '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* 6. SECTION FOTO SELFIE WATERMARK PREVIEWS                */}
                        {/* ======================================================== */}
                        {logsWithPhotos.length > 0 && (
                            <div className="mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <ShieldCheck className="size-3.5 text-blue-700" />
                                    III. Bukti Foto Selfie Petugas Ber-watermark
                                </h3>
                                <p className="text-[10px] text-slate-500 mb-3">
                                    Sampel foto selfie ronda satpam dengan watermark koordinat, waktu, dan verifikasi geofence:
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {logsWithPhotos.slice(0, 6).map((log, idx) => (
                                        <div
                                            key={log.id || idx}
                                            className="rounded border border-slate-300 overflow-hidden bg-white text-center cursor-pointer hover:border-blue-600 transition-colors"
                                            onClick={() => onOpenPhoto?.(log.selfie_photo_path)}
                                            title="Klik untuk perbesar foto watermark"
                                        >
                                            <div className="h-20 bg-slate-200 overflow-hidden flex items-center justify-center">
                                                <img
                                                    src={getPhotoUrl(log.selfie_photo_path)}
                                                    alt="Selfie Watermark"
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                            <div className="p-1 text-[9px] truncate font-semibold text-slate-800">
                                                {log.guard_name}
                                            </div>
                                            <div className="text-[8px] text-slate-500 font-mono pb-1">
                                                {log.checkpoint_code}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* 7. FORMAL SIGNATURE BLOCKS (TANDA TANGAN PENGESAHAN)     */}
                        {/* ======================================================== */}
                        <div className="mt-8 pt-4 border-t border-slate-300">
                            <div className="grid grid-cols-3 gap-4 text-center text-xs">
                                <div>
                                    <p className="text-[11px] text-slate-600">Dibuat Oleh,</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Petugas Ronda / Danru</p>
                                    <div className="h-16 flex items-end justify-center">
                                        <div className="w-32 border-b border-slate-800"></div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-900 mt-1">Personil Security GAP</p>
                                </div>

                                <div>
                                    <p className="text-[11px] text-slate-600">Diperiksa Oleh,</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Chief Security / Supervisor</p>
                                    <div className="h-16 flex items-end justify-center">
                                        <div className="w-32 border-b border-slate-800"></div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-900 mt-1">Komandan Regu (Danru)</p>
                                </div>

                                <div>
                                    <p className="text-[11px] text-slate-600">Diketahui Oleh,</p>
                                    <p className="text-[10px] text-slate-500 font-medium">HR & General Affairs</p>
                                    <div className="h-16 flex items-end justify-center">
                                        <div className="w-32 border-b border-slate-800"></div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-900 mt-1">Manajemen PT. GAP</p>
                                </div>
                            </div>

                            <div className="text-center text-[9px] text-slate-400 mt-6 font-mono">
                                Dokumen ini dihasilkan secara otomatis oleh Patroli Management System PT. Gajah Angkasa Perkasa. Validitas scan terenkripsi QR token dan geofence GPS.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
