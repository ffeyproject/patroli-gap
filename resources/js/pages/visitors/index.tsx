import { Head, router } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    Car,
    Clock,
    LogOut,
    Plus,
    User,
    Users,
} from 'lucide-react';

interface Visitor {
    id: number;
    guest_name: string;
    company?: string;
    destination: string;
    purpose: string;
    vehicle_number?: string;
    id_photo_path?: string;
    check_in_at: string;
    check_out_at?: string;
    status: 'checked_in' | 'checked_out';
    site?: { name: string };
    user?: { name: string };
}

interface Props {
    visitors: {
        data: Visitor[];
        current_page: number;
        last_page: number;
    };
    sites: Array<{ id: number; name: string }>;
}

export default function VisitorsIndex({ visitors }: Props) {
    const handleCheckOut = (id: number) => {
        if (confirm('Konfirmasi checkout pengunjung ini?')) {
            router.post(`/buku-tamu/${id}/checkout`);
        }
    };

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Buku Tamu Digital - Patroli Security" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <Users className="size-7 text-purple-400" />
                        Buku Tamu Digital (Visitor Logbook)
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Pencatatan data pengunjung, tujuan, nomor kendaraan, dan waktu check-in/out.
                    </p>
                </div>
            </div>

            {/* Visitors Table */}
            <div className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-[#131b2e]/60 text-slate-400 uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Nama Tamu</th>
                                <th className="px-4 py-3">Instansi / Perusahaan</th>
                                <th className="px-4 py-3">Tujuan & Keperluan</th>
                                <th className="px-4 py-3">Kendaraan</th>
                                <th className="px-4 py-3">Waktu Masuk</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {visitors.data.map((vis) => (
                                <tr key={vis.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-white">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-7 items-center justify-center rounded-full bg-purple-950 text-purple-300 font-bold border border-purple-800 text-xs">
                                                {vis.guest_name.charAt(0)}
                                            </div>
                                            <span>{vis.guest_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        {vis.company || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{vis.destination}</div>
                                        <div className="text-[10px] text-slate-400">{vis.purpose}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                                        {vis.vehicle_number || '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                                        {new Date(vis.check_in_at).toLocaleTimeString('id-ID')} WIB
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                            vis.status === 'checked_in'
                                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}>
                                            <span className="size-1.5 rounded-full bg-current" />
                                            {vis.status === 'checked_in' ? 'Di Lokasi' : 'Sudah Keluar'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {vis.status === 'checked_in' ? (
                                            <button
                                                onClick={() => handleCheckOut(vis.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-900 text-red-300 px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <LogOut className="size-3" />
                                                <span>Check Out</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] font-mono text-slate-500">
                                                Keluar: {vis.check_out_at ? new Date(vis.check_out_at).toLocaleTimeString('id-ID') : '-'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
