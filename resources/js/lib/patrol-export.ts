import ExcelJS from 'exceljs';
import { toast } from 'sonner';

export interface CheckpointLogExport {
    id: number;
    session_id?: number;
    round_number?: number;
    scanned_at: string;
    guard_name: string;
    guard_badge: string;
    latitude?: number;
    longitude?: number;
    distance_meters: number;
    is_valid_location?: boolean;
    condition_status: string;
    selfie_photo_path?: string;
    notes?: string;
}

export interface CheckpointRecapExport {
    id: number;
    name: string;
    code: string;
    qr_token: string;
    location_description?: string;
    site_id: number;
    site_name: string;
    site_code?: string;
    max_radius_meters: number;
    order_index: number;
    is_active: boolean;
    latitude: number;
    longitude: number;
    total_scans: number;
    normal_scans?: number;
    abnormal_scans?: number;
    valid_location_scans?: number;
    invalid_location_scans?: number;
    avg_distance_meters: number | null;
    min_distance_meters?: number | null;
    max_distance_meters?: number | null;
    unique_guards?: Array<{ name: string; badge: string }>;
    status_compliance?: string;
    last_scanned_at: string | null;
    last_guard_name: string | null;
    last_guard_badge: string | null;
    last_condition_status: string;
    last_notes?: string | null;
    last_distance_meters?: number | null;
    recent_logs: CheckpointLogExport[];
}

export interface SessionExportData {
    id: number;
    patrol_schedule_id?: number;
    round_number: number;
    status: string;
    started_at: string;
    completed_at?: string;
    notes?: string;
    site: { id: number; name: string; code: string; checkpoints?: Array<{ id: number; name: string }> };
    schedule?: {
        id: number;
        shift_name: string;
        start_time: string;
        end_time: string;
        min_patrol_rounds: number;
    } | null;
    user: { name: string; role: string; badge_number?: string };
    logs: Array<{
        id: number;
        scanned_at: string;
        distance_meters: number;
        selfie_photo_path?: string;
        condition_status: string;
        checkpoint: { name: string; code: string };
        user?: { id: number; name: string; badge_number?: string };
        is_valid_location?: boolean;
        notes?: string;
    }>;
}

export interface ExportFilters {
    site_id?: number | string;
    site_name?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    is_today?: boolean;
}

export interface ExportMetrics {
    total_checkpoints: number;
    covered_checkpoints?: number;
    missed_checkpoints?: number;
    coverage_percentage?: number;
    total_scans: number;
    avg_distance: number;
    total_anomalies?: number;
    total_out_of_radius?: number;
}

const getPhotoUrl = (path?: string | null): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (!cleanPath.startsWith('storage/')) {
        return `/storage/${cleanPath}`;
    }
    return `/${cleanPath}`;
};

async function fetchImageBase64(url: string): Promise<{ base64: string; extension: 'jpeg' | 'png' } | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        const extension: 'jpeg' | 'png' = blob.type.includes('png') ? 'png' : 'jpeg';
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                if (!res) return resolve(null);
                const parts = res.split(',');
                if (parts.length < 2) return resolve(null);
                resolve({ base64: parts[1], extension });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Navy Blue
};

const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FFFFFFFF' },
};

const subHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' }, // Slate 700
};

