import * as XLSX from 'xlsx';

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

export function exportCheckpointsToExcel(
    checkpoints: CheckpointRecapExport[],
    metrics: ExportMetrics,
    filters: ExportFilters,
    sessionsOrPrefix?: SessionExportData[] | string,
    fileNamePrefix = 'Rekap_Patroli_Keamanan'
) {
    let sessions: SessionExportData[] = [];
    let actualPrefix = fileNamePrefix;

    if (typeof sessionsOrPrefix === 'string') {
        actualPrefix = sessionsOrPrefix;
    } else if (Array.isArray(sessionsOrPrefix)) {
        sessions = sessionsOrPrefix;
    }

    const wb = XLSX.utils.book_new();

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

    // =========================================================================
    // SHEET 1: Rekap Checkpoint per Petugas (20 Baris Berdasarkan Setiap Sesi Satpam)
    // =========================================================================
    const sheetCheckpointRows: Array<Array<string | number>> = [
        ['PT. GAJAH ANGKASA PERKASA - SISTEM PATROLI KEAMANAN'],
        ['LAPORAN REKAPITULASI AUDIT HASIL PATROLI PETUGAS & CHECKPOINT'],
        [],
        ['Periode Evaluasi', periodStr],
        ['Cakupan Site / Lokasi', siteStr],
        ['Waktu Ekspor Dokumen', `${todayDateStr} WIB`],
        ['Filter Pencarian', filters.search || 'Semua Data'],
        [],
        // Table Headers
        [
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
        ],
    ];

    let rowNumber = 1;

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
                const isValid = typeof dist === 'number' ? (dist <= maxRad) : true;
                const cond = (log.condition_status || 'normal').toUpperCase();
                const compliance = cond === 'NORMAL' ? 'TERCOVER (NORMAL)' : 'ADA TEMUAN LAPANGAN';

                let scanTime = '-';
                if (log.scanned_at) {
                    scanTime = log.scanned_at.includes('T')
                        ? new Date(log.scanned_at).toLocaleString('id-ID')
                        : log.scanned_at;
                    if (!scanTime.includes('WIB')) scanTime += ' WIB';
                }

                sheetCheckpointRows.push([
                    rowNumber++,
                    log.user?.name || guardName,
                    log.user?.badge_number || guardBadge,
                    shiftName,
                    roundLabel,
                    log.checkpoint?.code || cpInfo?.code || '-',
                    log.checkpoint?.name || cpInfo?.name || '-',
                    locDesc,
                    siteName,
                    scanTime,
                    maxRad,
                    dist,
                    isValid ? 'Sesuai Radius' : 'Di Luar Toleransi GPS',
                    cond,
                    compliance,
                    log.notes || '-',
                    log.selfie_photo_path ? 'Tersedia (Watermarked)' : 'Tidak Ada',
                ]);
            });
        });
    } else {
        checkpoints.forEach((cp) => {
            if (cp.recent_logs && cp.recent_logs.length > 0) {
                cp.recent_logs.forEach((log) => {
                    const isValid = log.distance_meters <= cp.max_radius_meters;
                    const cond = (log.condition_status || 'normal').toUpperCase();
                    const compliance = cond === 'NORMAL' ? 'TERCOVER (NORMAL)' : 'ADA TEMUAN LAPANGAN';
                    sheetCheckpointRows.push([
                        rowNumber++,
                        log.guard_name || cp.last_guard_name || 'Petugas',
                        log.guard_badge || cp.last_guard_badge || '-',
                        log.round_number ? `Round ${log.round_number}` : 'Sesi Patroli',
                        log.round_number ? `Round ${log.round_number}` : '-',
                        cp.code,
                        cp.name,
                        cp.location_description || '-',
                        cp.site_name,
                        log.scanned_at ? `${log.scanned_at} WIB` : '-',
                        cp.max_radius_meters,
                        log.distance_meters,
                        isValid ? 'Sesuai Radius' : 'Di Luar Toleransi GPS',
                        cond,
                        compliance,
                        log.notes || '-',
                        log.selfie_photo_path ? 'Tersedia (Watermarked)' : 'Tidak Ada',
                    ]);
                });
            } else {
                sheetCheckpointRows.push([
                    rowNumber++,
                    '-',
                    '-',
                    '-',
                    '-',
                    cp.code,
                    cp.name,
                    cp.location_description || '-',
                    cp.site_name,
                    'Belum Pernah',
                    cp.max_radius_meters,
                    '-',
                    '-',
                    'BELUM DISCAN',
                    'BELUM DISCAN (MISSED)',
                    '-',
                    'Tidak Ada',
                ]);
            }
        });
    }

    if (rowNumber === 1) {
        sheetCheckpointRows.push(['-', '-', '-', '-', '-', '-', 'Tidak ada data scan patroli pada periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']);
    }

    const wsCp = XLSX.utils.aoa_to_sheet(sheetCheckpointRows);
    wsCp['!cols'] = [
        { wch: 5 },  // No
        { wch: 22 }, // Nama Satpam
        { wch: 15 }, // Badge
        { wch: 20 }, // Shift
        { wch: 14 }, // Round
        { wch: 12 }, // Kode
        { wch: 28 }, // Nama Checkpoint
        { wch: 32 }, // Lokasi
        { wch: 22 }, // Site
        { wch: 22 }, // Waktu Scan
        { wch: 18 }, // Radius Max
        { wch: 16 }, // Jarak GPS
        { wch: 22 }, // Status Validasi GPS
        { wch: 16 }, // Kondisi
        { wch: 24 }, // Kepatuhan
        { wch: 35 }, // Catatan
        { wch: 22 }, // Foto
    ];
    XLSX.utils.book_append_sheet(wb, wsCp, 'Rekap Checkpoint');

    // =========================================================================
    // SHEET 2: Sesi & Putaran Patroli Petugas (Ringkasan per Ronde/Shift)
    // =========================================================================
    if (sessions && sessions.length > 0) {
        const sheetSessionsRows: Array<Array<string | number>> = [
            ['PT. GAJAH ANGKASA PERKASA - SISTEM PATROLI KEAMANAN'],
            ['LAPORAN SESI & PUTARAN (RONDE) PATROLI PETUGAS KEAMANAN'],
            [],
            ['Periode Evaluasi', periodStr],
            ['Cakupan Site / Lokasi', siteStr],
            ['Waktu Ekspor Dokumen', `${todayDateStr} WIB`],
            ['Filter Pencarian', filters.search || 'Semua Data'],
            [],
            // Headers
            [
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
            ],
        ];

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

            sheetSessionsRows.push([
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
        });

        const wsSessions = XLSX.utils.aoa_to_sheet(sheetSessionsRows);
        wsSessions['!cols'] = [
            { wch: 5 },  // No
            { wch: 24 }, // Nama Satpam
            { wch: 16 }, // Badge
            { wch: 28 }, // Site
            { wch: 20 }, // Shift
            { wch: 20 }, // Jam Shift
            { wch: 15 }, // Round
            { wch: 18 }, // Status
            { wch: 22 }, // Mulai
            { wch: 22 }, // Selesai
            { wch: 18 }, // Titik Selesai
            { wch: 16 }, // Total Titik
            { wch: 18 }, // % Selesai
            { wch: 35 }, // Catatan
        ];
        XLSX.utils.book_append_sheet(wb, wsSessions, 'Sesi Patroli Petugas');
    }

    // =========================================================================
    // SHEET 3: Ringkasan Agregat per Titik Checkpoint (10 Titik Unik)
    // =========================================================================
    const sheetAggregateRows: Array<Array<string | number>> = [
        ['PT. GAJAH ANGKASA PERKASA - SISTEM PATROLI KEAMANAN'],
        ['RINGKASAN TOTAL SCAN PER TITIK CHECKPOINT (AGREGAT)'],
        [],
        ['Periode Evaluasi', periodStr],
        ['Cakupan Site / Lokasi', siteStr],
        ['Waktu Ekspor Dokumen', `${todayDateStr} WIB`],
        [],
        [
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
        ],
    ];

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

        sheetAggregateRows.push([
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
    });

    const wsAgg = XLSX.utils.aoa_to_sheet(sheetAggregateRows);
    wsAgg['!cols'] = [
        { wch: 5 },  // No
        { wch: 12 }, // Kode
        { wch: 28 }, // Nama
        { wch: 32 }, // Lokasi
        { wch: 22 }, // Site
        { wch: 18 }, // Radius
        { wch: 14 }, // Total
        { wch: 14 }, // Normal
        { wch: 14 }, // Temuan
        { wch: 18 }, // Sesuai Radius
        { wch: 18 }, // Di Luar
        { wch: 18 }, // Avg Distance
        { wch: 38 }, // Petugas
        { wch: 24 }, // Kepatuhan
    ];
    XLSX.utils.book_append_sheet(wb, wsAgg, 'Ringkasan per Checkpoint');

    // =========================================================================
    // SHEET 4: Ringkasan & KPI Eksekutif
    // =========================================================================
    const coveredCount = metrics.covered_checkpoints ?? checkpoints.filter((c) => c.total_scans > 0).length;
    const totalCpCount = metrics.total_checkpoints || checkpoints.length;
    const missedCount = metrics.missed_checkpoints ?? Math.max(0, totalCpCount - coveredCount);
    const coveragePct = metrics.coverage_percentage ?? (totalCpCount > 0 ? Math.round((coveredCount / totalCpCount) * 100) : 0);

    const guardStatsMap = new Map<string, { name: string; badge: string; scanCount: number; sessionCount: number; sumDistance: number }>();

    // Tally from sessions
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

    // Tally from checkpoints logs if not in sessions
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

    const sheetKpiRows: Array<Array<string | number>> = [
        ['PT. GAJAH ANGKASA PERKASA - EXECUTIVE KPI PATROLI SECURITY'],
        ['RINGKASAN TINGKAT KEPATUHAN & KINERJA CHECKPOINT'],
        [],
        ['Parameter', 'Nilai Metrik', 'Keterangan'],
        ['Periode Evaluasi', periodStr, 'Rentang waktu data'],
        ['Cakupan Lokasi', siteStr, 'Site yang dianalisis'],
        ['Total Checkpoint Terdaftar', totalCpCount, 'Jumlah titik aktif dalam sistem'],
        ['Titik Terpatroli (Covered)', coveredCount, 'Titik yang minimal pernah discan 1x'],
        ['Titik Belum Discan (Missed)', missedCount, 'Titik yang terlewat / 0 scan'],
        ['Persentase Kepatuhan (Coverage Rate)', `${coveragePct}%`, 'Rasio titik selesai patroli'],
        ['Total Sesi / Ronde Patroli', sessions.length > 0 ? `${sessions.length} Sesi` : '-', 'Total sesi ronde yang tercatat'],
        ['Total Seluruh Frekuensi Scan', metrics.total_scans, 'Total akumulasi scan QR'],
        ['Rata-rata Jarak Akurasi GPS', `${metrics.avg_distance} meter`, 'Tingkat presisi scanner satpam'],
        ['Total Temuan / Kondisi Abnormal', metrics.total_anomalies ?? 0, 'Laporan insiden / kendala di checkpoint'],
        ['Total Scan Melebihi Toleransi Radius', metrics.total_out_of_radius ?? 0, 'Scan terindikasi di luar batas geofence'],
        [],
        ['REKAPITULASI AKTIVITAS SELURUH PETUGAS SATPAM PADA PERIODE INI'],
        ['No', 'Nama Personil Satpam', 'Nomor Badge / NIK', 'Total Sesi / Ronde', 'Total Titik Discan (x)', 'Rata-rata Jarak GPS (m)'],
    ];

    let guardIdx = 1;
    guardStatsMap.forEach((g) => {
        const avgGDist = g.scanCount > 0 ? (g.sumDistance / g.scanCount).toFixed(1) : '0';
        sheetKpiRows.push([guardIdx++, g.name, g.badge, `${g.sessionCount} Sesi`, g.scanCount, `${avgGDist}m`]);
    });

    if (guardStatsMap.size === 0) {
        sheetKpiRows.push(['-', 'Belum ada aktivitas patroli petugas pada periode ini', '-', '-', 0, '-']);
    }

    const wsKpi = XLSX.utils.aoa_to_sheet(sheetKpiRows);
    wsKpi['!cols'] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 },
        { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI & Ringkasan');

    // Download the Excel file
    const dateFormattedForFile = (filters.start_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const cleanFileName = `${actualPrefix}_${dateFormattedForFile}.xlsx`;

    XLSX.writeFile(wb, cleanFileName);
}
