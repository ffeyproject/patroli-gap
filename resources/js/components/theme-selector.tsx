import { AVAILABLE_THEMES, useAppearance } from '@/hooks/use-appearance';
import type { ThemeType } from '@/hooks/use-appearance';
import { Check, Sparkles } from 'lucide-react';

interface ThemeSelectorProps {
    compact?: boolean;
}

export default function ThemeSelector({ compact = false }: ThemeSelectorProps) {
    const { currentTheme, updateTheme } = useAppearance();

    if (compact) {
        return (
            <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_THEMES.map((theme) => {
                    const isSelected = currentTheme === theme.id;
                    return (
                        <button
                            key={theme.id}
                            onClick={() => updateTheme(theme.id)}
                            type="button"
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                                    : 'border-slate-800 bg-[#131b2e]/60 hover:border-slate-700 hover:bg-[#131b2e]'
                            }`}
                        >
                            <div
                                className="size-6 rounded-lg flex items-center justify-center border shadow-xs"
                                style={{
                                    backgroundColor: theme.bgPreview,
                                    borderColor: isSelected ? theme.primaryColor : '#334155',
                                }}
                            >
                                <span
                                    className="size-2.5 rounded-full"
                                    style={{ backgroundColor: theme.primaryColor }}
                                />
                            </div>
                            <span className="text-[11px] font-medium text-slate-300 truncate w-full text-center">
                                {theme.name.split(' ')[0]}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_THEMES.map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                    <button
                        key={theme.id}
                        onClick={() => updateTheme(theme.id)}
                        type="button"
                        className={`relative group rounded-2xl border p-4.5 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                                ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10'
                                : 'border-slate-800 bg-[#0f172a]/80 hover:border-slate-700 hover:bg-[#131b2e]'
                        }`}
                    >
                        {/* Selected Badge */}
                        {isSelected && (
                            <div className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                                <Check className="size-3.5 stroke-[3]" />
                            </div>
                        )}

                        <div className="space-y-3">
                            {/* Color Preview Palette */}
                            <div className="flex items-center gap-2">
                                <div
                                    className="size-10 rounded-xl border flex items-center justify-center shadow-md"
                                    style={{
                                        backgroundColor: theme.bgPreview,
                                        borderColor: '#334155',
                                    }}
                                >
                                    <div
                                        className="size-4 rounded-full shadow-xs"
                                        style={{ backgroundColor: theme.primaryColor }}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                        {theme.name}
                                    </h3>
                                    <span className="text-[11px] font-medium text-slate-400">
                                        {theme.isDark ? 'Dark Theme' : 'Light Theme'}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                                {theme.description}
                            </p>
                        </div>

                        {/* Visual Palette Preview */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="size-3.5 rounded-full border border-black/30"
                                    style={{ backgroundColor: theme.bgPreview }}
                                    title="Background"
                                />
                                <span
                                    className="size-3.5 rounded-full border border-black/30"
                                    style={{ backgroundColor: theme.primaryColor }}
                                    title="Primary Accent"
                                />
                                <span
                                    className="size-3.5 rounded-full border border-black/30"
                                    style={{ backgroundColor: theme.accentPreview }}
                                    title="Highlight"
                                />
                            </div>
                            <span
                                className="text-[11px] font-semibold"
                                style={{ color: theme.primaryColor }}
                            >
                                {isSelected ? 'Sedang Digunakan' : 'Pilih Tema'}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
