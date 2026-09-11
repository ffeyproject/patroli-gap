import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Copy,
    Info,
    KeyRound,
    Lock,
    Plus,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
    X,
} from 'lucide-react';

interface PermissionItem {
    route_name: string;
    label: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

interface ModuleGroup {
    module_name: string;
    description: string;
    permissions: PermissionItem[];
}

interface RoleItem {
    id: number;
    name: string;
    is_system: boolean;
    permissions_count: number;
    permission_names: string[];
}

interface UserItem {
    id: number;
    name: string;
    email: string;
    badge_number: string;
    role: string;
    assigned_roles: string[];
    primary_role: string;
}

interface Props {
    roles: RoleItem[];
    modules: ModuleGroup[];
    users: UserItem[];
    total_permissions: number;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function RolePermissionIndex({
    roles,
    modules,
    users,
    total_permissions,
    flash,
}: Props) {
    const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id || 1);
    const [activeTab, setActiveTab] = useState<'matrix' | 'users'>('matrix');
    const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const handleSyncRoutes = () => {
        setIsSyncing(true);
        router.post('/roles-permissions/sync', {}, {
            preserveScroll: true,
            onFinish: () => setIsSyncing(false),
        });
    };

    const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

    // Local state for checkboxes in the active role
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
        activeRole ? activeRole.permission_names : []
    );
    const [isSaving, setIsSaving] = useState(false);

    // Switch active role
    const handleSelectRole = (role: RoleItem) => {
        setSelectedRoleId(role.id);
        setSelectedPermissions(role.permission_names);
    };

    // Toggle a single route permission
    const togglePermission = (routeName: string) => {
        if (selectedPermissions.includes(routeName)) {
            setSelectedPermissions(selectedPermissions.filter((p) => p !== routeName));
        } else {
            setSelectedPermissions([...selectedPermissions, routeName]);
        }
    };

    // Toggle all permissions in a module
    const toggleModule = (module: ModuleGroup) => {
        const moduleRouteNames = module.permissions.map((p) => p.route_name);
        const allSelected = moduleRouteNames.every((p) => selectedPermissions.includes(p));

        if (allSelected) {
            setSelectedPermissions(selectedPermissions.filter((p) => !moduleRouteNames.includes(p)));
        } else {
            const combined = Array.from(new Set([...selectedPermissions, ...moduleRouteNames]));
            setSelectedPermissions(combined);
        }
    };

    // Select ALL or Deselect ALL across all modules
    const handleSelectAllGlobal = () => {
        const allRoutes: string[] = [];
        modules.forEach((m) => {
            m.permissions.forEach((p) => allRoutes.push(p.route_name));
        });
        setSelectedPermissions(allRoutes);
    };

    const handleDeselectAllGlobal = () => {
        setSelectedPermissions([]);
    };

