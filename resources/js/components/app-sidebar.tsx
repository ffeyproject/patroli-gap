import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarCheck,
    Compass,
    FileText,
    KeyRound,
    LayoutDashboard,
    LogOut,
    MapPin,
    Palette,
    ShieldCheck,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import ThemeSelector from '@/components/theme-selector';
import { AVAILABLE_THEMES, useAppearance } from '@/hooks/use-appearance';

interface NavItem {
    title: string;
    href: string;
    routeName: string;
    icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
    {
        title: 'Ringkasan',
        href: '/dashboard',
        routeName: 'dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Presensi Shift',
        href: '/presensi',
        routeName: 'attendance.index',
        icon: CalendarCheck,
    },
    {
        title: 'Peta Live',
        href: '/peta-live',
        routeName: 'peta.live',
        icon: Compass,
    },
    {
        title: 'Patroli',
        href: '/patroli',
        routeName: 'patroli.index',
        icon: ShieldCheck,
    },
    {
        title: 'Insiden',
        href: '/insiden',
        routeName: 'insiden.index',
        icon: AlertTriangle,
    },
    {
        title: 'Buku Tamu',
        href: '/buku-tamu',
        routeName: 'visitors.index',
        icon: FileText,
    },
    {
        title: 'Site & Checkpoint',
        href: '/sites',
        routeName: 'sites.index',
        icon: MapPin,
    },
    {
        title: 'Kelola User',
        href: '/users',
        routeName: 'users.index',
        icon: Users,
    },
    {
        title: 'Role & Permission',
        href: '/roles-permissions',
        routeName: 'roles.index',
        icon: KeyRound,
    },
];

export function AppSidebar() {
    const page = usePage();
    const { auth } = page.props as any;
    const user = auth?.user;
    const currentUrl = page.url || '/dashboard';
    const { currentTheme } = useAppearance();
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

    const activeThemeConfig = AVAILABLE_THEMES.find((t) => t.id === currentTheme) || AVAILABLE_THEMES[0];

    const getRoleBadge = (role: string = 'satpam') => {
        switch (role) {
            case 'superadmin':
                return 'Super Admin';
            case 'admin':
                return 'Administrator';
            case 'danru':
                return 'Komandan Regu';
            default:
                return 'Satpam';
        }
    };

    return (
        <div
            className="flex flex-col h-full w-64 border-r select-none transition-colors duration-200"
            style={{
                backgroundColor: 'var(--theme-sidebar, #0c1222)',
                borderColor: 'var(--theme-border, #1e293b)',
                color: 'var(--theme-text-primary, #f8fafc)',
            }}
        >
            {/* Header / Logo */}
            <div
                className="p-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--theme-border, #1e293b)' }}
            >
                <Link href="/dashboard" className="block cursor-pointer">
                    <AppLogo />
                </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                {mainNavItems
                    .filter((item) => {
                        const isSuperAdmin = user?.roles?.includes('superadmin') || user?.role === 'superadmin';
                        if (isSuperAdmin) return true;
                        if (item.routeName === 'dashboard') return true;
                        return user?.permissions?.includes(item.routeName);
                    })
                    .map((item) => {
                        const isActive = currentUrl === item.href || (item.href !== '/dashboard' && currentUrl.startsWith(item.href));
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                prefetch
                                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                                    isActive
                                        ? 'text-white font-semibold shadow-lg'
                                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                                }`}
                                style={{
                                    backgroundColor: isActive ? 'var(--theme-accent, #2563eb)' : undefined,
                                    boxShadow: isActive ? '0 4px 16px var(--theme-accent-glow, rgba(37, 99, 235, 0.35))' : undefined,
                                }}
                            >
                                <Icon className={`size-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
            </nav>

            {/* Footer Profile Card */}
            <div
                className="p-3 border-t"
                style={{ borderColor: 'var(--theme-border, #1e293b)' }}
            >
                <div
                    className="rounded-xl border p-3 shadow-sm transition-colors"
                    style={{
                        backgroundColor: 'var(--theme-subcard, #131b2e)',
                        borderColor: 'var(--theme-border, #1e293b)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="flex size-10 items-center justify-center rounded-lg font-bold border"
                            style={{
                                backgroundColor: 'var(--theme-card, #0f172a)',
                                borderColor: 'var(--theme-border, #1e293b)',
                                color: 'var(--theme-accent, #2563eb)',
                            }}
                        >
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold text-white">
                                {user?.name || 'Sendhy'}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                                {getRoleBadge(user?.role)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        {/* Quick Theme Picker Button */}
                        <button
                            type="button"
                            onClick={() => setIsThemeModalOpen(true)}
                            title={`Ganti Tema (Aktif: ${activeThemeConfig.name})`}
                            className="flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-90"
                            style={{
                                backgroundColor: 'var(--theme-card, #0f172a)',
                                borderColor: 'var(--theme-border, #1e293b)',
                                color: 'var(--theme-text-primary, #f8fafc)',
                            }}
                        >
                            <span
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: activeThemeConfig.primaryColor }}
                            />
                            <Palette className="size-3.5 text-slate-400" />
                        </button>

                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-950/40 border border-red-900/50 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/60 transition-colors cursor-pointer"
                        >
                            <LogOut className="size-3.5" />
                            <span>Keluar</span>
                        </Link>
                    </div>

                    <div
                        className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t"
                        style={{ borderColor: 'var(--theme-border, #1e293b)' }}
                    >
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                        </span>
                        <span>Sistem Online • Aktif</span>
                    </div>
                </div>
            </div>

            {/* Quick Theme Selector Modal */}
            {isThemeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div
                        className="relative max-w-md w-full border rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            backgroundColor: 'var(--theme-card, #0f172a)',
                            borderColor: 'var(--theme-border, #1e293b)',
                        }}
                    >
                        <div
                            className="flex items-center justify-between p-4 border-b"
                            style={{
                                backgroundColor: 'var(--theme-subcard, #131b2e)',
                                borderColor: 'var(--theme-border, #1e293b)',
                            }}
                        >
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Sparkles className="size-4 text-amber-400" />
                                <span>Pilih Tema Anda (14 Tema Pilihan)</span>
                            </div>
                            <button
                                onClick={() => setIsThemeModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-400">
                                Pilihan tema akan otomatis tersimpan permanen di profil akun Anda.
                            </p>
                            <ThemeSelector compact onSelect={() => {}} />
                        </div>

                        <div
                            className="p-3 border-t flex justify-between items-center"
                            style={{
                                backgroundColor: 'var(--theme-subcard, #131b2e)',
                                borderColor: 'var(--theme-border, #1e293b)',
                            }}
                        >
                            <Link
                                href="/settings/appearance"
                                onClick={() => setIsThemeModalOpen(false)}
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                            >
                                Lihat Halaman Lengkap &rarr;
                            </Link>

                            <button
                                onClick={() => setIsThemeModalOpen(false)}
                                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

