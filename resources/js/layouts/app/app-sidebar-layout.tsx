import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { AppSidebar } from '@/components/app-sidebar';
import { initializeTheme } from '@/hooks/use-appearance';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
}: AppLayoutProps) {
    const page = usePage();
    const { auth } = page.props as any;
    const userTheme = auth?.user?.theme;

    useEffect(() => {
        initializeTheme(userTheme);
    }, [userTheme]);

    return (
        <div
            className="flex min-h-screen w-full transition-colors duration-200"
            style={{
                backgroundColor: 'var(--theme-bg, #070c18)',
                color: 'var(--theme-text-primary, #f8fafc)',
            }}
        >
            {/* Left Sidebar on desktop */}
            <aside className="w-64 shrink-0 hidden md:block min-h-screen sticky top-0 h-screen z-30">
                <AppSidebar />
            </aside>

            {/* Main Content Area with Footer */}
            <main
                className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between transition-colors duration-200 min-h-screen"
                style={{
                    backgroundColor: 'var(--theme-bg, #070c18)',
                }}
            >
                <div className="flex-1">
                    {children}
                </div>

                {/* Footer with Copyright */}
                <footer
                    className="border-t py-4 px-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors mt-8"
                    style={{
                        borderColor: 'var(--theme-border, #1e293b)',
                        backgroundColor: 'var(--theme-sidebar, #0c1222)',
                    }}
                >
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <img src="/images/logo.png" alt="Logo" className="size-4 object-contain" />
                        <span className="font-semibold text-slate-300">Patroli Security</span>
                        <span className="text-slate-500">•</span>
                        <span>&copy; {new Date().getFullYear()} <strong>PT. Gajah Angkasa Perkasa</strong>. All rights reserved.</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>v1.0</span>
                        <span className="text-slate-500">•</span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            Security Management System
                        </span>
                    </div>
                </footer>
            </main>
        </div>
    );
}
