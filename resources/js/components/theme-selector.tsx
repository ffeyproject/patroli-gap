import { useState } from 'react';
import { AVAILABLE_THEMES, useAppearance } from '@/hooks/use-appearance';
import type { ThemeOption, ThemeType } from '@/hooks/use-appearance';
import { Check, Flame, Moon, Palette, Search, Shield, Sparkles, Sun } from 'lucide-react';

interface ThemeSelectorProps {
    compact?: boolean;
    onSelect?: () => void;
}

export default function ThemeSelector({ compact = false, onSelect }: ThemeSelectorProps) {
    const { currentTheme, updateTheme } = useAppearance();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const categories = [
        { id: 'all', label: 'Semua Tema', icon: Palette, count: AVAILABLE_THEMES.length },
        { id: 'dark', label: 'Dark Security', icon: Moon, count: AVAILABLE_THEMES.filter(t => t.category === 'dark').length },
        { id: 'tactical', label: 'Taktikal & OLED', icon: Shield, count: AVAILABLE_THEMES.filter(t => t.category === 'tactical').length },
        { id: 'neon', label: 'Neon & Alert', icon: Flame, count: AVAILABLE_THEMES.filter(t => t.category === 'neon').length },
        { id: 'luxury', label: 'Luxury & Gold', icon: Sparkles, count: AVAILABLE_THEMES.filter(t => t.category === 'luxury').length },
        { id: 'light', label: 'Light Mode', icon: Sun, count: AVAILABLE_THEMES.filter(t => t.category === 'light').length },
    ];

    const filteredThemes = AVAILABLE_THEMES.filter((theme) => {
        const matchesCategory = selectedCategory === 'all' || theme.category === selectedCategory;
        const matchesSearch =
            theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            theme.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleSelect = (themeId: ThemeType) => {
        updateTheme(themeId);
        if (onSelect) {
            onSelect();
        }
    };

    if (compact) {
        return (
            <div className="space-y-3">
                {/* Compact Category Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                                selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
                    {filteredThemes.map((theme) => {
                        const isSelected = currentTheme === theme.id;
                        return (
                            <button
                                key={theme.id}
                                onClick={() => handleSelect(theme.id)}
                                type="button"
                                className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500'
                                        : 'border-slate-800 bg-[#131b2e]/60 hover:border-slate-700 hover:bg-[#131b2e]'
                                }`}
                            >
                                <div
                                    className="size-7 rounded-lg flex items-center justify-center border shadow-xs shrink-0"
                                    style={{
                                        backgroundColor: theme.bgPreview,
                                        borderColor: isSelected ? theme.primaryColor : '#334155',
                                    }}
                                >
                                    <span
                                        className="size-3 rounded-full shadow-xs"
                                        style={{ backgroundColor: theme.primaryColor }}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-200 truncate">
                                            {theme.name}
                                        </p>
                                        {isSelected && (
                                            <Check className="size-3 text-blue-400 shrink-0 ml-1" />
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                        {theme.isDark ? 'Dark' : 'Light'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isCatSelected = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                                    isCatSelected
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                        : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50'
                                }`}
                            >
                                <Icon className="size-3.5" />
                                <span>{cat.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                        isCatSelected
                                            ? 'bg-blue-800 text-blue-100'
                                            : 'bg-slate-900/80 text-slate-400'
                                    }`}
                                >
                                    {cat.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama / aksen tema..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#0c1222] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Themes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredThemes.map((theme) => {
                    const isSelected = currentTheme === theme.id;
                    return (
                        <button
                            key={theme.id}
                            onClick={() => handleSelect(theme.id)}
                            type="button"
                            className={`group relative rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/50 shadow-xl shadow-blue-500/10 scale-[1.01]'
                                    : 'border-slate-800/80 bg-[#0f172a]/70 hover:border-slate-700 hover:bg-[#131b2e]/90 hover:scale-[1.01]'
                            }`}
                        >
                            {/* Selected Badge */}
                            {isSelected && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                                    <Check className="size-3 stroke-[3]" />
                                    <span>Aktif</span>
                                </div>
                            )}

                            <div className="space-y-3">
                                {/* Color Preview Palette & Header */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="size-11 rounded-xl border flex items-center justify-center shadow-md shrink-0 relative overflow-hidden"
                                        style={{
                                            backgroundColor: theme.bgPreview,
                                            borderColor: '#334155',
                                        }}
                                    >
                                        <div
                                            className="size-5 rounded-full shadow-md"
                                            style={{ backgroundColor: theme.primaryColor }}
                                        />
                                        <div
                                            className="absolute -bottom-1 -right-1 size-4 rounded-full border border-black/40"
                                            style={{ backgroundColor: theme.accentPreview }}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1 pr-14">
                                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                            {theme.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span
                                                className={`px-1.5 py-0.2 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                                    theme.isDark
                                                        ? 'bg-slate-800 text-slate-300'
                                                        : 'bg-amber-100 text-amber-800 font-bold'
                                                }`}
                                            >
                                                {theme.isDark ? 'Dark' : 'Light'}
                                            </span>
                                            <span className="text-[10px] text-slate-500 capitalize">
                                                {theme.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                    {theme.description}
                                </p>
                            </div>

                            {/* Visual Palette Preview Bar */}
                            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="size-3.5 rounded-full border border-black/40 shadow-xs"
                                        style={{ backgroundColor: theme.bgPreview }}
                                        title="Latar Belakang"
                                    />
                                    <span
                                        className="size-3.5 rounded-full border border-black/40 shadow-xs"
                                        style={{ backgroundColor: theme.primaryColor }}
                                        title="Warna Utama"
                                    />
                                    <span
                                        className="size-3.5 rounded-full border border-black/40 shadow-xs"
                                        style={{ backgroundColor: theme.accentPreview }}
                                        title="Aksen Highlight"
                                    />
                                </div>
                                <span
                                    className="text-[11px] font-semibold transition-colors"
                                    style={{ color: isSelected ? theme.primaryColor : '#94a3b8' }}
                                >
                                    {isSelected ? '✓ Sedang Digunakan' : 'Gunakan Tema'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {filteredThemes.length === 0 && (
                <div className="text-center py-12 border border-slate-800 rounded-2xl bg-[#0f172a]/30">
                    <Palette className="size-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">Tidak ada tema yang cocok</p>
                    <p className="text-xs text-slate-500 mt-0.5">Coba gunakan kata kunci pencarian atau kategori lain.</p>
                </div>
            )}
        </div>
    );
}

