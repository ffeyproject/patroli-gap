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
    fileNamePrefix = 'Rekap_Patroli_Checkpoint'
) {
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

    // ==========================================
    // SHEET 1: Rekap Titik Checkpoint
    // ==========================================
    const sheet1Rows: Array<Array<string | number>> = [
        ['PT. GAJAH ANGKASA PERKASA - SISTEM PATROLI KEAMANAN'],
        ['LAPORAN REKAPITULASI AUDIT TITIK CHECKPOINT PATROLI'],
        [],
        ['Periode Evaluasi', periodStr],
        ['Cakupan Site / Lokasi', siteStr],
        ['Waktu Ekspor Dokumen', `${todayDateStr} WIB`],
        ['Filter Pencarian', filters.search || 'Semua Data'],
        [],
        // Table Headers
        [
            'No',
            'Kode Titik',
            'Nama Titik Checkpoint',
            'Deskripsi / Petunjuk Lokasi',
            'Site / Gedung',
            'Toleransi Radius (m)',
            'Total Scan (x)',
            'Scan Normal',
            'Scan Temuan (Abnormal)',
            'Scan Sesuai Radius',
            'Scan Di Luar Radius',
            'Rata-rata Jarak (m)',
            'Jarak Terdekat (m)',
            'Jarak Terjauh (m)',
            'Status Kepatuhan',
            'Petugas Terakhir',
            'No Badge',
            'Kondisi Terakhir',
            'Waktu Scan Terakhir',
            'Catatan Terakhir',
        ],
    ];

    checkpoints.forEach((cp, idx) => {
        const complianceText =
            cp.total_scans === 0
                ? 'BELUM DISCAN (MISSED)'
                : (cp.abnormal_scans || 0) > 0
                ? 'ADA TEMUAN LAPANGAN'
                : 'TERCOVER (NORMAL)';

        sheet1Rows.push([
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
            cp.min_distance_meters !== null && cp.min_distance_meters !== undefined ? cp.min_distance_meters : '-',
            cp.max_distance_meters !== null && cp.max_distance_meters !== undefined ? cp.max_distance_meters : '-',
            complianceText,
            cp.last_guard_name || '-',
            cp.last_guard_badge || '-',
            cp.last_condition_status ? cp.last_condition_status.toUpperCase() : '-',
            cp.last_scanned_at ? `${cp.last_scanned_at} WIB` : 'Belum Pernah',
            cp.last_notes || '-',
        ]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);

    // Auto-fit column widths for Sheet 1
    ws1['!cols'] = [
        { wch: 5 },  // No
        { wch: 12 }, // Kode
        { wch: 30 }, // Nama
        { wch: 32 }, // Lokasi
        { wch: 22 }, // Site
        { wch: 18 }, // Radius
        { wch: 14 }, // Total scan
        { wch: 14 }, // Normal
        { wch: 18 }, // Temuan
        { wch: 18 }, // Sesuai Radius
        { wch: 18 }, // Di luar radius
        { wch: 18 }, // Avg Distance
        { wch: 16 }, // Min Distance
        { wch: 16 }, // Max Distance
        { wch: 24 }, // Kepatuhan
        { wch: 20 }, // Petugas Terakhir
        { wch: 14 }, // Badge
        { wch: 16 }, // Kondisi
        { wch: 22 }, // Waktu Terakhir
        { wch: 35 }, // Catatan
    ];

    XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Checkpoint');

    // ==========================================
    // SHEET 2: Log Audit Scan Detail
    // ==========================================
    const sheet2Rows: Array<Array<string | number>> = [
        ['PT. GAJAH ANGKASA PERKASA - AUDIT LOG SCAN PATROLI CHECKPOINT'],
        [`Periode: ${periodStr} | Site: ${siteStr} | Waktu Ekspor: ${todayDateStr} WIB`],
        [],
        [
            'No',
            'Waktu Scan (WIB)',
            'Kode Checkpoint',
            'Nama Titik Checkpoint',
            'Site / Gedung',
            'Round Sesi',
            'Nama Petugas Satpam',
            'No Badge / NIK',
            'Jarak Scan (m)',
            'Toleransi Titik (m)',
            'Status Toleransi GPS',
            'Kondisi Checkpoint',
            'Catatan & Temuan Lapangan',
            'Bukti Foto Selfie',
        ],
    ];

    let logCounter = 1;
    checkpoints.forEach((cp) => {
        cp.recent_logs.forEach((log) => {
            const isRadiusValid = log.distance_meters <= cp.max_radius_meters;
            sheet2Rows.push([
                logCounter++,
                log.scanned_at,
                cp.code,
                cp.name,
                cp.site_name,
                log.round_number ? `Round ${log.round_number}` : 'Sesi Patroli',
                log.guard_name,
                log.guard_badge,
                log.distance_meters,
                cp.max_radius_meters,
                isRadiusValid ? 'Sesuai Radius' : 'Di Luar Toleransi GPS',
                (log.condition_status || 'normal').toUpperCase(),
                log.notes || '-',
                log.selfie_photo_path ? 'Tersedia (Watermarked)' : 'Tidak Ada',
            ]);
        });
    });

    if (logCounter === 1) {
        sheet2Rows.push(['-', '-', '-', 'Tidak ada catatan log scan pada periode ini', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    ws2['!cols'] = [
        { wch: 5 },  // No
        { wch: 22 }, // Waktu
        { wch: 14 }, // Kode
        { wch: 28 }, // Nama
        { wch: 22 }, // Site
        { wch: 14 }, // Round
        { wch: 22 }, // Satpam
        { wch: 14 }, // Badge
        { wch: 14 }, // Jarak
        { wch: 18 }, // Radius
        { wch: 22 }, // Status GPS
        { wch: 18 }, // Kondisi
        { wch: 38 }, // Catatan
        { wch: 22 }, // Foto
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Log Detail Scan');

    // ==========================================
    // SHEET 3: Ringkasan & KPI Eksekutif
    // ==========================================
    const coveredCount = metrics.covered_checkpoints ?? checkpoints.filter((c) => c.total_scans > 0).length;
    const totalCpCount = metrics.total_checkpoints || checkpoints.length;
    const missedCount = metrics.missed_checkpoints ?? Math.max(0, totalCpCount - coveredCount);
    const coveragePct = metrics.coverage_percentage ?? (totalCpCount > 0 ? Math.round((coveredCount / totalCpCount) * 100) : 0);

    const guardStatsMap = new Map<string, { name: string; badge: string; scanCount: number; sumDistance: number }>();

    checkpoints.forEach((cp) => {
        cp.recent_logs.forEach((log) => {
            const key = log.guard_name || 'Satpam';
            const current = guardStatsMap.get(key) || {
                name: key,
                badge: log.guard_badge || '-',
                scanCount: 0,
                sumDistance: 0,
            };
            current.scanCount += 1;
            current.sumDistance += log.distance_meters || 0;
            guardStatsMap.set(key, current);
        });
    });

    const sheet3Rows: Array<Array<string | number>> = [
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
        ['Total Seluruh Frekuensi Scan', metrics.total_scans, 'Total akumulasi scan QR'],
        ['Rata-rata Jarak Akurasi GPS', `${metrics.avg_distance} meter`, 'Tingkat presisi scanner satpam'],
        ['Total Temuan / Kondisi Abnormal', metrics.total_anomalies ?? 0, 'Laporan insiden / kendala di checkpoint'],
        ['Total Scan Melebihi Toleransi Radius', metrics.total_out_of_radius ?? 0, 'Scan terindikasi di luar batas geofence'],
        [],
        ['REKAPITULASI AKTIVITAS PETUGAS SATPAM PADA PERIODE INI'],
        ['No', 'Nama Personil Satpam', 'Nomor Badge / NIK', 'Total Titik Discan (x)', 'Rata-rata Jarak Scan (m)'],
    ];

    let guardIdx = 1;
    guardStatsMap.forEach((g) => {
        const avgGDist = g.scanCount > 0 ? (g.sumDistance / g.scanCount).toFixed(1) : '0';
        sheet3Rows.push([guardIdx++, g.name, g.badge, g.scanCount, `${avgGDist}m`]);
    });

    if (guardStatsMap.size === 0) {
        sheet3Rows.push(['-', 'Belum ada aktivitas patroli petugas pada periode ini', '-', 0, '-']);
    }

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    ws3['!cols'] = [
        { wch: 6 },
        { wch: 38 },
        { wch: 22 },
        { wch: 22 },
        { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'KPI & Ringkasan');

    // Download the Excel file
    const dateFormattedForFile = (filters.start_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const cleanFileName = `${fileNamePrefix}_${dateFormattedForFile}.xlsx`;

    XLSX.writeFile(wb, cleanFileName);
}
