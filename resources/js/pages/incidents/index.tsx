import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Eye,
    MapPin,
    User,
    X,
} from 'lucide-react';

interface Incident {
    id: number;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved';
    photo_path?: string;
    reported_at: string;
    resolved_at?: string;
    resolution_notes?: string;
    site?: { name: string };
    user?: { name: string; badge_number?: string };
    checkpoint?: { name: string };
}

interface Props {
    incidents: {
        data: Incident[];
        current_page: number;
        last_page: number;
    };
    sites: Array<{ id: number; name: string }>;
}

export default function IncidentsIndex({ incidents }: Props) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

    const statusForm = useForm({
        status: 'resolved',
        resolution_notes: '',
    });

    const handleUpdateStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedIncident) return;

        statusForm.post(`/insiden/${selectedIncident.id}/status`, {
            onSuccess: () => {
                setSelectedIncident(null);
                statusForm.reset();
            },
        });
    };

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Laporan Insiden - Patroli Security" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <AlertTriangle className="size-7 text-amber-500" />
                        Laporan Insiden & Kejadian Keamanan
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Pusat pemantauan tindak lanjut insiden darurat dan temuan patroli di lapangan.
                    </p>
                </div>
            </div>

            {/* Incidents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {incidents.data.map((inc) => (
                    <div
                        key={inc.id}
                        className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all"
                    >
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-bold text-white">
                                    {inc.title}
                                </h3>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    inc.severity === 'critical' || inc.severity === 'high'
                                        ? 'bg-red-950 text-red-400 border border-red-800'
                                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}>
                                    {inc.severity}
                                </span>
                            </div>

                            <p className="text-xs text-slate-300">
                                {inc.description}
                            </p>

                            <div className="p-2.5 rounded-xl bg-[#141e33] text-[11px] text-slate-400 space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-300">
                                    <MapPin className="size-3.5 text-slate-500" />
                                    <span>{inc.site?.name} • {inc.checkpoint?.name || 'Area Umum'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <User className="size-3.5 text-slate-500" />
                                    <span>Dilaporkan oleh: <strong className="text-white">{inc.user?.name}</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono">
                                    <Clock className="size-3.5 text-slate-500" />
                                    <span>{new Date(inc.reported_at).toLocaleString('id-ID')} WIB</span>
                                </div>
                            </div>

                            {inc.resolution_notes && (
                                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-300">
                                    <strong>Catatan Penanganan:</strong> {inc.resolution_notes}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                            {inc.photo_path && (
                                <button
                                    onClick={() => setSelectedPhoto('/' + inc.photo_path)}
                                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-2 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                                >
                                    <Eye className="size-3.5" />
                                    <span>Foto</span>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setSelectedIncident(inc);
                                    statusForm.setData('status', inc.status === 'open' ? 'resolved' : inc.status);
                                }}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold py-2 transition-colors cursor-pointer ${
                                    inc.status === 'resolved'
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                                }`}
                            >
                                <CheckCircle className="size-3.5" />
                                <span>{inc.status === 'resolved' ? 'Selesai Ditangani' : 'Tindak Lanjut'}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Update Status Insiden */}
            {selectedIncident && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-md w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <span className="text-white font-semibold text-sm">
                                Tindak Lanjut Insiden: {selectedIncident.title}
                            </span>
                            <button
                                onClick={() => setSelectedIncident(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateStatus} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Status Penanganan *
                                </label>
                                <select
                                    value={statusForm.data.status}
                                    onChange={(e) => statusForm.setData('status', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="open">Open (Belum Ditangani)</option>
                                    <option value="investigating">Investigating (Sedang Diperiksa)</option>
                                    <option value="resolved">Resolved (Selesai Ditangani)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Catatan / Solusi Penyelesaian
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Jelaskan tindakan yang sudah diambil oleh petugas keamanan..."
                                    value={statusForm.data.resolution_notes}
                                    onChange={(e) => statusForm.setData('resolution_notes', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setSelectedIncident(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={statusForm.processing}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
                                >
                                    Simpan Status
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Preview Foto */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-2xl w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <span className="text-white font-semibold text-sm">Foto Bukti Insiden</span>
                            <button onClick={() => setSelectedPhoto(null)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-black">
                            <img src={selectedPhoto} alt="Bukti Insiden" className="max-h-[65vh] w-auto object-contain rounded-lg" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
