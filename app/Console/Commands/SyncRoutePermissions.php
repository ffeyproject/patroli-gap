<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SyncRoutePermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:sync-routes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Otomatis scan dan sinkronisasikan semua named routes Laravel ke tabel Spatie permissions';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Memulai pemindaian otomatis named routes...');

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $routes = Route::getRoutes()->getRoutesByName();
        $ignoredPrefixes = [
            'ignition', 'sanctum', 'wayfinder', 'debugbar', 'storage',
            'passkeys', 'password', 'verification', 'two-factor',
        ];

        $newCount = 0;
        $superadmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);

        foreach ($routes as $name => $route) {
            if (empty($name)) continue;

            // Check if ignored
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
                $this->line("  [NEW PERMISSION] {$name}");
                $newCount++;
            }
        }

        // Give all permissions to superadmin
        $superadmin->syncPermissions(Permission::all());
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->info("Sinkronisasi selesai! {$newCount} permission route baru berhasil ditambahkan.");
        return Command::SUCCESS;
    }
}
