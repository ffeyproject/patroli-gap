export default function AppLogo() {
    return (
        <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-[#0f172a] border border-slate-700/80 shadow-md p-1.5 shrink-0">
                <img src="/images/logo.png" alt="Logo PT. Gajah Angkasa Perkasa" className="size-full object-contain" />
            </div>
            <div className="grid flex-1 text-left min-w-0">
                <span className="text-sm font-bold tracking-tight text-white leading-tight truncate">
                    Patroli Security
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                    PT. Gajah Angkasa Perkasa
                </span>
            </div>
        </div>
    );
}
