<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionController extends Controller
{
    /**
     * Display Role & Permission Matrix and User Role Management.
     */
    public function index(): Response
    {
        // Auto-discover and register any newly added named routes automatically
        $this->discoverAndRegisterNewRoutes();

        $roles = Role::with('permissions')->orderBy('id')->get()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'is_system' => in_array($role->name, ['superadmin', 'admin', 'danru', 'satpam']),
                'permissions_count' => $role->permissions->count(),
                'permission_names' => $role->permissions->pluck('name')->toArray(),
            ];
        });

        // Generate dynamic modules from all registered route permissions
        $modules = $this->getGroupedModules();

        // All users with their current Spatie roles
        $users = User::with('roles')->orderBy('name')->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'badge_number' => $u->badge_number ?? '-',
                'role' => $u->role,
                'assigned_roles' => $u->roles->pluck('name')->toArray(),
                'primary_role' => $u->roles->first()?->name ?? $u->role,
            ];
        });

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'modules' => $modules,
            'users' => $users,
            'total_permissions' => Permission::count(),
        ]);
    }

    /**
     * Manual Trigger to Sync New Named Routes.
     */
    public function syncRoutes(): RedirectResponse
    {
        $newCount = $this->discoverAndRegisterNewRoutes();

        return redirect()->back()->with('success', "Pemindaian selesai. {$newCount} route baru berhasil disinkronkan ke daftar permission.");
    }

    /**
     * Auto-discovers all named routes in Laravel and registers them as Spatie Permissions.
     */
    protected function discoverAndRegisterNewRoutes(): int
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $routes = Route::getRoutes()->getRoutesByName();
        $ignoredPrefixes = [
            'ignition', 'sanctum', 'wayfinder', 'debugbar', 'storage',
            'passkey', 'password', 'verification', 'two-factor', 'well-known',
            'login', 'logout', 'register', 'home',
        ];

        $newCount = 0;
        $superadmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);

        foreach ($routes as $name => $route) {
            if (empty($name)) continue;

            $isIgnored = false;
            foreach ($ignoredPrefixes as $prefix) {
                if (str_starts_with($name, $prefix)) {
                    $isIgnored = true;
                    break;
                }
            }
            if ($isIgnored) continue;

            $permission = Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web']
            );

            if ($permission->wasRecentlyCreated) {
                $newCount++;
            }
        }

        // Keep superadmin with all permissions
        $superadmin->syncPermissions(Permission::all());

        return $newCount;
    }

    /**
     * Groups all available route permissions dynamically into intuitive functional modules.
     */
    protected function getGroupedModules(): array
    {
        $allPermissions = Permission::orderBy('name')->get();
        $routesByName = Route::getRoutes()->getRoutesByName();

        $moduleDefinitions = [
            'dashboard' => ['title' => 'Ringkasan & Dashboard', 'desc' => 'Akses halaman matriks operasional dan ringkasan eksekutif.'],
            'attendance' => ['title' => 'Presensi Shift Satpam', 'desc' => 'Hak akses presensi masuk dan keluar shift satpam.'],
            'peta' => ['title' => 'Peta Live & Radar Satpam', 'desc' => 'Hak akses monitoring GPS real-time dan radar pergerakan.'],
            'patroli' => ['title' => 'Patroli & Ronde Keamanan', 'desc' => 'Hak akses daftar riwayat inspeksi dan inspektur scan selfie watermark.'],
            'insiden' => ['title' => 'Laporan Insiden', 'desc' => 'Hak akses pencatatan dan eskalasi temuan insiden keamanan.'],
            'visitors' => ['title' => 'Buku Tamu Digital', 'desc' => 'Hak akses pencatatan pengunjung dan check-out tamu.'],
            'sites' => ['title' => 'Site & Lokasi Pos', 'desc' => 'Hak akses konfigurasi lokasi kerja site keamanan.'],
            'checkpoints' => ['title' => 'Checkpoint QR & Geofence 10m', 'desc' => 'Hak akses titik scan QR dan batas radius perimeter.'],
            'users' => ['title' => 'Kelola User & Petugas', 'desc' => 'Hak akses akun petugas satpam dan danru.'],
            'schedules' => ['title' => 'Jadwal & Shift Kerja', 'desc' => 'Hak akses pembuatan dan penetapan jadwal regu patroli.'],
            'roles' => ['title' => 'Role & Permission (Spatie)', 'desc' => 'Hak akses konfigurasi role dan named route permissions.'],
            'profile' => ['title' => 'Profil & Akun Pengguna', 'desc' => 'Hak akses pengaturan profil dan akun pengguna.'],
            'security' => ['title' => 'Keamanan Akun', 'desc' => 'Hak akses pengaturan kata sandi dan keamanan akun.'],
        ];

        $grouped = [];

        foreach ($allPermissions as $perm) {
            $routeName = $perm->name;
            $prefix = explode('.', $routeName)[0];

            $modKey = isset($moduleDefinitions[$prefix]) ? $prefix : 'other';
            $modConfig = $moduleDefinitions[$modKey] ?? ['title' => 'Fitur & Route Lainnya (' . ucfirst($prefix) . ')', 'desc' => 'Route tambahan otomatis terdeteksi dari sistem.'];

            if (!isset($grouped[$modKey])) {
                $grouped[$modKey] = [
                    'module_name' => $modConfig['title'],
                    'description' => $modConfig['desc'],
                    'permissions' => [],
                ];
            }

            // Determine HTTP method and friendly label
            $method = 'GET';
            if (isset($routesByName[$routeName])) {
                $methods = $routesByName[$routeName]->methods();
                $method = in_array('POST', $methods) ? 'POST' : (in_array('DELETE', $methods) ? 'DELETE' : (in_array('PUT', $methods) ? 'PUT' : 'GET'));
            }

            $label = $this->generateHumanFriendlyLabel($routeName);

            $grouped[$modKey]['permissions'][] = [
                'route_name' => $routeName,
                'label' => $label,
                'method' => $method,
            ];
        }

        return array_values($grouped);
    }

    /**
     * Converts a route name into a clean Indonesian label.
     */
    protected function generateHumanFriendlyLabel(string $routeName): string
    {
        $customLabels = [
            'dashboard' => 'Akses Dashboard Ringkasan',
            'attendance.index' => 'Lihat Halaman Presensi Shift',
            'attendance.checkin' => 'Kirim Check-In Presensi (Selfie GPS)',
            'attendance.checkout' => 'Kirim Check-Out Presensi Shift',
            'peta.live' => 'Lihat Radar Peta Live Satpam',
            'peta.live.data' => 'Polling Data GPS Live Satpam',
            'patroli.index' => 'Lihat Daftar Ronde & Riwayat Patroli',
            'patroli.show' => 'Lihat Detail Ronde & Bukti Watermark GD',
            'insiden.index' => 'Lihat Laporan Insiden Temuan',
            'insiden.status' => 'Ubah Status & Catatan Resolusi Insiden',
            'visitors.index' => 'Lihat Daftar Buku Tamu Digital',
            'visitors.checkout' => 'Proses Check-Out Tamu',
            'sites.index' => 'Lihat Site & Titik Checkpoint',
            'sites.store' => 'Tambah Lokasi Site Baru',
            'checkpoints.store' => 'Tambah Checkpoint QR GPS',
            'checkpoints.update' => 'Ubah Data & Posisi Checkpoint',
            'checkpoints.destroy' => 'Hapus Titik Checkpoint',
            'users.index' => 'Lihat Daftar Petugas & Shift',
            'users.store' => 'Tambah Akun Pengguna Baru',
            'schedules.store' => 'Buat & Tetapkan Jadwal Shift',
            'roles.index' => 'Lihat Halaman Role & Hak Akses',
            'roles.store' => 'Tambah Role Baru',
            'roles.permissions.update' => 'Simpan Konfigurasi Route Permissions',
            'roles.assign' => 'Tetapkan Role ke Pengguna',
            'roles.destroy' => 'Hapus Custom Role',
            'profile.edit' => 'Halaman Edit Profil Pengguna',
            'profile.update' => 'Simpan Pembaharuan Profil',
            'profile.destroy' => 'Hapus Akun Pengguna',
            'security.edit' => 'Halaman Pengaturan Keamanan Password',
            'user-password.update' => 'Ubah Kata Sandi Pengguna',
        ];

        if (isset($customLabels[$routeName])) {
            return $customLabels[$routeName];
        }

        // Auto format: e.g. "report.daily.export" -> "Akses Route Report Daily Export"
        $words = str_replace(['.', '_', '-'], ' ', $routeName);
        return 'Akses: ' . ucwords($words);
    }

    /**
     * Create a new custom role with optional initial route permissions.
     */
    public function storeRole(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create([
            'name' => strtolower(trim($validated['name'])),
            'guard_name' => 'web',
        ]);

        if (!empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->back()->with('success', "Role '{$role->name}' berhasil dibuat.");
    }

    /**
     * Update route permissions assigned to a specific role.
     */
    public function updateRolePermissions(Request $request, int $id): RedirectResponse
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $permissions = $validated['permissions'] ?? [];
        $role->syncPermissions($permissions);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->back()->with('success', "Hak akses permission untuk Role '{$role->name}' berhasil diperbarui.");
    }

    /**
     * Assign a Spatie role to a specific user.
     */
    public function assignUserRole(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_name' => 'required|exists:roles,name',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $user->syncRoles([$validated['role_name']]);

        // Keep legacy role column in sync
        $user->role = $validated['role_name'];
        $user->save();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->back()->with('success', "Role user '{$user->name}' berhasil diubah menjadi '{$validated['role_name']}'.");
    }

    /**
     * Delete a custom role.
     */
    public function destroyRole(int $id): RedirectResponse
    {
        $role = Role::findOrFail($id);

        if (in_array($role->name, ['superadmin', 'admin', 'danru', 'satpam'])) {
            return redirect()->back()->with('error', 'Role sistem bawaan tidak dapat dihapus.');
        }

        $roleName = $role->name;
        $role->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->back()->with('success', "Role '{$roleName}' berhasil dihapus.");
    }
}