export async function exportCheckpointsToExcel(
    checkpoints: CheckpointRecapExport[],
    metrics: ExportMetrics,
    filters: ExportFilters,
    sessionsOrPrefix?: SessionExportData[] | string,
    fileNamePrefix = 'Rekap_Patroli_Keamanan'
) {
    const toastId = 'excel-patrol-export';
    toast.loading('Mempersiapkan dokumen Excel beserta foto selfie...', { id: toastId });

    try {
        let sessions: SessionExportData[] = [];
        let actualPrefix = fileNamePrefix;

        if (typeof sessionsOrPrefix === 'string') {
            actualPrefix = sessionsOrPrefix;
        } else if (Array.isArray(sessionsOrPrefix)) {
            sessions = sessionsOrPrefix;
        }

        const wb = new ExcelJS.Workbook();
        wb.creator = 'PT. GAJAH ANGKASA PERKASA';
        wb.lastModifiedBy = 'Sistem Patroli Security';
        wb.created = new Date();
        wb.modified = new Date();

        const todayDateStr = new Date().toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });

        const periodStr = filters.is_today
            ? `Hari Ini (${new Date().toLocaleDateString('id-ID')})`
            : filters.start_date || filters.end_date
            ? `${filters.start_date || 'Awal'} s/d ${filters.end_date || 'Sekarang'}`
            : 'Semua Periode Riwayat';

        const siteStr = filters.site_name || 'Semua Site / Gedung';

        // Image cache to avoid downloading duplicated selfie URLs
        const imageCache = new Map<string, { base64: string; extension: 'jpeg' | 'png' } | null>();

        const getCachedImage = async (path?: string | null) => {
            if (!path) return null;
            const fullUrl = getPhotoUrl(path);
            if (imageCache.has(fullUrl)) {
                return imageCache.get(fullUrl) || null;
            }
            const imgData = await fetchImageBase64(fullUrl);
            imageCache.set(fullUrl, imgData);
            return imgData;
        };

        // =========================================================================
        // SHEET 1: Rekap Checkpoint & Bukti Foto Selfie
        // =========================================================================
        const wsCp = wb.addWorksheet('Rekap Checkpoint', {
            views: [{ showGridLines: true }],
        });

        // Setup columns
        wsCp.columns = [
            { width: 6 },  // 1: No
            { width: 24 }, // 2: Nama Satpam
            { width: 16 }, // 3: Badge / NIK
            { width: 20 }, // 4: Shift / Jadwal
            { width: 14 }, // 5: Putaran (Round)
            { width: 14 }, // 6: Kode Titik
            { width: 30 }, // 7: Nama Titik Checkpoint
            { width: 34 }, // 8: Deskripsi Lokasi
            { width: 24 }, // 9: Site / Gedung
            { width: 22 }, // 10: Waktu Scan
            { width: 18 }, // 11: Radius Toleransi
            { width: 16 }, // 12: Jarak GPS
            { width: 22 }, // 13: Status Validasi GPS
            { width: 16 }, // 14: Kondisi Checkpoint
            { width: 24 }, // 15: Status Kepatuhan
            { width: 36 }, // 16: Catatan & Temuan
            { width: 24 }, // 17: Bukti Foto Selfie
        ];

        // Title Rows
        wsCp.addRow(['PT. GAJAH ANGKASA PERKASA - SISTEM PATROLI KEAMANAN']);
        wsCp.addRow(['LAPORAN REKAPITULASI AUDIT HASIL PATROLI PETUGAS & CHECKPOINT']);
        wsCp.addRow([]);
        wsCp.addRow(['Periode Evaluasi', periodStr]);
        wsCp.addRow(['Cakupan Site / Lokasi', siteStr]);
        wsCp.addRow(['Waktu Ekspor Dokumen', `${todayDateStr} WIB`]);
        wsCp.addRow(['Filter Pencarian', filters.search || 'Semua Data']);
        wsCp.addRow([]);

        // Format Title & Info Header
        wsCp.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
        wsCp.getCell('A2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };

        for (let r = 4; r <= 7; r++) {
            wsCp.getCell(`A${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
            wsCp.getCell(`B${r}`).font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
        }

        // Table Header
        const tableHeaderRow1 = wsCp.addRow([
            'No',
            'Nama Petugas Satpam',
            'No Badge / NIK',
            'Shift / Jadwal',
            'Putaran (Round)',
            'Kode Titik',
            'Nama Titik Checkpoint',
            'Deskripsi / Petunjuk Lokasi',
            'Site / Gedung',
            'Waktu Scan (WIB)',
            'Toleransi Radius (m)',
            'Jarak Scan GPS (m)',
            'Status Validasi GPS',
            'Kondisi Checkpoint',
            'Status Kepatuhan',
            'Catatan & Temuan Lapangan',
            'Bukti Foto Selfie',
        ]);
        tableHeaderRow1.height = 28;

        tableHeaderRow1.eachCell((cell) => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = thinBorder;
        });

        // Collect logs for Sheet 1
        interface LogItemToExport {
            no: number;
            guardName: string;
            guardBadge: string;
            shiftName: string;
            roundLabel: string;
            cpCode: string;
            cpName: string;
            locDesc: string;
            siteName: string;
            scanTime: string;
            maxRad: number | string;
            dist: number | string;
            isValidGps: string;
            cond: string;
            compliance: string;
            notes: string;
            selfiePath?: string;
        }

        const logItems: LogItemToExport[] = [];
        let seqNumber = 1;

        if (sessions && sessions.length > 0) {
            sessions.forEach((session) => {
                const shiftName = session.schedule?.shift_name || '-';
                const guardName = session.user?.name || 'Petugas';
                const guardBadge = session.user?.badge_number || '-';
                const roundLabel = `Round ${session.round_number}`;
                const siteName = session.site?.name || '-';

                session.logs?.forEach((log) => {
                    const cpInfo = checkpoints.find((c) => c.code === log.checkpoint?.code || c.name === log.checkpoint?.name);
                    const maxRad = cpInfo ? cpInfo.max_radius_meters : 10;
                    const locDesc = cpInfo?.location_description || '-';
                    const dist = log.distance_meters !== null && log.distance_meters !== undefined ? log.distance_meters : '-';
                    const isValid = typeof dist === 'number' ? dist <= maxRad : true;
                    const cond = (log.condition_status || 'normal').toUpperCase();
                    const compliance = cond === 'NORMAL' ? 'TERCOVER (NORMAL)' : 'ADA TEMUAN LAPANGAN';

                    let scanTime = '-';
                    if (log.scanned_at) {
                        scanTime = log.scanned_at.includes('T')
                            ? new Date(log.scanned_at).toLocaleString('id-ID')
                            : log.scanned_at;
                        if (!scanTime.includes('WIB')) scanTime += ' WIB';
                    }

                    logItems.push({
                        no: seqNumber++,
                        guardName: log.user?.name || guardName,
                        guardBadge: log.user?.badge_number || guardBadge,
                        shiftName,
                        roundLabel,
                        cpCode: log.checkpoint?.code || cpInfo?.code || '-',
                        cpName: log.checkpoint?.name || cpInfo?.name || '-',
                        locDesc,
                        siteName,
                        scanTime,
                        maxRad,
                        dist,
                        isValidGps: isValid ? 'Sesuai Radius' : 'Di Luar Toleransi GPS',
                        cond,
                        compliance,
                        notes: log.notes || '-',
                        selfiePath: log.selfie_photo_path,
                    });
                });
            });
        } else {
            checkpoints.forEach((cp) => {
                if (cp.recent_logs && cp.recent_logs.length > 0) {
                    cp.recent_logs.forEach((log) => {
                        const isValid = log.distance_meters <= cp.max_radius_meters;
                        const cond = (log.condition_status || 'normal').toUpperCase();
                        const compliance = cond === 'NORMAL' ? 'TERCOVER (NORMAL)' : 'ADA TEMUAN LAPANGAN';
                        logItems.push({
                            no: seqNumber++,
                            guardName: log.guard_name || cp.last_guard_name || 'Petugas',
                            guardBadge: log.guard_badge || cp.last_guard_badge || '-',
                            shiftName: log.round_number ? `Round ${log.round_number}` : 'Sesi Patroli',
                            roundLabel: log.round_number ? `Round ${log.round_number}` : '-',
                            cpCode: cp.code,
                            cpName: cp.name,
                            locDesc: cp.location_description || '-',
                            siteName: cp.site_name,
                            scanTime: log.scanned_at ? `${log.scanned_at} WIB` : '-',
                            maxRad: cp.max_radius_meters,
                            dist: log.distance_meters,
                            isValidGps: isValid ? 'Sesuai Radius' : 'Di Luar Toleransi GPS',
                            cond,
                            compliance,
                            notes: log.notes || '-',
                            selfiePath: log.selfie_photo_path,
                        });
                    });
                } else {
                    logItems.push({
                        no: seqNumber++,
                        guardName: '-',
                        guardBadge: '-',
                        shiftName: '-',
                        roundLabel: '-',
                        cpCode: cp.code,
                        cpName: cp.name,
                        locDesc: cp.location_description || '-',
                        siteName: cp.site_name,
                        scanTime: 'Belum Pernah',
                        maxRad: cp.max_radius_meters,
                        dist: '-',
                        isValidGps: '-',
                        cond: 'BELUM DISCAN',
                        compliance: 'BELUM DISCAN (MISSED)',
                        notes: '-',
                        selfiePath: undefined,
                    });
                }
            });
        }

        if (logItems.length === 0) {
            const emptyRow = wsCp.addRow(['-', '-', '-', '-', '-', '-', 'Tidak ada data scan patroli pada periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']);
            emptyRow.height = 24;
            emptyRow.eachCell((c) => {
                c.border = thinBorder;
                c.alignment = { vertical: 'middle', horizontal: 'center' };
            });
        } else {
            for (let i = 0; i < logItems.length; i++) {
                const item = logItems[i];
                const hasPhoto = Boolean(item.selfiePath);

                const dataRow = wsCp.addRow([
                    item.no,
                    item.guardName,
                    item.guardBadge,
                    item.shiftName,
                    item.roundLabel,
                    item.cpCode,
                    item.cpName,
                    item.locDesc,
                    item.siteName,
                    item.scanTime,
                    item.maxRad,
                    item.dist,
                    item.isValidGps,
                    item.cond,
                    item.compliance,
                    item.notes,
                    hasPhoto ? '' : 'Tidak Ada',
                ]);

                const rowIndex = dataRow.number;

                // Adjust row height for image display
                if (hasPhoto) {
                    dataRow.height = 76;
                } else {
                    dataRow.height = 24;
                }

                // Apply styles to row
                dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.border = thinBorder;
                    cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1E293B' } };

                    if (i % 2 === 1) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF8FAFC' },
                        };
                    }

                    // Alignments
                    if ([1, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 17].includes(colNumber)) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                    }

                    // Highlight anomalies or outside radius
                    if (colNumber === 13 && item.isValidGps.includes('Luar')) {
                        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FFDC2626' }, bold: true };
                    }
                    if (colNumber === 14 && item.cond !== 'NORMAL' && item.cond !== 'BELUM DISCAN') {
                        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FFD97706' }, bold: true };
                    }
                    if (colNumber === 17 && !hasPhoto) {
                        cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF94A3B8' }, italic: true };
                    }
                });

                // Embed Selfie Image into Column 17 (Index 16 in 0-based)
                if (hasPhoto && item.selfiePath) {
                    const imgData = await getCachedImage(item.selfiePath);
                    if (imgData) {
                        const imageId = wb.addImage({
                            base64: imgData.base64,
                            extension: imgData.extension,
                        });

                        wsCp.addImage(imageId, {
                            tl: { col: 16.12, row: rowIndex - 1 + 0.08 },
                            ext: { width: 70, height: 70 },
                            editAs: 'oneCell',
                        });
                    } else {
                        wsCp.getCell(`Q${rowIndex}`).value = 'Foto Tidak Dapat Dimuat';
                        wsCp.getCell(`Q${rowIndex}`).font = { name: 'Calibri', size: 8.5, color: { argb: 'FF94A3B8' }, italic: true };
                    }
                }
            }
        }

        // =========================================================================
        // SHEET 2: Sesi & Putaran Patroli Petugas (Ringkasan per Ronde/Shift)
        // =========================================================================
        if (sessions && sessions.length > 0) {
            const wsSessions = wb.addWorksheet('Sesi Patroli Petugas', {
                views: [{ showGridLines: true }],
            });

            wsSessions.columns = [
                { width: 6 },  // No
                { width: 24 }, // Nama Satpam
                { width: 16 }, // Badge
                { width: 28 }, // Site
                { width: 20 }, // Shift
                { width: 20 }, // Jam Shift
                { width: 15 }, // Round
                { width: 18 }, // Status
                { width: 22 }, // Mulai
                { width: 22 }, // Selesai
                { width: 18 }, // Titik Selesai
                { width: 16 }, // Total Titik
                { width: 18 }, // % Selesai
                { width: 36 }, // Catatan
            ];

            wsSessions.addRow(['PT. GAJAH ANGKASA PERKASA - SISTEM PATROLI KEAMANAN']);
            wsSessions.addRow(['LAPORAN SESI & PUTARAN (RONDE) PATROLI PETUGAS KEAMANAN']);
            wsSessions.addRow([]);
            wsSessions.addRow(['Periode Evaluasi', periodStr]);
            wsSessions.addRow(['Cakupan Site / Lokasi', siteStr]);
            wsSessions.addRow(['Waktu Ekspor Dokumen', `${todayDateStr} WIB`]);
            wsSessions.addRow(['Filter Pencarian', filters.search || 'Semua Data']);
            wsSessions.addRow([]);

            wsSessions.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
            wsSessions.getCell('A2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };

            for (let r = 4; r <= 7; r++) {
                wsSessions.getCell(`A${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
                wsSessions.getCell(`B${r}`).font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
            }

            const headerRow2 = wsSessions.addRow([
                'No',
                'Nama Petugas Satpam',
                'No Badge / NIK',
                'Site / Gedung',
                'Shift / Jadwal',
                'Jam Shift',
                'Putaran (Round)',
                'Status Sesi',
                'Waktu Mulai (WIB)',
                'Waktu Selesai (WIB)',
                'Titik Selesai Discan',
                'Total Titik Site',
                'Persentase Selesai',
                'Catatan Ronde',
            ]);
            headerRow2.height = 28;
            headerRow2.eachCell((c) => {
                c.fill = headerFill;
                c.font = headerFont;
                c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                c.border = thinBorder;
            });

            sessions.forEach((session, idx) => {
                const totalSiteCp = session.site?.checkpoints?.length || metrics.total_checkpoints || 10;
                const scannedCount = session.logs?.length || 0;
                const completionPct = totalSiteCp > 0 ? Math.round((scannedCount / totalSiteCp) * 100) : 0;

                const shiftName = session.schedule?.shift_name || '-';
                const shiftTime = session.schedule?.start_time && session.schedule?.end_time
                    ? `${session.schedule.start_time.slice(0, 5)} - ${session.schedule.end_time.slice(0, 5)} WIB`
                    : '-';

                const statusLabel = session.status === 'completed'
                    ? 'SELESAI'
                    : session.status === 'in_progress'
                    ? 'SEDANG BERJALAN'
                    : session.status.toUpperCase();

                const row = wsSessions.addRow([
                    idx + 1,
                    session.user?.name || 'Petugas',
                    session.user?.badge_number || '-',
                    session.site?.name || '-',
                    shiftName,
                    shiftTime,
                    `Round ${session.round_number}`,
                    statusLabel,
                    session.started_at ? new Date(session.started_at).toLocaleString('id-ID') : '-',
                    session.completed_at ? new Date(session.completed_at).toLocaleString('id-ID') : (session.status === 'completed' ? 'Selesai' : '-'),
                    `${scannedCount} Titik`,
                    `${totalSiteCp} Titik`,
                    `${completionPct}%`,
                    session.notes || '-',
                ]);
                row.height = 24;
                row.eachCell((c, colNum) => {
                    c.border = thinBorder;
                    c.font = { name: 'Calibri', size: 9.5 };
                    if (idx % 2 === 1) {
                        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    }
                    if ([1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(colNum)) {
                        c.alignment = { vertical: 'middle', horizontal: 'center' };
                    } else {
                        c.alignment = { vertical: 'middle', horizontal: 'left' };
                    }
                });
            });
        }

        // =========================================================================
        // SHEET 3: Ringkasan Agregat per Titik Checkpoint
        // =========================================================================
        const wsAgg = wb.addWorksheet('Ringkasan per Checkpoint', {
            views: [{ showGridLines: true }],
        });

        wsAgg.columns = [
            { width: 6 },  // No
            { width: 14 }, // Kode
            { width: 30 }, // Nama
            { width: 34 }, // Lokasi
            { width: 24 }, // Site
            { width: 18 }, // Radius
            { width: 14 }, // Total
            { width: 14 }, // Normal
            { width: 14 }, // Temuan
            { width: 18 }, // Sesuai Radius
            { width: 18 }, // Di Luar
            { width: 18 }, // Avg Distance
            { width: 40 }, // Petugas
            { width: 26 }, // Kepatuhan
        ];

        wsAgg.addRow(['PT. GAJAH ANGKASA PERKASA - SISTEM PATROLI KEAMANAN']);
        wsAgg.addRow(['RINGKASAN TOTAL SCAN PER TITIK CHECKPOINT (AGREGAT)']);
        wsAgg.addRow([]);
        wsAgg.addRow(['Periode Evaluasi', periodStr]);
        wsAgg.addRow(['Cakupan Site / Lokasi', siteStr]);
        wsAgg.addRow(['Waktu Ekspor Dokumen', `${todayDateStr} WIB`]);
        wsAgg.addRow([]);

        wsAgg.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
        wsAgg.getCell('A2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };

        for (let r = 4; r <= 6; r++) {
            wsAgg.getCell(`A${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
            wsAgg.getCell(`B${r}`).font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
        }

        const headerRow3 = wsAgg.addRow([
            'No',
            'Kode Titik',
            'Nama Titik Checkpoint',
            'Deskripsi / Lokasi',
            'Site / Gedung',
            'Toleransi Radius (m)',
            'Total Scan (x)',
            'Scan Normal',
            'Scan Temuan',
            'Scan Sesuai Radius',
            'Scan Di Luar Radius',
            'Rata-rata Jarak (m)',
            'Petugas yang Pernah Patroli',
            'Status Kepatuhan',
        ]);
        headerRow3.height = 28;
        headerRow3.eachCell((c) => {
            c.fill = headerFill;
            c.font = headerFont;
            c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            c.border = thinBorder;
        });

        checkpoints.forEach((cp, idx) => {
            const complianceText =
                cp.total_scans === 0
                    ? 'BELUM DISCAN (MISSED)'
                    : (cp.abnormal_scans || 0) > 0
                    ? 'ADA TEMUAN LAPANGAN'
                    : 'TERCOVER (NORMAL)';

            const guardSet = new Map<string, string>();
            if (cp.unique_guards) {
                cp.unique_guards.forEach((g) => {
                    if (g.name) guardSet.set(g.name, g.badge || '-');
                });
            }
            sessions.forEach((s) => {
                s.logs?.forEach((l) => {
                    if (l.checkpoint?.code === cp.code || l.checkpoint?.name === cp.name) {
                        const gName = l.user?.name || s.user?.name;
                        const gBadge = l.user?.badge_number || s.user?.badge_number || '-';
                        if (gName) guardSet.set(gName, gBadge);
                    }
                });
            });

            const allGuardsStr = guardSet.size > 0
                ? Array.from(guardSet.entries()).map(([name, badge]) => `${name} (${badge})`).join(', ')
                : '-';

            const row = wsAgg.addRow([
                idx + 1,
                cp.code,
                cp.name,
                cp.location_description || '-',
                cp.site_name,
                cp.max_radius_meters,
                cp.total_scans,
                cp.normal_scans ?? (cp.last_condition_status === 'normal' ? cp.total_scans : 0),
                cp.abnormal_scans ?? (cp.last_condition_status !== 'normal' && cp.total_scans > 0 ? 1 : 0),
                cp.valid_location_scans ?? cp.total_scans,
                cp.invalid_location_scans ?? 0,
                cp.avg_distance_meters !== null ? cp.avg_distance_meters : '-',
                allGuardsStr,
                complianceText,
            ]);
            row.height = 24;
            row.eachCell((c, colNum) => {
                c.border = thinBorder;
                c.font = { name: 'Calibri', size: 9.5 };
                if (idx % 2 === 1) {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
                if ([1, 2, 6, 7, 8, 9, 10, 11, 12, 14].includes(colNum)) {
                    c.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    c.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        });

        // =========================================================================
        // SHEET 4: Ringkasan & KPI Eksekutif
        // =========================================================================
        const wsKpi = wb.addWorksheet('KPI & Ringkasan', {
            views: [{ showGridLines: true }],
        });

        wsKpi.columns = [
            { width: 6 },
            { width: 36 },
            { width: 22 },
            { width: 22 },
            { width: 24 },
            { width: 26 },
        ];

        const coveredCount = metrics.covered_checkpoints ?? checkpoints.filter((c) => c.total_scans > 0).length;
        const totalCpCount = metrics.total_checkpoints || checkpoints.length;
        const missedCount = metrics.missed_checkpoints ?? Math.max(0, totalCpCount - coveredCount);
        const coveragePct = metrics.coverage_percentage ?? (totalCpCount > 0 ? Math.round((coveredCount / totalCpCount) * 100) : 0);

        const guardStatsMap = new Map<string, { name: string; badge: string; scanCount: number; sessionCount: number; sumDistance: number }>();

        sessions.forEach((s) => {
            const key = s.user?.name || 'Satpam';
            const current = guardStatsMap.get(key) || {
                name: key,
                badge: s.user?.badge_number || '-',
                scanCount: 0,
                sessionCount: 0,
                sumDistance: 0,
            };
            current.sessionCount += 1;
            s.logs?.forEach((l) => {
                current.scanCount += 1;
                current.sumDistance += l.distance_meters || 0;
            });
            guardStatsMap.set(key, current);
        });

        checkpoints.forEach((cp) => {
            cp.recent_logs?.forEach((log) => {
                const key = log.guard_name || 'Satpam';
                if (!guardStatsMap.has(key)) {
                    guardStatsMap.set(key, {
                        name: key,
                        badge: log.guard_badge || '-',
                        scanCount: 1,
                        sessionCount: 1,
                        sumDistance: log.distance_meters || 0,
                    });
                }
            });
        });

        wsKpi.addRow(['PT. GAJAH ANGKASA PERKASA - EXECUTIVE KPI PATROLI SECURITY']);
        wsKpi.addRow(['RINGKASAN TINGKAT KEPATUHAN & KINERJA CHECKPOINT']);
        wsKpi.addRow([]);

        wsKpi.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
        wsKpi.getCell('A2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };

        const kpiHeader = wsKpi.addRow(['Parameter', 'Nilai Metrik', 'Keterangan']);
        kpiHeader.height = 26;
        kpiHeader.eachCell((c) => {
            c.fill = headerFill;
            c.font = headerFont;
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.border = thinBorder;
        });

        const kpiRowsData = [
            ['Periode Evaluasi', periodStr, 'Rentang waktu data'],
            ['Cakupan Lokasi', siteStr, 'Site yang dianalisis'],
            ['Total Checkpoint Terdaftar', `${totalCpCount} Titik`, 'Jumlah titik aktif dalam sistem'],
            ['Titik Terpatroli (Covered)', `${coveredCount} Titik`, 'Titik yang minimal pernah discan 1x'],
            ['Titik Belum Discan (Missed)', `${missedCount} Titik`, 'Titik yang terlewat / 0 scan'],
            ['Persentase Kepatuhan (Coverage Rate)', `${coveragePct}%`, 'Rasio titik selesai patroli'],
            ['Total Sesi / Ronde Patroli', sessions.length > 0 ? `${sessions.length} Sesi` : '-', 'Total sesi ronde yang tercatat'],
            ['Total Seluruh Frekuensi Scan', `${metrics.total_scans}x Scan`, 'Total akumulasi scan QR'],
            ['Rata-rata Jarak Akurasi GPS', `${metrics.avg_distance} meter`, 'Tingkat presisi scanner satpam'],
            ['Total Temuan / Kondisi Abnormal', `${metrics.total_anomalies ?? 0} Laporan`, 'Laporan insiden / kendala di checkpoint'],
            ['Total Scan Melebihi Toleransi Radius', `${metrics.total_out_of_radius ?? 0} Scan`, 'Scan terindikasi di luar batas geofence'],
        ];

        kpiRowsData.forEach((row, i) => {
            const r = wsKpi.addRow(row);
            r.height = 22;
            r.eachCell((c, colNum) => {
                c.border = thinBorder;
                c.font = { name: 'Calibri', size: 9.5 };
                if (i % 2 === 1) {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
                if (colNum === 1) {
                    c.alignment = { vertical: 'middle', horizontal: 'left' };
                    c.font = { name: 'Calibri', size: 9.5, bold: true };
                } else if (colNum === 2) {
                    c.alignment = { vertical: 'middle', horizontal: 'center' };
                    c.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
                } else {
                    c.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        });

        wsKpi.addRow([]);
        const guardTitleRow = wsKpi.addRow(['REKAPITULASI AKTIVITAS SELURUH PETUGAS SATPAM PADA PERIODE INI']);
        guardTitleRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };

        const guardHeader = wsKpi.addRow(['No', 'Nama Personil Satpam', 'Nomor Badge / NIK', 'Total Sesi / Ronde', 'Total Titik Discan (x)', 'Rata-rata Jarak GPS (m)']);
        guardHeader.height = 26;
        guardHeader.eachCell((c) => {
            c.fill = subHeaderFill;
            c.font = headerFont;
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.border = thinBorder;
        });

        let guardIdx = 1;
        guardStatsMap.forEach((g) => {
            const avgGDist = g.scanCount > 0 ? (g.sumDistance / g.scanCount).toFixed(1) : '0';
            const gr = wsKpi.addRow([guardIdx++, g.name, g.badge, `${g.sessionCount} Sesi`, g.scanCount, `${avgGDist}m`]);
            gr.height = 22;
            gr.eachCell((c, colNum) => {
                c.border = thinBorder;
                c.font = { name: 'Calibri', size: 9.5 };
                if (guardIdx % 2 === 0) {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
                if ([1, 3, 4, 5, 6].includes(colNum)) {
                    c.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    c.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        });

        if (guardStatsMap.size === 0) {
            const emptyGr = wsKpi.addRow(['-', 'Belum ada aktivitas patroli petugas pada periode ini', '-', '-', 0, '-']);
            emptyGr.height = 22;
            emptyGr.eachCell((c) => {
                c.border = thinBorder;
                c.alignment = { vertical: 'middle', horizontal: 'center' };
            });
        }

        // Generate and download the Excel file
        const dateFormattedForFile = (filters.start_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
        const cleanFileName = `${actualPrefix}_${dateFormattedForFile}.xlsx`;

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('File Excel berhasil diunduh.', { id: toastId });
    } catch (err) {
        console.error('Failed to export excel:', err);
        toast.error('Gagal mengekspor file Excel: ' + ((err as Error)?.message || 'Terjadi kesalahan.'), { id: toastId });
    }
}
