import { useSyncExternalStore } from 'react';
import { router } from '@inertiajs/react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type ThemeType = 'midnight' | 'carbon' | 'cyberpunk' | 'emerald' | 'amber' | 'light';

export interface ThemeOption {
    id: ThemeType;
    name: string;
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
        description: 'Tema default security dengan nuansa biru malam dan aksen cyan.',
        primaryColor: '#2563eb',
        bgPreview: '#070c18',
        accentPreview: '#3b82f6',
        isDark: true,
    },
    {
        id: 'carbon',
        name: 'Tactical Carbon',
        description: 'Nuansa hitam pekat taktikal dengan aksen hijau matrix emerald.',
        primaryColor: '#10b981',
        bgPreview: '#09090b',
        accentPreview: '#34d399',
        isDark: true,
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk Violet',
        description: 'Nuansa ungu kosmik futuristik dengan aksen neon magenta.',
        primaryColor: '#a855f7',
        bgPreview: '#0d0817',
        accentPreview: '#c084fc',
        isDark: true,
    },
    {
        id: 'emerald',
        name: 'Emerald Forest',
        description: 'Nuansa hijau rimba teduh dengan aksen mint spruce.',
        primaryColor: '#059669',
        bgPreview: '#041310',
        accentPreview: '#10b981',
        isDark: true,
    },
    {
        id: 'amber',
        name: 'Sunset Bronze',
        description: 'Nuansa arang hangat dengan aksen emas tembaga mewah.',
        primaryColor: '#d97706',
        bgPreview: '#120d09',
        accentPreview: '#f59e0b',
        isDark: true,
    },
    {
        id: 'light',
        name: 'Clean Alpine (Light)',
        description: 'Tema terang modern yang bersih, kontras tinggi, dan nyaman di mata.',
        primaryColor: '#2563eb',
        bgPreview: '#f8fafc',
        accentPreview: '#2563eb',
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
