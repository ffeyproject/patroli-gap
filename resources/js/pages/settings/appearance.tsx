import { Head } from '@inertiajs/react';
import ThemeSelector from '@/components/theme-selector';
import { AVAILABLE_THEMES, useAppearance } from '@/hooks/use-appearance';
import { CheckCircle2, Eye, Info, Palette, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';

export default function Appearance() {
    const { currentTheme } = useAppearance();
    const activeThemeConfig = AVAILABLE_THEMES.find((t) => t.id === currentTheme) || AVAILABLE_THEMES[0];

    return (
        <>
            <Head title="Pengaturan Tema & Tampilan - Patroli Security" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-[#0f172a]/80 shadow-md">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
                            <Palette className="size-6 text-blue-500" />
                            <span>Pilihan Tema Visual Personal</span>
                        </h1>
                        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                            Setiap akun petugas atau admin dapat memilih tema tersendiri. Tema yang Anda pilih akan disimpan ke akun profil Anda secara permanen dan otomatis sinkron di semua perangkat.
                        </p>
                    </div>

                    {/* Active Theme Summary Card */}
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-700/60 bg-[#131b2e] shrink-0">
                        <div
                            className="size-9 rounded-lg border flex items-center justify-center shadow-xs"
                            style={{
                                backgroundColor: activeThemeConfig.bgPreview,
                                borderColor: activeThemeConfig.primaryColor,
                            }}
                        >
                            <span
                                className="size-4 rounded-full"
                                style={{ backgroundColor: activeThemeConfig.primaryColor }}
                            />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Tema Aktif Saat Ini
                            </span>
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{activeThemeConfig.name}</span>
                                <span className="size-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* Live Theme Preview Sandbox */}
                <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                        <Eye className="size-4 text-cyan-400" />
                        <span>Pratinjau Elemen Desain (Live Preview):</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        {/* Sample Card 1: Action Button */}
                        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#131b2e]/70 space-y-2">
                            <span className="text-[11px] font-medium text-slate-400">Tombol Aksi Utama</span>
                            <div>
                                <button
                                    type="button"
                                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <ShieldCheck className="size-3.5" />
                                    <span>Mulai Patroli QR</span>
                                </button>
                            </div>
                        </div>

                        {/* Sample Card 2: Status Badge */}
                        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#131b2e]/70 space-y-2">
                            <span className="text-[11px] font-medium text-slate-400">Status & Indikator</span>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-[#0f172a] text-blue-400 flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-emerald-400" />
                                    <span>Checkpoint Aman</span>
                                </span>
                            </div>
                        </div>

                        {/* Sample Card 3: Form Input */}
                        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#131b2e]/70 space-y-1.5">
                            <span className="text-[11px] font-medium text-slate-400">Input Form & Fokus</span>
                            <input
                                type="text"
                                readOnly
                                value="PT. GAP - Pos Barat"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#0c1222] text-xs text-slate-200"
                            />
                        </div>

                        {/* Sample Card 4: Toast / Info Box */}
                        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#131b2e]/70 space-y-1">
                            <span className="text-[11px] font-medium text-slate-400">Sinkronisasi Akun</span>
                            <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="size-3.5 shrink-0" />
                                <span>Tersimpan di Cloud</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Theme Selector Section */}
                <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <Sparkles className="size-4 text-amber-400" />
                            <span>Katalog 14 Tema Visual Eksklusif:</span>
                        </div>
                        <span className="text-xs text-slate-400">
                            Klik tema untuk langsung menerapkan
                        </span>
                    </div>

                    <ThemeSelector />
                </div>
            </div>
        </>
    );
}

