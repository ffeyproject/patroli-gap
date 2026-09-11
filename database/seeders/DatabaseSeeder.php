<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Checkpoint;
use App\Models\Incident;
use App\Models\PatrolLog;
use App\Models\PatrolSchedule;
use App\Models\PatrolSession;
use App\Models\Site;
use App\Models\User;
use App\Models\Visitor;
use App\Services\WatermarkService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $watermarkService = app(WatermarkService::class);

        // 1. Create Users
        $sendhy = User::updateOrCreate(['email' => 'superadmin@patroli.id'], [
            'name' => 'Ferry Gilang',
            'username' => 'superadmin',
            'email' => 'superadmin@patroli.id',
            'password' => Hash::make('password'),
            'badge_number' => 'ADM-001',
            'phone' => '081234567890',
            'role' => 'superadmin',
            'theme' => 'midnight',
            'is_active' => true,
        ]);

        $danruBudi = User::updateOrCreate(['email' => 'budi@patroli.id'], [
            'name' => 'Budi Santoso',
            'username' => 'danrubudi',
            'email' => 'budi@patroli.id',
            'password' => Hash::make('password'),
            'badge_number' => 'DNR-001',
            'phone' => '081234567891',
            'role' => 'danru',
            'theme' => 'carbon',
            'is_active' => true,
        ]);

        $satpamAgus = User::updateOrCreate(['email' => 'agus@patroli.id'], [
            'name' => 'Agus Pratama',
            'username' => 'agus',
            'email' => 'agus@patroli.id',
            'password' => Hash::make('password'),
            'badge_number' => 'SEC-002',
            'phone' => '081234567892',
            'role' => 'satpam',
            'theme' => 'cyberpunk',
            'is_active' => true,
        ]);

        $satpamDimas = User::updateOrCreate(['email' => 'dimas@patroli.id'], [
            'name' => 'Dimas Wahyudi',
            'username' => 'dimas',
            'email' => 'dimas@patroli.id',
            'password' => Hash::make('password'),
            'badge_number' => 'SEC-003',
            'phone' => '081234567893',
            'role' => 'satpam',
            'theme' => 'emerald',
            'is_active' => true,
        ]);

        $satpamRian = User::updateOrCreate(['email' => 'rian@patroli.id'], [
            'name' => 'Rian Hidayat',
            'username' => 'rian',
            'email' => 'rian@patroli.id',
            'password' => Hash::make('password'),
            'badge_number' => 'SEC-004',
            'phone' => '081234567894',
            'role' => 'satpam',
            'theme' => 'amber',
            'is_active' => true,
        ]);

        // 2. Create Sites
        $siteMenara = Site::updateOrCreate(['code' => 'SITE-MK'], [
            'name' => 'Site Gedung Menara Utama',
            'code' => 'SITE-MK',
            'address' => 'Jl. HR Rasuna Said Blok X-5 No. 12, Kuningan, Jakarta Selatan',
            'latitude' => -6.2297465,
            'longitude' => 106.8295180,
            'geofence_radius_meters' => 50,
            'is_active' => true,
        ]);

        $siteWarehouse = Site::updateOrCreate(['code' => 'SITE-CKR'], [
            'name' => 'Site Warehouse Cikarang',
            'code' => 'SITE-CKR',
            'address' => 'Kawasan Industri Jababeka II Blok C-10, Cikarang',
            'latitude' => -6.3255100,
            'longitude' => 107.1378200,
            'geofence_radius_meters' => 100,
            'is_active' => true,
        ]);

        // 3. Create Checkpoints for Site Menara
        $checkpointsData = [
            [
                'name' => 'Pos Jaga Gerbang Utama',
                'code' => 'CP-01',
                'qr_token' => 'CP-GB-UTAMA-01',
                'location_description' => 'Pos penjagaan pintu masuk depan portal otomatis',
                'latitude' => -6.2297465,
                'longitude' => 106.8295180,
                'order_index' => 1,
            ],
            [
                'name' => 'Lobby Utama & Resepsionis',
                'code' => 'CP-02',
                'qr_token' => 'CP-LB-UTAMA-02',
                'location_description' => 'Dekat pintu putar akses turnstile lobby',
                'latitude' => -6.2298000,
                'longitude' => 106.8296000,
                'order_index' => 2,
            ],
            [
                'name' => 'Pintu Darurat Lantai 2',
                'code' => 'CP-03',
                'qr_token' => 'CP-PD-LT2-03',
                'location_description' => 'Tangga darurat sayap timur dekat hydrant',
                'latitude' => -6.2298500,
                'longitude' => 106.8296500,
                'order_index' => 3,
            ],
            [
                'name' => 'Ruang Server & Data Center',
                'code' => 'CP-04',
                'qr_token' => 'CP-SRV-LT2-04',
                'location_description' => 'Pintu akses biometrik ruang data center lantai 2',
                'latitude' => -6.2299000,
                'longitude' => 106.8297000,
                'order_index' => 4,
            ],
            [
                'name' => 'Area Parkir Basement B2',
                'code' => 'CP-05',
                'qr_token' => 'CP-PK-BSMT-05',
                'location_description' => 'Pilar nomor 24 dekat exhaust pump room',
                'latitude' => -6.2299500,
                'longitude' => 106.8297500,
                'order_index' => 5,
            ],
            [
                'name' => 'Pos Keluar Gerbang Belakang',
                'code' => 'CP-06',
                'qr_token' => 'CP-GB-BLKG-06',
                'location_description' => 'Pintu gerbang keluar area loading dock',
                'latitude' => -6.2300000,
                'longitude' => 106.8298000,
                'order_index' => 6,
            ],
        ];

        $createdCheckpoints = [];
        foreach ($checkpointsData as $cp) {
            $createdCheckpoints[] = Checkpoint::updateOrCreate(
                ['site_id' => $siteMenara->id, 'code' => $cp['code']],
                [
                    'name' => $cp['name'],
                    'qr_token' => $cp['qr_token'],
                    'location_description' => $cp['location_description'],
                    'latitude' => $cp['latitude'],
                    'longitude' => $cp['longitude'],
                    'max_radius_meters' => 10,
                    'order_index' => $cp['order_index'],
                    'is_active' => true,
                ]
            );
        }

        // Checkpoints for Warehouse
        Checkpoint::updateOrCreate(['site_id' => $siteWarehouse->id, 'code' => 'CP-W01'], [
            'name' => 'Main Gate Warehouse',
            'qr_token' => 'CP-WH-GATE-01',
            'location_description' => 'Gerbang utama keluar masuk truk container',
            'latitude' => -6.3255100,
            'longitude' => 107.1378200,
            'max_radius_meters' => 10,
            'order_index' => 1,
            'is_active' => true,
        ]);

        // 4. Create Schedules
        $schedulePagi = PatrolSchedule::updateOrCreate(
            ['site_id' => $siteMenara->id, 'shift_name' => 'Shift Pagi (07:00 - 15:00)'],
            [
                'start_time' => '07:00:00',
                'end_time' => '15:00:00',
                'schedule_date' => today(),
                'min_patrol_rounds' => 3,
                'is_active' => true,
            ]
        );
        $schedulePagi->users()->sync([$satpamAgus->id, $satpamDimas->id, $danruBudi->id]);

        $scheduleSiang = PatrolSchedule::updateOrCreate(
            ['site_id' => $siteMenara->id, 'shift_name' => 'Shift Siang (15:00 - 23:00)'],
            [
                'start_time' => '15:00:00',
                'end_time' => '23:00:00',
                'schedule_date' => today(),
                'min_patrol_rounds' => 3,
                'is_active' => true,
            ]
        );
        $scheduleSiang->users()->sync([$satpamRian->id]);

        // 5. Create Attendances
        Attendance::updateOrCreate(
            ['user_id' => $satpamAgus->id, 'site_id' => $siteMenara->id, 'check_in_at' => today()->setHour(6)->setMinute(48)],
            [
                'check_in_lat' => -6.2297460,
                'check_in_lng' => 106.8295175,
                'status' => 'present',
                'notes' => 'Hadir tepat waktu',
            ]
        );

        Attendance::updateOrCreate(
            ['user_id' => $satpamDimas->id, 'site_id' => $siteMenara->id, 'check_in_at' => today()->setHour(6)->setMinute(55)],
            [
                'check_in_lat' => -6.2297450,
                'check_in_lng' => 106.8295185,
                'status' => 'present',
                'notes' => 'Hadir siap tugas',
            ]
        );

        Attendance::updateOrCreate(
            ['user_id' => $danruBudi->id, 'site_id' => $siteMenara->id, 'check_in_at' => today()->setHour(6)->setMinute(30)],
            [
                'check_in_lat' => -6.2297465,
                'check_in_lng' => 106.8295180,
                'status' => 'present',
                'notes' => 'Briefing serah terima tugas',
            ]
        );

        // 6. Create Patrol Sessions & Sample Watermarked Logs
        $session1 = PatrolSession::updateOrCreate(
            ['patrol_schedule_id' => $schedulePagi->id, 'user_id' => $satpamAgus->id, 'round_number' => 1],
            [
                'site_id' => $siteMenara->id,
                'started_at' => today()->setHour(7)->setMinute(15),
                'completed_at' => today()->setHour(7)->setMinute(45),
                'status' => 'completed',
                'notes' => 'Patroli round 1 situasi kondusif',
            ]
        );

        $session2 = PatrolSession::updateOrCreate(
            ['patrol_schedule_id' => $schedulePagi->id, 'user_id' => $satpamAgus->id, 'round_number' => 2],
            [
                'site_id' => $siteMenara->id,
                'started_at' => today()->setHour(9)->setMinute(30),
                'completed_at' => null,
                'status' => 'in_progress',
                'notes' => 'Patroli round 2 sedang berlangsung',
            ]
        );

        // Generate demo watermarked images
        foreach ($createdCheckpoints as $index => $cp) {
            $dist = round(rand(10, 65) / 10, 1); // 1.0m - 6.5m
            $timeScanned = today()->setHour(7)->setMinute(15 + ($index * 5));

            $selfiePath = $watermarkService->watermarkAndSave(
                null,
                [
                    'userName' => 'Agus Pratama',
                    'userRole' => 'SATPAM',
                    'siteName' => 'Gedung Menara Utama',
                    'checkpointName' => $cp->name,
                    'latitude' => $cp->latitude + (rand(-10, 10) * 0.00001),
                    'longitude' => $cp->longitude + (rand(-10, 10) * 0.00001),
                    'distanceMeters' => $dist,
                    'scannedAt' => $timeScanned->timezone('Asia/Jakarta')->format('d M Y, H:i:s').' WIB',
                ],
                'patrol_selfies'
            );

            PatrolLog::updateOrCreate(
                ['patrol_session_id' => $session1->id, 'checkpoint_id' => $cp->id],
                [
                    'user_id' => $satpamAgus->id,
                    'scanned_at' => $timeScanned,
                    'selfie_photo_path' => $selfiePath,
                    'latitude' => $cp->latitude,
                    'longitude' => $cp->longitude,
                    'distance_meters' => $dist,
                    'is_valid_location' => true,
                    'condition_status' => ($index === 2) ? 'warning' : 'normal',
                    'notes' => ($index === 2) ? 'Lampu lorong agak redup, sudah dicatat.' : 'Area aman dan rapi.',
                ]
            );
        }

        // 7. Create Incidents
        Incident::updateOrCreate(
            ['title' => 'Pintu Darurat Lt 2 Terganjal'],
            [
                'site_id' => $siteMenara->id,
                'user_id' => $satpamAgus->id,
                'checkpoint_id' => $createdCheckpoints[2]->id,
                'description' => 'Ditemukan kardus barang menghalangi akses pintu darurat tangga sayap timur lantai 2.',
                'severity' => 'medium',
                'status' => 'open',
                'reported_at' => today()->setHour(7)->setMinute(28),
            ]
        );

        Incident::updateOrCreate(
            ['title' => 'Kendaraan Parkir Tanpa Izin di Drop-Off'],
            [
                'site_id' => $siteMenara->id,
                'user_id' => $danruBudi->id,
                'checkpoint_id' => $createdCheckpoints[0]->id,
                'description' => 'Mobil sedan B 1844 KLP berhenti lebih dari 30 menit di area drop-off lobby tanpa pengemudi.',
                'severity' => 'low',
                'status' => 'resolved',
                'reported_at' => today()->setHour(8)->setMinute(10),
                'resolved_at' => today()->setHour(8)->setMinute(35),
                'resolution_notes' => 'Pengemudi sudah ditegur dan memindahkan kendaraan ke basement B1.',
            ]
        );

        // 8. Create Visitors
        Visitor::updateOrCreate(
            ['guest_name' => 'Ir. Hendra Wijaya', 'check_in_at' => today()->setHour(8)->setMinute(30)],
            [
                'site_id' => $siteMenara->id,
                'user_id' => $satpamDimas->id,
                'company' => 'PT Telekomunikasi Solusi',
                'destination' => 'Ruang Server Lt. 2 (Bpk. Denny IT)',
                'purpose' => 'Maintenance Rutin Router Core',
                'vehicle_number' => 'B 9281 KGA',
                'status' => 'checked_in',
            ]
        );

        Visitor::updateOrCreate(
            ['guest_name' => 'Siti Nurhaliza', 'check_in_at' => today()->setHour(9)->setMinute(00)],
            [
                'site_id' => $siteMenara->id,
                'user_id' => $satpamDimas->id,
                'company' => 'Klinik Medika Pro',
                'destination' => 'HRD Lantai 8 (Ibu Maya)',
                'purpose' => 'Kunjungan Kerja Sama MCU',
                'vehicle_number' => 'B 3012 WZX',
                'status' => 'checked_in',
            ]
        );
    }
}
