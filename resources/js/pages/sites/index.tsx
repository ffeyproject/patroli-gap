import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Download,
    Edit2,
    LocateFixed,
    MapPin,
    Pencil,
    Plus,
    Printer,
    QrCode,
    Shield,
    Trash2,
    X,
} from 'lucide-react';

interface Checkpoint {
    id: number;
    site_id: number;
    name: string;
    code: string;
    qr_token: string;
    qr_image_url: string;
    location_description?: string;
    latitude: number;
    longitude: number;
    max_radius_meters: number;
    order_index: number;
    is_active: boolean;
}

interface Site {
    id: number;
    name: string;
    code: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    geofence_radius_meters: number;
    is_active: boolean;
    checkpoints: Checkpoint[];
}

interface Props {
    sites: Site[];
}

export default function SitesIndex({ sites }: Props) {
    const [selectedSiteId, setSelectedSiteId] = useState<number>(sites[0]?.id || 1);
    
    // Modals state
    const [isAddCheckpointModalOpen, setIsAddCheckpointModalOpen] = useState(false);
    const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
    const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);

    const [isEditCheckpointModalOpen, setIsEditCheckpointModalOpen] = useState(false);
    const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
    const [selectedQrCheckpoint, setSelectedQrCheckpoint] = useState<Checkpoint | null>(null);

    // GPS Loading states
    const [isDetectingAddSiteGps, setIsDetectingAddSiteGps] = useState(false);
    const [isDetectingEditSiteGps, setIsDetectingEditSiteGps] = useState(false);
    const [isDetectingAddCpGps, setIsDetectingAddCpGps] = useState(false);
    const [isDetectingEditCpGps, setIsDetectingEditCpGps] = useState(false);

    const activeSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

    // Form for Adding Checkpoint
    const checkpointForm = useForm({
        site_id: selectedSiteId,
        name: '',
        code: '',
        location_description: '',
        latitude: '',
        longitude: '',
        max_radius_meters: 10,
        order_index: (activeSite?.checkpoints?.length || 0) + 1,
    });

    // Form for Editing Checkpoint
    const editCheckpointForm = useForm({
        name: '',
        code: '',
        location_description: '',
        latitude: '',
        longitude: '',
        max_radius_meters: 10,
        order_index: 1,
        is_active: true,
        regenerate_qr: false,
    });

    // Form for Adding Site
    const siteForm = useForm({
        name: '',
        code: '',
        address: '',
        latitude: '',
        longitude: '',
        geofence_radius_meters: 50,
    });

    // Form for Editing Site
    const editSiteForm = useForm({
        name: '',
        code: '',
        address: '',
        latitude: '',
        longitude: '',
        geofence_radius_meters: 50,
    });

    // GPS Geolocation Handler Helper
    const detectGps = (
        setLoading: (loading: boolean) => void,
        onSuccess: (lat: string, lng: string) => void
    ) => {
        if (!navigator.geolocation) {
            alert('Browser tidak mendukung pendeteksian Geolocation / GPS.');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(7);
                const lng = pos.coords.longitude.toFixed(7);
                onSuccess(lat, lng);
                setLoading(false);
            },
            (err) => {
                alert('Gagal mengambil koordinat GPS: ' + err.message);
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Actions Checkpoint
    const submitCheckpoint = (e: React.FormEvent) => {
        e.preventDefault();
        checkpointForm.setData('site_id', selectedSiteId);
        checkpointForm.post('/checkpoints/store', {
            onSuccess: () => {
                setIsAddCheckpointModalOpen(false);
                checkpointForm.reset();
            },
        });
    };

    const openEditCheckpoint = (cp: Checkpoint) => {
        setEditingCheckpoint(cp);
        editCheckpointForm.setData({
            name: cp.name,
            code: cp.code,
            location_description: cp.location_description || '',
            latitude: cp.latitude ? String(cp.latitude) : '',
            longitude: cp.longitude ? String(cp.longitude) : '',
            max_radius_meters: cp.max_radius_meters || 10,
            order_index: cp.order_index || 1,
            is_active: cp.is_active ?? true,
            regenerate_qr: false,
        });
        setIsEditCheckpointModalOpen(true);
    };

    const submitEditCheckpoint = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCheckpoint) return;
        editCheckpointForm.post(`/checkpoints/${editingCheckpoint.id}`, {
            onSuccess: () => {
                setIsEditCheckpointModalOpen(false);
                setEditingCheckpoint(null);
            },
        });
    };

    const deleteCheckpoint = (cp: Checkpoint) => {
        if (confirm(`Apakah Anda yakin ingin menghapus titik patroli "${cp.name}" (${cp.code})? Data patroli terkait mungkin akan terpengaruh.`)) {
            router.delete(`/checkpoints/${cp.id}`);
        }
    };

    // Actions Site
    const submitSite = (e: React.FormEvent) => {
        e.preventDefault();
        siteForm.post('/sites/store', {
            onSuccess: () => {
                setIsAddSiteModalOpen(false);
                siteForm.reset();
            },
        });
    };

    const openEditSite = (site: Site) => {
        setEditingSite(site);
        editSiteForm.setData({
            name: site.name,
            code: site.code,
            address: site.address || '',
            latitude: site.latitude ? String(site.latitude) : '',
            longitude: site.longitude ? String(site.longitude) : '',
            geofence_radius_meters: site.geofence_radius_meters || 50,
        });
        setIsEditSiteModalOpen(true);
    };

    const submitEditSite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSite) return;
        editSiteForm.post(`/sites/${editingSite.id}/update`, {
            onSuccess: () => {
                setIsEditSiteModalOpen(false);
                setEditingSite(null);
            },
        });
    };

    const deleteSite = (site: Site) => {
        if (confirm(`Apakah Anda yakin ingin menghapus Site/Gedung "${site.name}" (${site.code}) beserta seluruh titik patroli di dalamnya?`)) {
            router.delete(`/sites/${site.id}`, {
                onSuccess: () => {
                    const remaining = sites.filter((s) => s.id !== site.id);
                    if (remaining.length > 0) {
                        setSelectedSiteId(remaining[0].id);
                    }
                },
            });
        }
    };

    const handlePrintQr = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-[var(--bg-card)]/30 p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Site & Checkpoint - Patroli Security" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <MapPin className="size-7 text-blue-500" />
                        Site & Titik Checkpoint Patroli
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Kelola lokasi site, atur titik patroli, radius geofence & cetak QR Code stiker.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setIsAddSiteModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-semibold border border-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Tambah Site</span>
                    </button>
                    <button
                        onClick={() => {
                            checkpointForm.setData('site_id', selectedSiteId);
                            setIsAddCheckpointModalOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Tambah Titik Patroli</span>
                    </button>
                </div>
            </div>

            {/* Site Selection Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {sites.map((site) => (
                    <button
                        key={site.id}
                        onClick={() => setSelectedSiteId(site.id)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            selectedSiteId === site.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500'
                                : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <Shield className="size-4" />
                        <span>{site.name}</span>
                        <span className="bg-slate-900/60 px-2 py-0.5 rounded-full text-[10px] font-mono">
                            {site.checkpoints?.length || 0} Titik
                        </span>
                    </button>
                ))}
            </div>

            {/* Checkpoints Grid */}
            {activeSite && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400 bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                        <div className="space-y-1">
                            <div>
                                <span className="font-semibold text-white">Nama Site:</span> <strong className="text-blue-400">{activeSite.name}</strong> ({activeSite.code})
                            </div>
                            <div>
                                <span className="font-semibold text-white">Alamat:</span> {activeSite.address || '-'}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <span>Koordinat: <strong className="text-white font-mono">{activeSite.latitude ?? '-'}, {activeSite.longitude ?? '-'}</strong></span>
                            <span>Radius Geofence: <strong className="text-emerald-400">{activeSite.geofence_radius_meters}m</strong></span>
                            <div className="flex items-center gap-2 border-l border-slate-700/60 pl-3">
                                <button
                                    onClick={() => openEditSite(activeSite)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                                    title="Edit Informasi Site"
                                >
                                    <Pencil className="size-3.5 text-blue-400" />
                                    <span>Edit Site</span>
                                </button>
                                <button
                                    onClick={() => deleteSite(activeSite)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-medium transition-colors cursor-pointer"
                                    title="Hapus Site"
                                >
                                    <Trash2 className="size-3.5 text-red-400" />
                                    <span>Hapus Site</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeSite.checkpoints.map((cp, idx) => (
                            <div
                                key={cp.id}
                                className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 p-5 space-y-4 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-950 border border-blue-800 font-bold text-blue-400 text-xs font-mono">
                                                #{cp.order_index || idx + 1}
                                            </span>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">
                                                    {cp.name}
                                                </h3>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {cp.code}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                                            Max {cp.max_radius_meters || 10}m
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 mt-3 line-clamp-2">
                                        {cp.location_description || 'Titik patroli rutin.'}
                                    </p>

                                    <div className="mt-3 p-2.5 rounded-lg bg-[#141e33] text-[11px] font-mono text-slate-400 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Latitude:</span>
                                            <span className="text-white font-bold">{cp.latitude}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Longitude:</span>
                                            <span className="text-white font-bold">{cp.longitude}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>QR Token:</span>
                                            <span className="text-cyan-400">{cp.qr_token}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                                    <button
                                        onClick={() => setSelectedQrCheckpoint(cp)}
                                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                                    >
                                        <QrCode className="size-3.5" />
                                        <span>Lihat QR</span>
                                    </button>
                                    <button
                                        onClick={() => openEditCheckpoint(cp)}
                                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 transition-colors cursor-pointer"
                                        title="Edit Titik Checkpoint"
                                    >
                                        <Pencil className="size-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteCheckpoint(cp)}
                                        className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800/60 transition-colors cursor-pointer"
                                        title="Hapus Titik Checkpoint"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* Modal 1: Tambah Titik Patroli Baru                        */}
            {/* ======================================================== */}
            {isAddCheckpointModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-lg w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Plus className="size-5 text-blue-400" />
                                <span>Tambah Titik Lokasi Patroli Baru</span>
                            </div>
                            <button
                                onClick={() => setIsAddCheckpointModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitCheckpoint} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Nama Titik Checkpoint *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Pintu Darurat Lantai 3 Sayap Barat"
                                    value={checkpointForm.data.name}
                                    onChange={(e) => checkpointForm.setData('name', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Kode Titik *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: CP-08"
                                        value={checkpointForm.data.code}
                                        onChange={(e) => checkpointForm.setData('code', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Radius Maksimal (Meter) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={50}
                                        value={checkpointForm.data.max_radius_meters}
                                        onChange={(e) => checkpointForm.setData('max_radius_meters', parseInt(e.target.value))}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <span className="text-[10px] text-emerald-400 mt-0.5 block">Default ketat 10 meter</span>
                                </div>
                            </div>

                            {/* GPS Coordinates & Auto-Detect Button */}
                            <div className="rounded-xl bg-[#141e33] border border-slate-800 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white">Koordinat Titik GPS</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            detectGps(setIsDetectingAddCpGps, (lat, lng) => {
                                                checkpointForm.setData((data) => ({
                                                    ...data,
                                                    latitude: lat,
                                                    longitude: lng,
                                                }));
                                            })
                                        }
                                        disabled={isDetectingAddCpGps}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
                                    >
                                        <LocateFixed className={`size-3.5 ${isDetectingAddCpGps ? 'animate-spin' : ''}`} />
                                        <span>{isDetectingAddCpGps ? 'Mendeteksi...' : 'Ambil Lokasi Terkini'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Latitude</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="-6.2298500"
                                            value={checkpointForm.data.latitude}
                                            onChange={(e) => checkpointForm.setData('latitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Longitude</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="106.8296500"
                                            value={checkpointForm.data.longitude}
                                            onChange={(e) => checkpointForm.setData('longitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Deskripsi / Instruksi Khusus
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Contoh: Periksa gembok pintu darurat dan pastikan tidak terhalang barang."
                                    value={checkpointForm.data.location_description}
                                    onChange={(e) => checkpointForm.setData('location_description', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddCheckpointModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkpointForm.processing}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 cursor-pointer"
                                >
                                    Simpan & Generate QR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* Modal 2: Edit Titik Patroli                              */}
            {/* ======================================================== */}
            {isEditCheckpointModalOpen && editingCheckpoint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-lg w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Edit2 className="size-5 text-blue-400" />
                                <span>Edit Titik Patroli: {editingCheckpoint.name}</span>
                            </div>
                            <button
                                onClick={() => setIsEditCheckpointModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitEditCheckpoint} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Nama Titik Checkpoint *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editCheckpointForm.data.name}
                                    onChange={(e) => editCheckpointForm.setData('name', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Kode Titik *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editCheckpointForm.data.code}
                                        onChange={(e) => editCheckpointForm.setData('code', e.target.value)}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Radius Maksimal (Meter) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={50}
                                        value={editCheckpointForm.data.max_radius_meters}
                                        onChange={(e) => editCheckpointForm.setData('max_radius_meters', parseInt(e.target.value))}
                                        className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* GPS Coordinates & Auto-Detect Button */}
                            <div className="rounded-xl bg-[#141e33] border border-slate-800 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white">Koordinat Titik GPS</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            detectGps(setIsDetectingEditCpGps, (lat, lng) => {
                                                editCheckpointForm.setData((data) => ({
                                                    ...data,
                                                    latitude: lat,
                                                    longitude: lng,
                                                }));
                                            })
                                        }
                                        disabled={isDetectingEditCpGps}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
                                    >
                                        <LocateFixed className={`size-3.5 ${isDetectingEditCpGps ? 'animate-spin' : ''}`} />
                                        <span>{isDetectingEditCpGps ? 'Mendeteksi...' : 'Ambil Lokasi Terkini'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Latitude</label>
                                        <input
                                            type="text"
                                            required
                                            value={editCheckpointForm.data.latitude}
                                            onChange={(e) => editCheckpointForm.setData('latitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Longitude</label>
                                        <input
                                            type="text"
                                            required
                                            value={editCheckpointForm.data.longitude}
                                            onChange={(e) => editCheckpointForm.setData('longitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Urutan Patroli (Order Index)
                                </label>
                                <input
                                    type="number"
                                    value={editCheckpointForm.data.order_index}
                                    onChange={(e) => editCheckpointForm.setData('order_index', parseInt(e.target.value))}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Deskripsi / Instruksi Khusus
                                </label>
                                <textarea
                                    rows={2}
                                    value={editCheckpointForm.data.location_description}
                                    onChange={(e) => editCheckpointForm.setData('location_description', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* QR Token Info & Regenerate Option */}
                            <div className="rounded-xl bg-[#141e33] border border-slate-800 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[11px] text-slate-400 font-medium">QR Token Saat Ini</div>
                                        <div className="text-xs font-mono text-cyan-400 font-bold">{editingCheckpoint.qr_token}</div>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-amber-400 cursor-pointer bg-amber-950/40 border border-amber-800/60 px-2.5 py-1.5 rounded-lg hover:bg-amber-950/70 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={editCheckpointForm.data.regenerate_qr}
                                            onChange={(e) => editCheckpointForm.setData('regenerate_qr', e.target.checked)}
                                            className="rounded border-amber-700 text-amber-500 focus:ring-0 cursor-pointer"
                                        />
                                        <span className="font-semibold text-[11px]">Generate Token Baru</span>
                                    </label>
                                </div>
                                {editCheckpointForm.data.regenerate_qr && (
                                    <p className="text-[11px] text-amber-300/90 leading-tight bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                                        ⚠️ <strong>Perhatian:</strong> QR Token lama akan diganti dengan kode token acak baru. Anda harus mencetak ulang stiker QR fisik di titik lokasi.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsEditCheckpointModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editCheckpointForm.processing}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 cursor-pointer"
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* Modal 3: Tambah Site Baru                                */}
            {/* ======================================================== */}
            {isAddSiteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-md w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Shield className="size-5 text-blue-400" />
                                <span>Tambah Site / Lokasi Baru</span>
                            </div>
                            <button
                                onClick={() => setIsAddSiteModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitSite} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Nama Site / Gedung *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Gedung Annex Tower"
                                    value={siteForm.data.name}
                                    onChange={(e) => siteForm.setData('name', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Kode Site *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: SITE-AT"
                                    value={siteForm.data.code}
                                    onChange={(e) => siteForm.setData('code', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* GPS Coordinates & Auto-Detect Button for Site */}
                            <div className="rounded-xl bg-[#141e33] border border-slate-800 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white">Koordinat Pusat Site (GPS)</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            detectGps(setIsDetectingAddSiteGps, (lat, lng) => {
                                                siteForm.setData((data) => ({
                                                    ...data,
                                                    latitude: lat,
                                                    longitude: lng,
                                                }));
                                            })
                                        }
                                        disabled={isDetectingAddSiteGps}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
                                    >
                                        <LocateFixed className={`size-3.5 ${isDetectingAddSiteGps ? 'animate-spin' : ''}`} />
                                        <span>{isDetectingAddSiteGps ? 'Mendeteksi...' : 'Ambil Lokasi Terkini'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Latitude</label>
                                        <input
                                            type="text"
                                            placeholder="-6.2298500"
                                            value={siteForm.data.latitude}
                                            onChange={(e) => siteForm.setData('latitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Longitude</label>
                                        <input
                                            type="text"
                                            placeholder="106.8296500"
                                            value={siteForm.data.longitude}
                                            onChange={(e) => siteForm.setData('longitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Radius Geofence (Meter)
                                </label>
                                <input
                                    type="number"
                                    min={10}
                                    value={siteForm.data.geofence_radius_meters}
                                    onChange={(e) => siteForm.setData('geofence_radius_meters', parseInt(e.target.value))}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Alamat Lengkap
                                </label>
                                <textarea
                                    rows={2}
                                    value={siteForm.data.address}
                                    onChange={(e) => siteForm.setData('address', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddSiteModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={siteForm.processing}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                                >
                                    Simpan Site
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* Modal 4: Edit Site                                       */}
            {/* ======================================================== */}
            {isEditSiteModalOpen && editingSite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-md w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Edit2 className="size-5 text-blue-400" />
                                <span>Edit Site: {editingSite.name}</span>
                            </div>
                            <button
                                onClick={() => setIsEditSiteModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitEditSite} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Nama Site / Gedung *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editSiteForm.data.name}
                                    onChange={(e) => editSiteForm.setData('name', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Kode Site *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editSiteForm.data.code}
                                    onChange={(e) => editSiteForm.setData('code', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* GPS Coordinates & Auto-Detect Button for Edit Site */}
                            <div className="rounded-xl bg-[#141e33] border border-slate-800 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white">Koordinat Pusat Site (GPS)</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            detectGps(setIsDetectingEditSiteGps, (lat, lng) => {
                                                editSiteForm.setData((data) => ({
                                                    ...data,
                                                    latitude: lat,
                                                    longitude: lng,
                                                }));
                                            })
                                        }
                                        disabled={isDetectingEditSiteGps}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
                                    >
                                        <LocateFixed className={`size-3.5 ${isDetectingEditSiteGps ? 'animate-spin' : ''}`} />
                                        <span>{isDetectingEditSiteGps ? 'Mendeteksi...' : 'Ambil Lokasi Terkini'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Latitude</label>
                                        <input
                                            type="text"
                                            placeholder="-6.2298500"
                                            value={editSiteForm.data.latitude}
                                            onChange={(e) => editSiteForm.setData('latitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-0.5">Longitude</label>
                                        <input
                                            type="text"
                                            placeholder="106.8296500"
                                            value={editSiteForm.data.longitude}
                                            onChange={(e) => editSiteForm.setData('longitude', e.target.value)}
                                            className="w-full rounded-lg bg-[#0c1222] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Radius Geofence (Meter)
                                </label>
                                <input
                                    type="number"
                                    min={10}
                                    value={editSiteForm.data.geofence_radius_meters}
                                    onChange={(e) => editSiteForm.setData('geofence_radius_meters', parseInt(e.target.value))}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                    Alamat Lengkap
                                </label>
                                <textarea
                                    rows={2}
                                    value={editSiteForm.data.address}
                                    onChange={(e) => editSiteForm.setData('address', e.target.value)}
                                    className="w-full rounded-xl bg-[#141e33] border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsEditSiteModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSiteForm.processing}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* Modal 5: Cetak QR Code Titik Patroli                     */}
            {/* ======================================================== */}
            {selectedQrCheckpoint && (
                <div id="printable-qr-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    {/* Print Specific CSS for exact 1-page printing */}
                    <style>{`
                        @page {
                            size: portrait;
                            margin: 10mm;
                        }
                        @media print {
                            html, body {
                                height: 100% !important;
                                max-height: 100% !important;
                                overflow: hidden !important;
                                background: #ffffff !important;
                                color: #000000 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            body * {
                                visibility: hidden !important;
                            }
                            #printable-qr-modal,
                            #printable-qr-modal * {
                                visibility: visible !important;
                            }
                            #printable-qr-modal {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                height: auto !important;
                                background: #ffffff !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                z-index: 999999 !important;
                                page-break-inside: avoid !important;
                                page-break-after: avoid !important;
                                break-inside: avoid !important;
                            }
                            #printable-qr-card {
                                position: relative !important;
                                border: 2.5px solid #0f172a !important;
                                box-shadow: none !important;
                                max-width: 380px !important;
                                width: 100% !important;
                                border-radius: 24px !important;
                                padding: 24px !important;
                                background: #ffffff !important;
                                margin: 0 auto !important;
                                page-break-inside: avoid !important;
                                page-break-after: avoid !important;
                                break-inside: avoid !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                    `}</style>

                    <div id="printable-qr-card" className="relative max-w-sm w-full bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
                        {/* Header (Hidden on Print) */}
                        <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                                STIKER CHECKPOINT PATROLI
                            </span>
                            <button
                                onClick={() => setSelectedQrCheckpoint(null)}
                                className="rounded-full p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">
                                {selectedQrCheckpoint.name}
                            </h2>
                            <p className="text-xs font-mono font-bold text-blue-600 mt-1">
                                {activeSite.name} • {selectedQrCheckpoint.code}
                            </p>
                        </div>

                        {/* Printable QR Display */}
                        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center">
                            <img
                                src={selectedQrCheckpoint.qr_image_url}
                                alt="QR Code Checkpoint"
                                className="size-48 object-contain rounded-lg"
                            />
                            <span className="text-[11px] font-mono font-bold text-slate-700 mt-2">
                                Token: {selectedQrCheckpoint.qr_token}
                            </span>
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-0.5 font-medium">
                            <div>Radius Toleransi: <strong>Maks {selectedQrCheckpoint.max_radius_meters ?? 10} Meter</strong></div>
                            <div className="font-mono text-[10px] text-slate-500">
                                GPS: {selectedQrCheckpoint.latitude}, {selectedQrCheckpoint.longitude}
                            </div>
                        </div>

                        {/* Print Footer Watermark */}
                        <div className="hidden print:block pt-3 border-t border-slate-200 text-[10px] text-slate-500 font-medium">
                            Patroli Security PT. Gajah Angkasa Perkasa • Sistem Pemantauan & Patroli
                        </div>

                        {/* Actions Button Bar (Hidden on Print) */}
                        <div className="no-print flex items-center gap-2 pt-2">
                            <button
                                onClick={handlePrintQr}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 text-xs font-bold shadow-md transition-colors cursor-pointer"
                            >
                                <Printer className="size-4" />
                                <span>Cetak Stiker QR</span>
                            </button>
                            <a
                                href={selectedQrCheckpoint.qr_image_url}
                                download={`qr_${selectedQrCheckpoint.code}.png`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 text-xs font-semibold cursor-pointer"
                                title="Download Gambar QR"
                            >
                                <Download className="size-4" />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