    // Save permissions form submission
    const handleSavePermissions = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRole) return;

        setIsSaving(true);
        router.post(
            `/roles-permissions/${activeRole.id}/permissions`,
            { permissions: selectedPermissions },
            {
                preserveScroll: true,
                onFinish: () => setIsSaving(false),
            }
        );
    };

    // Add Role Form
    const { data: newRoleData, setData: setNewRoleData, post: postNewRole, processing: isAddingRole, reset: resetNewRole } = useForm({
        name: '',
        permissions: [] as string[],
    });

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        postNewRole('/roles-permissions/store', {
            onSuccess: () => {
                setIsAddRoleOpen(false);
                resetNewRole();
            },
        });
    };

    // Assign Role to User
    const handleAssignRole = (userId: number, roleName: string) => {
        router.post(
            '/roles-permissions/assign',
            { user_id: userId, role_name: roleName },
            { preserveScroll: true }
        );
    };

    // Delete Custom Role
    const handleDeleteRole = (role: RoleItem) => {
        if (confirm(`Yakin ingin menghapus role '${role.name}'?`)) {
            router.delete(`/roles-permissions/${role.id}`, { preserveScroll: true });
        }
    };

    const getMethodBadgeColor = (method: string) => {
        switch (method) {
            case 'GET':
                return 'bg-blue-950/80 text-blue-300 border-blue-800';
            case 'POST':
                return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
            case 'DELETE':
                return 'bg-red-950/80 text-red-300 border-red-800';
            default:
                return 'bg-amber-950/80 text-amber-300 border-amber-800';
        }
    };

    // Filter modules and permissions by search
    const filteredModules = modules
        .map((mod) => {
            const matchesModule = mod.module_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchedPermissions = mod.permissions.filter(
                (p) =>
                    p.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.label.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (matchesModule) return mod;
            if (matchedPermissions.length > 0) {
                return { ...mod, permissions: matchedPermissions };
            }
            return null;
        })
        .filter(Boolean) as ModuleGroup[];

    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.badge_number.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Kelola Role & Hak Akses (Route Permissions) - Spatie" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <KeyRound className="size-7 text-blue-500" />
                        Kelola Role & Permission (Hak Akses Route)
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Sistem otorisasi berbasis Spatie Laravel Permission. Hak akses dikonfigurasi per <strong>Nama Route (Named Route)</strong> di mana 1 role dapat memiliki banyak route yang diizinkan.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleSyncRoutes}
                        disabled={isSyncing}
                        className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Otomatis scan dan sinkronisasikan semua route baru dari routes/web.php"
                    >
                        <RefreshCw className={`size-3.5 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Memindai...' : 'Sinkronkan Route Baru'}</span>
                    </button>

                    <button
                        onClick={() => setIsAddRoleOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Tambah Role Baru</span>
                    </button>
                </div>
            </div>

            {/* Flash Messages */}
            {flash?.success && (
                <div className="rounded-xl bg-emerald-950/80 border border-emerald-800 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    <span>{flash.success}</span>
                </div>
            )}
            {flash?.error && (
                <div className="rounded-xl bg-red-950/80 border border-red-800 p-3.5 text-xs text-red-300 flex items-center gap-2.5">
                    <ShieldAlert className="size-4 shrink-0 text-red-400" />
                    <span>{flash.error}</span>
                </div>
            )}

            {/* Navigation Tabs (Matrix Role vs Penugasan User) */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                <button
                    onClick={() => setActiveTab('matrix')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'matrix'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                    <ShieldCheck className="size-4" />
                    <span>Matriks Hak Akses Route per Role</span>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'users'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                    <UserCheck className="size-4" />
                    <span>Penugasan Role ke Petugas & User ({users.length})</span>
                </button>
            </div>

            {activeTab === 'matrix' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Role Selector Tabs */}
                    <div className="lg:col-span-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Daftar Role Sistem ({roles.length})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Pilih untuk Konfigurasi</span>
                        </div>

                        <div className="space-y-2">
                            {roles.map((role) => {
                                const isSelected = selectedRoleId === role.id;
                                return (
                                    <div
                                        key={role.id}
                                        onClick={() => handleSelectRole(role)}
                                        className={`rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden ${
                                            isSelected
                                                ? 'bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/40 shadow-lg'
                                                : 'bg-[#0f172a]/95 border-slate-800 hover:border-slate-700 hover:bg-[#131d33]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex size-10 items-center justify-center rounded-xl border font-bold text-sm ${
                                                    isSelected
                                                        ? 'bg-blue-600 border-blue-400 text-white'
                                                        : 'bg-slate-800 border-slate-700 text-blue-400'
                                                }`}>
                                                    {role.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-white uppercase">
                                                        {role.name}
                                                    </h3>
                                                    <span className="text-[11px] font-mono text-slate-400">
                                                        {isSelected ? selectedPermissions.length : role.permissions_count} / {total_permissions} Route
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                    role.is_system
                                                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                                }`}>
                                                    {role.is_system ? 'Sistem' : 'Custom'}
                                                </span>

                                                {!role.is_system && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteRole(role);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
                                                        title="Hapus Role"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Info Box */}
                        <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-4 text-xs text-slate-400 space-y-2">
                            <div className="flex items-center gap-2 text-blue-400 font-bold">
                                <Info className="size-4" />
                                <span>Penjelasan Named Route Permission</span>
                            </div>
                            <p>
                                Setiap kotak izin di samping mewakili satu fungsi nama route backend Laravel (contoh: <code className="text-sky-300 font-mono">attendance.checkin</code>, <code className="text-sky-300 font-mono">peta.live</code>, <code className="text-sky-300 font-mono">checkpoints.store</code>).
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Route Permissions Matrix */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* Control Bar */}
                        <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold">
                                    <Lock className="size-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Konfigurasi Route untuk Role:</div>
                                    <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
                                        <span>{activeRole?.name}</span>
                                        <span className="text-xs font-mono font-normal text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
                                            {selectedPermissions.length} Route Aktif
                                        </span>
                                    </h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSelectAllGlobal}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer"
                                >
                                    Pilih Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeselectAllGlobal}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer"
                                >
                                    Hapus Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSavePermissions}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    <CheckCircle2 className="size-4" />
                                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Hak Akses'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Search Filter */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama route atau nama modul (contoh: attendance, patroli, store)..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f172a] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Modules Accordion / Card Groups */}
                        <div className="space-y-4">
                            {filteredModules.map((module) => {
                                const moduleRoutes = module.permissions.map((p) => p.route_name);
                                const selectedCountInModule = moduleRoutes.filter((p) => selectedPermissions.includes(p)).length;
                                const isAllModuleSelected = selectedCountInModule === moduleRoutes.length;

                                return (
                                    <div
                                        key={module.module_name}
                                        className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 overflow-hidden shadow-sm"
                                    >
                                        {/* Module Group Header */}
                                        <div className="p-4 bg-[#131c33] border-b border-slate-800/80 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2.5">
                                                    <h3 className="text-sm font-bold text-white">
                                                        {module.module_name}
                                                    </h3>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                                                        {selectedCountInModule} / {moduleRoutes.length} Aktif
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {module.description}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => toggleModule(module)}
                                                className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                                                    isAllModuleSelected
                                                        ? 'bg-blue-600 text-white border-blue-500'
                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                                }`}
                                            >
                                                {isAllModuleSelected ? 'Batal Pilih Modul' : 'Pilih Semua Modul'}
                                            </button>
                                        </div>

                                        {/* Permissions Checklist in Module */}
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {module.permissions.map((item) => {
                                                const isChecked = selectedPermissions.includes(item.route_name);
                                                return (
                                                    <label
                                                        key={item.route_name}
                                                        onClick={() => togglePermission(item.route_name)}
                                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                                            isChecked
                                                                ? 'bg-blue-950/50 border-blue-500/80'
                                                                : 'bg-[#121a2f] border-slate-800/80 hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {}} // Controlled via label click
                                                            className="mt-1 size-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                                                        />
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-xs font-bold text-white">
                                                                    {item.label}
                                                                </span>
                                                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${getMethodBadgeColor(item.method)}`}>
                                                                    {item.method}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] font-mono text-sky-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800/80 inline-block">
                                                                route: {item.route_name}
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* Tab 2: User Role Assignment */
                <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Users className="size-4 text-blue-400" />
                                Penugasan Role Spatie ke Petugas & User
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Pilih role untuk setiap pengguna. Hak akses route dan menu sidebar pengguna akan langsung disesuaikan dengan role yang dipilih.
                            </p>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Cari nama atau email..."
                                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#141e33] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                                    <th className="pb-3 px-3">Petugas / User</th>
                                    <th className="pb-3 px-3">Badge & Email</th>
                                    <th className="pb-3 px-3">Role Saat Ini</th>
                                    <th className="pb-3 px-3 text-right">Ubah Penugasan Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-[#141e33]/50">
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex size-8 items-center justify-center rounded-lg bg-slate-800 font-bold text-blue-400 border border-slate-700 text-xs">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-white">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 font-mono text-slate-400">
                                            <div>{user.email}</div>
                                            <div className="text-[10px] text-slate-500">{user.badge_number}</div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                                                {user.primary_role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <select
                                                value={user.primary_role}
                                                onChange={(e) => handleAssignRole(user.id, e.target.value)}
                                                className="rounded-xl bg-[#141e33] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                                            >
                                                {roles.map((r) => (
                                                    <option key={r.id} value={r.name}>
                                                        Role: {r.name.toUpperCase()}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Tambah Role Baru */}
            {isAddRoleOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-lg w-full bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                <Plus className="size-4 text-blue-400" />
                                Tambah Role Baru
                            </h3>
                            <button
                                onClick={() => setIsAddRoleOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRole} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Nama Role (Slug Tanpa Spasi) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newRoleData.name}
                                    onChange={(e) => setNewRoleData('name', e.target.value)}
                                    placeholder="Contoh: koordinator_lapangan, pengawas_cctv"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141e33] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Setelah role dibuat, Anda dapat langsung mencentang daftar named route permissions yang ingin diberikan.
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddRoleOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAddingRole}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                                >
                                    {isAddingRole ? 'Membuat...' : 'Buat Role Baru'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
