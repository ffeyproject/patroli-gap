import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    Eye,
    EyeOff,
    KeyRound,
    Lock,
    Mail,
    ShieldCheck,
} from 'lucide-react';

interface Props {
    status?: string;
    canResetPassword?: boolean;
}

export default function Login({ status }: Props) {
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm({
        email: 'superadmin@patroli.id',
        password: 'password',
        remember: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/login', {
            onFinish: () => form.reset('password'),
        });
    };

    const handleQuickLogin = (email: string) => {
        form.setData({
            email: email,
            password: 'password',
            remember: true,
        });
    };

    return (
        <div className="min-h-screen w-full bg-[#070c18] flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-hidden text-slate-100 selection:bg-blue-600 selection:text-white">
            <Head title="Masuk Sistem - Patroli Security PT. Gajah Angkasa Perkasa" />

            {/* Glowing background lighting */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-25 pointer-events-none" />

            {/* Top Empty Space for Balancing */}
            <div className="h-2" />

            {/* Center: Main Compact Login Card */}
            <div className="relative z-10 w-full max-w-md my-auto">
                <div className="rounded-2xl border border-slate-800/90 bg-[#0f172a]/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/60 space-y-6">
                    {/* Header Logo & Title */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex aspect-square size-16 items-center justify-center rounded-2xl bg-[#141e33] border border-slate-700/80 shadow-lg shadow-blue-500/10 p-2.5 mx-auto">
                            <img
                                src="/images/logo.png"
                                alt="Logo PT. Gajah Angkasa Perkasa"
                                className="size-full object-contain"
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                Patroli Security
                            </h1>
                            <p className="text-xs font-semibold text-blue-400 mt-0.5">
                                PT. Gajah Angkasa Perkasa
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Sistem Pemantauan Patroli Satpam & Checkpoint
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-400 text-[11px] font-semibold">
                            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                            Versi 1.0 • Portal Petugas & Admin
                        </div>
                    </div>

                    {status && (
                        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs font-medium text-emerald-300 text-center">
                            {status}
                        </div>
                    )}

                    {/* Form Login */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username / Email Input */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Username / Email / Nomor Badge
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                    <Mail className="size-4" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Contoh: superadmin / agus / SEC-002"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            {form.errors.email && (
                                <p className="text-xs text-red-400 mt-1">{form.errors.email}</p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-slate-300">
                                    Kata Sandi
                                </label>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                    <KeyRound className="size-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                            {form.errors.password && (
                                <p className="text-xs text-red-400 mt-1">{form.errors.password}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm py-3 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                            <Lock className="size-4" />
                            <span>{form.processing ? 'Memverifikasi...' : 'Masuk ke Sistem Patroli'}</span>
                        </button>
                    </form>

                    {/* Quick Demo Credentials Buttons */}
                    <div className="pt-3 border-t border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 block mb-2 text-center">
                            Klik untuk Login Cepat (Demo):
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('superadmin@patroli.id')}
                                className="p-2 rounded-xl bg-[#141e33] hover:bg-[#1a2642] border border-slate-700/70 text-center transition-colors cursor-pointer"
                            >
                                <div className="text-[11px] font-bold text-blue-400">Super Admin</div>
                                <div className="text-[10px] text-slate-400 truncate">Ferry Gilang</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('budi@patroli.id')}
                                className="p-2 rounded-xl bg-[#141e33] hover:bg-[#1a2642] border border-slate-700/70 text-center transition-colors cursor-pointer"
                            >
                                <div className="text-[11px] font-bold text-cyan-400">Danru</div>
                                <div className="text-[10px] text-slate-400 truncate">Budi Santoso</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('agus@patroli.id')}
                                className="p-2 rounded-xl bg-[#141e33] hover:bg-[#1a2642] border border-slate-700/70 text-center transition-colors cursor-pointer"
                            >
                                <div className="text-[11px] font-bold text-emerald-400">Satpam</div>
                                <div className="text-[10px] text-slate-400 truncate">Agus Pratama</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Footer Copyright */}
            <div className="relative z-10 text-center text-xs text-slate-400 py-3">
                <p>&copy; {new Date().getFullYear()} <strong>PT. Gajah Angkasa Perkasa</strong>. All rights reserved.</p>
            </div>
        </div>
    );
}

Login.layout = (page: React.ReactNode) => page;
