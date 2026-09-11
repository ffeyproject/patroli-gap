import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import ThemeSelector from '@/components/theme-selector';
import { Palette, Sparkles } from 'lucide-react';

export default function Appearance() {
    return (
        <>
            <Head title="Pengaturan Tema & Tampilan - Patroli Security" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
                        <Palette className="size-6 text-blue-500" />
                        Pilihan Tema Tampilan (Personal Theme)
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Pilih tema visual yang Anda sukai. Pilihan tema ini khusus untuk akun Anda dan akan tersimpan otomatis di sistem.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                        <Sparkles className="size-4 text-amber-400" />
                        <span>Pilih Dari 6 Tema Eksklusif:</span>
                    </div>

                    <ThemeSelector />
                </div>
            </div>
        </>
    );
}
