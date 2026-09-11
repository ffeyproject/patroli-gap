<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Definition of Route Permissions categorized by Module
        $routePermissions = [
            // Dashboard Module
            ['name' => 'dashboard', 'display_name' => 'Akses Dashboard Ringkasan', 'module' => 'Ringkasan'],

            // Presensi Module
            ['name' => 'attendance.index', 'display_name' => 'Lihat Halaman Presensi', 'module' => 'Presensi Shift'],
            ['name' => 'attendance.checkin', 'display_name' => 'Lakukan Check-In Presensi', 'module' => 'Presensi Shift'],
            ['name' => 'attendance.checkout', 'display_name' => 'Lakukan Check-Out Presensi', 'module' => 'Presensi Shift'],

            // Peta Live Module
            ['name' => 'peta.live', 'display_name' => 'Lihat Radar Peta Live Satpam', 'module' => 'Peta Live'],
            ['name' => 'peta.live.data', 'display_name' => 'Polling Data Live Satpam', 'module' => 'Peta Live'],

            // Patroli Module
            ['name' => 'patroli.index', 'display_name' => 'Lihat Riwayat & Daftar Patroli', 'module' => 'Patroli'],
            ['name' => 'patroli.show', 'display_name' => 'Lihat Detail Ronde & Watermark Patroli', 'module' => 'Patroli'],

            // Insiden Module
            ['name' => 'insiden.index', 'display_name' => 'Lihat Laporan Insiden', 'module' => 'Insiden'],
            ['name' => 'insiden.status', 'display_name' => 'Update Status / Resolusi Insiden', 'module' => 'Insiden'],

            // Buku Tamu Module
            ['name' => 'visitors.index', 'display_name' => 'Lihat Buku Tamu Digital', 'module' => 'Buku Tamu'],
            ['name' => 'visitors.checkout', 'display_name' => 'Proses Check-Out Tamu', 'module' => 'Buku Tamu'],

            // Site & Checkpoint Module
            ['name' => 'sites.index', 'display_name' => 'Lihat Site & Checkpoint', 'module' => 'Site & Checkpoint'],
            ['name' => 'sites.store', 'display_name' => 'Tambah Lokasi Site', 'module' => 'Site & Checkpoint'],
            ['name' => 'checkpoints.store', 'display_name' => 'Tambah Checkpoint QR GPS', 'module' => 'Site & Checkpoint'],
            ['name' => 'checkpoints.update', 'display_name' => 'Ubah Data Checkpoint', 'module' => 'Site & Checkpoint'],
            ['name' => 'checkpoints.destroy', 'display_name' => 'Hapus Titik Checkpoint', 'module' => 'Site & Checkpoint'],

            // Kelola User & Jadwal Shift
            ['name' => 'users.index', 'display_name' => 'Lihat Daftar Pengguna & Shift', 'module' => 'Kelola User'],
            ['name' => 'users.store', 'display_name' => 'Tambah Pengguna Baru', 'module' => 'Kelola User'],
            ['name' => 'schedules.store', 'display_name' => 'Buat & Tetapkan Jadwal Shift', 'module' => 'Kelola User'],

            // Kelola Role & Permission
            ['name' => 'roles.index', 'display_name' => 'Lihat Menu Role & Hak Akses', 'module' => 'Role & Permission'],
            ['name' => 'roles.store', 'display_name' => 'Tambah Role Baru', 'module' => 'Role & Permission'],
            ['name' => 'roles.permissions.update', 'display_name' => 'Ubah Permission Route pada Role', 'module' => 'Role & Permission'],
            ['name' => 'roles.assign', 'display_name' => 'Tetapkan Role ke Pengguna', 'module' => 'Role & Permission'],
            ['name' => 'roles.destroy', 'display_name' => 'Hapus Custom Role', 'module' => 'Role & Permission'],
        ];

        // 2. Create Permissions in DB
        foreach ($routePermissions as $p) {
            Permission::firstOrCreate(
                ['name' => $p['name'], 'guard_name' => 'web']
            );
        }

        // 3. Create Roles
        $roleSuperAdmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $roleAdmin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $roleDanru = Role::firstOrCreate(['name' => 'danru', 'guard_name' => 'web']);
        $roleSatpam = Role::firstOrCreate(['name' => 'satpam', 'guard_name' => 'web']);

        // 4. Assign Route Permissions to Roles
        // Superadmin gets ALL route permissions
        $allPermissions = Permission::all();
        $roleSuperAdmin->syncPermissions($allPermissions);

        // Admin gets almost all permissions except deleting roles
        $adminRoutes = [
            'dashboard', 'attendance.index', 'attendance.checkin', 'attendance.checkout',
            'peta.live', 'peta.live.data', 'patroli.index', 'patroli.show',
            'insiden.index', 'insiden.status', 'visitors.index', 'visitors.checkout',
            'sites.index', 'sites.store', 'checkpoints.store', 'checkpoints.update',
            'users.index', 'users.store', 'schedules.store',
            'roles.index', 'roles.store', 'roles.permissions.update', 'roles.assign',
        ];
        $roleAdmin->syncPermissions(Permission::whereIn('name', $adminRoutes)->get());

        // Danru (Komandan Regu) gets operations, live monitoring, incidents, shift, visitors
        $danruRoutes = [
            'dashboard', 'attendance.index', 'attendance.checkin', 'attendance.checkout',
            'peta.live', 'peta.live.data', 'patroli.index', 'patroli.show',
            'insiden.index', 'insiden.status', 'visitors.index', 'visitors.checkout',
            'sites.index', 'users.index', 'schedules.store',
        ];
        $roleDanru->syncPermissions(Permission::whereIn('name', $danruRoutes)->get());

        // Satpam gets attendance, live map, patrol inspection, report incidents, and visitor registration
        $satpamRoutes = [
            'dashboard', 'attendance.index', 'attendance.checkin', 'attendance.checkout',
            'peta.live', 'peta.live.data', 'patroli.index', 'patroli.show',
            'insiden.index', 'visitors.index', 'visitors.checkout',
        ];
        $roleSatpam->syncPermissions(Permission::whereIn('name', $satpamRoutes)->get());

        // 5. Assign Roles to Existing Seeded Users
        $sendhy = User::where('email', 'superadmin@patroli.id')->first();
        if ($sendhy) {
            $sendhy->assignRole($roleSuperAdmin);
        }

        $budi = User::where('email', 'budi@patroli.id')->first();
        if ($budi) {
            $budi->assignRole($roleDanru);
        }

        $satpams = User::whereIn('email', ['agus@patroli.id', 'dimas@patroli.id', 'rian@patroli.id'])->get();
        foreach ($satpams as $s) {
            $s->assignRole($roleSatpam);
        }
    }
}
