import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Filter,
    Loader2,
    Pencil,
    Search,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AVAILABLE_THEMES } from '@/hooks/use-appearance';

interface User {
    id: number;
    name: string;
    username?: string;
    email: string;
    badge_number?: string;
    phone?: string;
    role: 'superadmin' | 'admin' | 'danru' | 'satpam';
    theme?: string;
    is_active: boolean;
}


interface Props {
    users: User[];
}

export default function UsersIndex({ users }: Props) {
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Search and filter for users table
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Form for Adding User
    const userForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        badge_number: '',
        phone: '',
        role: 'satpam' as 'superadmin' | 'admin' | 'danru' | 'satpam',
        theme: 'midnight',
    });

    // Form for Editing User
    const editUserForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        badge_number: '',
        phone: '',
        role: 'satpam' as 'superadmin' | 'admin' | 'danru' | 'satpam',
        theme: 'midnight',
        is_active: true,
    });

    const openCreateUserModal = () => {
        userForm.clearErrors();
        userForm.reset();
        setIsAddUserModalOpen(true);
    };

    const openEditUserModal = (u: User) => {
        setEditingUser(u);
        editUserForm.clearErrors();
        editUserForm.setData({
            name: u.name,
            username: u.username || '',
            email: u.email,
            password: '',
            badge_number: u.badge_number || '',
            phone: u.phone || '',
            role: u.role,
            theme: u.theme || 'midnight',
            is_active: u.is_active ?? true,
        });
        setIsEditUserModalOpen(true);
    };

    const submitUser = (e: React.FormEvent) => {
        e.preventDefault();
        userForm.post('/users/store', {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddUserModalOpen(false);
                userForm.reset();
                toast.success('Petugas baru berhasil ditambahkan.');
            },
            onError: (errors) => {
                const firstErr = Object.values(errors)[0];
                toast.error(firstErr || 'Gagal menambahkan petugas baru. Silakan periksa formulir.');
            },
        });
    };

    const submitEditUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        editUserForm.post(`/users/${editingUser.id}/update`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditUserModalOpen(false);
                setEditingUser(null);
                editUserForm.reset();
                toast.success('Data petugas / user berhasil diperbarui.');
            },
            onError: (errors) => {
                const firstErr = Object.values(errors)[0];
                toast.error(firstErr || 'Gagal memperbarui data user. Silakan periksa formulir.');
            },
        });
    };

    const deleteUser = (u: User) => {
        if (confirm(`Apakah Anda yakin ingin menghapus petugas "${u.name}" (${u.badge_number || u.email})?`)) {
            router.delete(`/users/${u.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Petugas berhasil dihapus.');
                },
                onError: (errors) => {
                    const firstErr = Object.values(errors)[0];
                    toast.error(firstErr || 'Gagal menghapus data petugas.');
                },
            });
        }
    };

    // Filtered users
    const filteredUsers = users.filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (!userSearch) return true;
        const q = userSearch.toLowerCase();
        return (
            u.name.toLowerCase().includes(q) ||
            (u.username && u.username.toLowerCase().includes(q)) ||
            u.email.toLowerCase().includes(q) ||
            (u.badge_number && u.badge_number.toLowerCase().includes(q)) ||
            (u.phone && u.phone.toLowerCase().includes(q))
        );
    });

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Kelola User - PT. Gajah Angkasa Perkasa" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <Users className="size-7 text-blue-500" />
                        Kelola User & Petugas
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Atur akun personil satpam dan hak akses role.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={openCreateUserModal}
                        className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-semibold border border-slate-700 transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                        <UserPlus className="size-4 text-blue-400" />
                        <span>Tambah Petugas</span>
                    </button>
                </div>
            </div>

            {/* Daftar Seluruh User / Petugas */}
            <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Users className="size-4 text-blue-400" />
                        Daftar Petugas & Pengguna Sistem ({filteredUsers.length} Personil)
                    </h2>

                    {/* Search & Role Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                            <Filter className="size-3.5 text-slate-400" />
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="rounded-xl bg-[#141e33] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="all">Semua Role</option>
                                <option value="satpam">Satpam</option>
                                <option value="danru">Danru</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                            </select>
                        </div>

                        <div className="relative min-w-[200px]">
                            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama, NIK, email..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141e33] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#131b2e]/60 text-slate-400 uppercase font-semibold text-[11px]">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Nama Lengkap</th>
                                <th className="px-4 py-3">Username</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">No Badge / NIK</th>
                                <th className="px-4 py-3">No. HP</th>
                                <th className="px-4 py-3">Role Akses</th>
                                <th className="px-4 py-3">Tema Tampilan</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center rounded-r-lg">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                                        Tidak ada data pengguna yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const userThemeObj = AVAILABLE_THEMES.find((t) => t.id === user.theme) || AVAILABLE_THEMES[0];
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-white">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex size-7 items-center justify-center rounded-full bg-blue-950 font-bold text-blue-400 border border-blue-800 text-xs shrink-0">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-cyan-400 font-mono text-[11px]">{user.username || '-'}</td>
                                            <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">{user.email}</td>
                                            <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{user.badge_number || '-'}</td>
                                            <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{user.phone || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                                                    user.role === 'superadmin' || user.role === 'admin'
                                                        ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                                        : user.role === 'danru'
                                                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="size-3 rounded-full border border-black/40 shrink-0"
                                                        style={{ backgroundColor: userThemeObj.primaryColor }}
                                                    />
                                                    <span className="text-xs text-slate-300 truncate max-w-[110px]">
                                                        {userThemeObj.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {user.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                                                        <span className="size-1.5 rounded-full bg-emerald-400"></span>
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                                                        <span className="size-1.5 rounded-full bg-rose-400"></span>
                                                        Non-Aktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openEditUserModal(user)}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm"
                                                        title="Edit Data Petugas"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteUser(user)}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm"
                                                        title="Hapus Petugas"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah User Baru */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-md w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <span className="text-white font-semibold text-sm">Tambah Petugas / User Baru</span>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitUser} className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Budi Santoso"
                                    value={userForm.data.name}
                                    onChange={(e) => userForm.setData('name', e.target.value)}
                                    className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                        userForm.errors.name ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                    }`}
                                />
                                {userForm.errors.name && (
                                    <span className="text-[11px] text-rose-400 font-medium mt-1 block">{userForm.errors.name}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        placeholder="budi_satpam"
                                        value={userForm.data.username}
                                        onChange={(e) => userForm.setData('username', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            userForm.errors.username ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {userForm.errors.username && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{userForm.errors.username}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="budi@example.com"
                                        value={userForm.data.email}
                                        onChange={(e) => userForm.setData('email', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            userForm.errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {userForm.errors.email && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{userForm.errors.email}</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="Min. 6 Karakter"
                                        value={userForm.data.password}
                                        onChange={(e) => userForm.setData('password', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            userForm.errors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {userForm.errors.password && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{userForm.errors.password}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">No. HP / WhatsApp</label>
                                    <input
                                        type="text"
                                        placeholder="08123456789"
                                        value={userForm.data.phone}
                                        onChange={(e) => userForm.setData('phone', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            userForm.errors.phone ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {userForm.errors.phone && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{userForm.errors.phone}</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">No. Badge / NIK</label>
                                    <input
                                        type="text"
                                        placeholder="SEC-005"
                                        value={userForm.data.badge_number}
                                        onChange={(e) => userForm.setData('badge_number', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            userForm.errors.badge_number ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {userForm.errors.badge_number && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{userForm.errors.badge_number}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Role Akses *</label>
                                    <select
                                        value={userForm.data.role}
                                        onChange={(e) => userForm.setData('role', e.target.value as any)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="satpam">Satpam (Petugas Ronda)</option>
                                        <option value="danru">Danru (Komandan Regu)</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Super Admin</option>
                                    </select>
                                    {userForm.errors.role && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{userForm.errors.role}</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Tema Tampilan Akun</label>
                                <select
                                    value={userForm.data.theme}
                                    onChange={(e) => userForm.setData('theme', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    {AVAILABLE_THEMES.map((th) => (
                                        <option key={th.id} value={th.id}>
                                             {th.name} ({th.isDark ? 'Dark' : 'Light'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddUserModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-700 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={userForm.processing}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-md shadow-blue-600/30 transition-all"
                                >
                                    {userForm.processing && <Loader2 className="size-3.5 animate-spin" />}
                                    <span>{userForm.processing ? 'Menyimpan...' : 'Simpan Petugas'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit User */}
            {isEditUserModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-md w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Pencil className="size-4 text-blue-400" />
                                <span>Edit Data Petugas / User</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsEditUserModalOpen(false);
                                    setEditingUser(null);
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitEditUser} className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    required
                                    value={editUserForm.data.name}
                                    onChange={(e) => editUserForm.setData('name', e.target.value)}
                                    className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                        editUserForm.errors.name ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                    }`}
                                />
                                {editUserForm.errors.name && (
                                    <span className="text-[11px] text-rose-400 font-medium mt-1 block">{editUserForm.errors.name}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={editUserForm.data.username}
                                        onChange={(e) => editUserForm.setData('username', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            editUserForm.errors.username ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {editUserForm.errors.username && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{editUserForm.errors.username}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={editUserForm.data.email}
                                        onChange={(e) => editUserForm.setData('email', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            editUserForm.errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {editUserForm.errors.email && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{editUserForm.errors.email}</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                                    <span>Ganti Password Baru</span>
                                    <span className="text-[10px] text-slate-500 font-normal">Kosongkan jika tidak diubah (Min. 6 Karakter jika diisi)</span>
                                </label>
                                <input
                                    type="password"
                                    placeholder="Biarkan kosong jika tidak ingin ganti password"
                                    value={editUserForm.data.password}
                                    onChange={(e) => editUserForm.setData('password', e.target.value)}
                                    className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none ${
                                        editUserForm.errors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                    }`}
                                />
                                {editUserForm.errors.password && (
                                    <span className="text-[11px] text-rose-400 font-medium mt-1 block">{editUserForm.errors.password}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">No. Badge / NIK</label>
                                    <input
                                        type="text"
                                        value={editUserForm.data.badge_number}
                                        onChange={(e) => editUserForm.setData('badge_number', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            editUserForm.errors.badge_number ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {editUserForm.errors.badge_number && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{editUserForm.errors.badge_number}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">No. HP / WhatsApp</label>
                                    <input
                                        type="text"
                                        value={editUserForm.data.phone}
                                        onChange={(e) => editUserForm.setData('phone', e.target.value)}
                                        className={`w-full rounded-xl bg-[#141e33] border px-3.5 py-2 text-xs text-white focus:outline-none ${
                                            editUserForm.errors.phone ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-blue-500'
                                        }`}
                                    />
                                    {editUserForm.errors.phone && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{editUserForm.errors.phone}</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Role Akses *</label>
                                    <select
                                        value={editUserForm.data.role}
                                        onChange={(e) => editUserForm.setData('role', e.target.value as any)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="satpam">Satpam (Petugas Ronda)</option>
                                        <option value="danru">Danru (Komandan Regu)</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Super Admin</option>
                                    </select>
                                    {editUserForm.errors.role && (
                                        <span className="text-[11px] text-rose-400 font-medium mt-1 block">{editUserForm.errors.role}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Status Akun</label>
                                    <select
                                        value={editUserForm.data.is_active ? '1' : '0'}
                                        onChange={(e) => editUserForm.setData('is_active', e.target.value === '1')}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="1">Aktif Beroperasi</option>
                                        <option value="0">Non-Aktif (Suspended)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Tema Tampilan Akun</label>
                                <select
                                    value={editUserForm.data.theme}
                                    onChange={(e) => editUserForm.setData('theme', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    {AVAILABLE_THEMES.map((th) => (
                                        <option key={th.id} value={th.id}>
                                            {th.name} ({th.isDark ? 'Dark' : 'Light'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditUserModalOpen(false);
                                        setEditingUser(null);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editUserForm.processing}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-md shadow-blue-600/30 transition-all"
                                >
                                    {editUserForm.processing && <Loader2 className="size-3.5 animate-spin" />}
                                    <span>{editUserForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
