import { useSyncExternalStore } from 'react';
import { router } from '@inertiajs/react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type ThemeType =
    | 'midnight'
    | 'carbon'
    | 'cyberpunk'
    | 'emerald'
    | 'amber'
    | 'crimson'
    | 'ocean'
    | 'nordic'
    | 'blackout'
    | 'royal'
    | 'toxic'
    | 'light'
    | 'sandstone'
    | 'rosegold';

export interface ThemeOption {
    id: ThemeType;
    name: string;
    category: 'dark' | 'neon' | 'tactical' | 'light' | 'luxury';
    description: string;
    primaryColor: string;
    bgPreview: string;
    accentPreview: string;
    isDark: boolean;
}

export const AVAILABLE_THEMES: ThemeOption[] = [
    {
        id: 'midnight',
        name: 'Midnight Navy',
        category: 'dark',
        description: 'Tema default security dengan nuansa biru laut dalam dan aksen glowing cyan.',
        primaryColor: '#2563eb',
        bgPreview: '#070c18',
        accentPreview: '#3b82f6',
        isDark: true,
    },
    {
        id: 'carbon',
        name: 'Tactical Carbon',
        category: 'tactical',
        description: 'Nuansa hitam pekat taktikal dengan aksen hijau matrix emerald super tajam.',
        primaryColor: '#10b981',
        bgPreview: '#09090b',
        accentPreview: '#34d399',
        isDark: true,
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        category: 'neon',
        description: 'Nuansa ungu kosmik futuristik synthwave dengan aksen neon magenta berpendar.',
        primaryColor: '#a855f7',
        bgPreview: '#0d0817',
        accentPreview: '#c084fc',
        isDark: true,
    },
    {
        id: 'emerald',
        name: 'Emerald Forest',
        category: 'tactical',
        description: 'Nuansa hijau rimba teduh dan damai dengan aksen mint spruce yang elegan.',
        primaryColor: '#059669',
        bgPreview: '#041310',
        accentPreview: '#10b981',
        isDark: true,
    },
    {
        id: 'amber',
        name: 'Sunset Bronze',
        category: 'luxury',
        description: 'Nuansa arang hangat dengan aksen emas tembaga temaram mewah.',
        primaryColor: '#d97706',
        bgPreview: '#120d09',
        accentPreview: '#f59e0b',
        isDark: true,
    },
    {
        id: 'crimson',
        name: 'Crimson Protocol',
        category: 'neon',
        description: 'Nuansa merah marun siaga tinggi (Red Alert) dengan aksen scarlet menyala.',
        primaryColor: '#dc2626',
        bgPreview: '#13080a',
        accentPreview: '#ef4444',
        isDark: true,
    },
    {
        id: 'ocean',
        name: 'Ocean Abyss',
        category: 'dark',
        description: 'Nuansa palung samudera biru pekat dengan aksen cyan aquatic berkilau.',
        primaryColor: '#0891b2',
        bgPreview: '#04111d',
        accentPreview: '#06b6d4',
        isDark: true,
    },
    {
        id: 'nordic',
        name: 'Nordic Slate',
        category: 'tactical',
        description: 'Nuansa abu-abu kutub es dingin modern dengan aksen sky blue sejuk.',
        primaryColor: '#38bdf8',
        bgPreview: '#0b1016',
        accentPreview: '#7dd3fc',
        isDark: true,
    },
    {
        id: 'blackout',
        name: 'OLED Blackout',
        category: 'tactical',
        description: 'Hitam murni 100% OLED hemat daya dengan teks platinum kontras tertinggi.',
        primaryColor: '#ffffff',
        bgPreview: '#000000',
        accentPreview: '#cbd5e1',
        isDark: true,
    },
    {
        id: 'royal',
        name: 'Royal Indigo',
        category: 'luxury',
        description: 'Nuansa ungu beludru bangsawan agung dengan aksen indigo elektrik mempesona.',
        primaryColor: '#6366f1',
        bgPreview: '#08081a',
        accentPreview: '#818cf8',
        isDark: true,
    },
    {
        id: 'toxic',
        name: 'Safety Toxic',
        category: 'neon',
        description: 'Nuansa gelap taktis militer dengan aksen hijau stabilo/lime K3 keselamatan.',
        primaryColor: '#84cc16',
        bgPreview: '#090d08',
        accentPreview: '#a3e635',
        isDark: true,
    },
    {
        id: 'rosegold',
        name: 'Rose Gold Luxe',
        category: 'luxury',
        description: 'Nuansa plum gelap berkelas dengan aksen rose gold pink lembut premium.',
        primaryColor: '#f43f5e',
        bgPreview: '#140910',
        accentPreview: '#fb7185',
        isDark: true,
    },
    {
        id: 'light',
        name: 'Clean Alpine',
        category: 'light',
        description: 'Tema terang modern bersih, kontras seimbang, dan sangat nyaman di siang hari.',
        primaryColor: '#2563eb',
        bgPreview: '#f8fafc',
        accentPreview: '#1d4ed8',
        isDark: false,
    },
    {
        id: 'sandstone',
        name: 'Sandstone Warm',
        category: 'light',
        description: 'Tema terang bernuansa pasir hangat & gading elegan yang santai untuk mata.',
        primaryColor: '#b45309',
        bgPreview: '#fbf9f5',
        accentPreview: '#92400e',
        isDark: false,
    },
];

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly currentTheme: ThemeType;
    readonly updateAppearance: (mode: Appearance) => void;
    readonly updateTheme: (theme: ThemeType, syncBackend?: boolean) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';
let currentTheme: ThemeType = 'midnight';

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredTheme = (): ThemeType => {
    if (typeof window === 'undefined') return 'midnight';
    return (localStorage.getItem('app_theme') as ThemeType) || 'midnight';
};

const applyThemeToDOM = (theme: ThemeType): void => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-theme', theme);

    const themeConfig = AVAILABLE_THEMES.find((t) => t.id === theme);
    const isDark = themeConfig ? themeConfig.isDark : true;

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeTheme(userPreferredTheme?: string): void {
    if (typeof window === 'undefined') return;

    if (userPreferredTheme && AVAILABLE_THEMES.some((t) => t.id === userPreferredTheme)) {
        currentTheme = userPreferredTheme as ThemeType;
        localStorage.setItem('app_theme', currentTheme);
    } else {
        currentTheme = getStoredTheme();
    }

    applyThemeToDOM(currentTheme);
}

export function useAppearance(): UseAppearanceReturn {
    const activeTheme: ThemeType = useSyncExternalStore(
        subscribe,
        () => currentTheme,
        () => 'midnight',
    );

    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'dark',
    );

    const updateTheme = (newTheme: ThemeType, syncBackend = true): void => {
        currentTheme = newTheme;
        localStorage.setItem('app_theme', newTheme);
        setCookie('app_theme', newTheme);
        applyThemeToDOM(newTheme);
        notify();

        if (syncBackend) {
            router.post(
                '/settings/theme',
                { theme: newTheme },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onError: () => {},
                },
            );
        }
    };

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;
        localStorage.setItem('appearance', mode);
        setCookie('appearance', mode);
        notify();
    };

    return {
        appearance,
        resolvedAppearance: 'dark',
        currentTheme: activeTheme,
        updateAppearance,
        updateTheme,
    } as const;
}
