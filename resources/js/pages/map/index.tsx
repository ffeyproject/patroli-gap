import { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import L from 'leaflet';
import {
    Activity,
    Compass,
    Eye,
    Layers,
    LocateFixed,
    MapPin,
    Maximize2,
    RefreshCw,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Target,
    UserCheck,
    Users,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';

interface Checkpoint {
    id: number;
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    max_radius_meters: number;
}

interface Site {
    id: number;
    name: string;
    code: string;
    latitude?: number;
    longitude?: number;
    checkpoints: Checkpoint[];
}

interface ActiveGuard {
    id: number;
    name: string;
    role: string;
    badge_number: string;
    phone: string;
    site_id: number;
    site_name: string;
    site_code: string;
    check_in_at: string;
    status: string;
    latitude: number;
    longitude: number;
    last_checkpoint_name: string;
    last_scanned_at: string;
    last_distance_meters: number;
    last_selfie_url?: string;
    is_in_patrol: boolean;
}

interface RecentLog {
    id: number;
    user_name: string;
    user_badge: string;
    site_name: string;
    checkpoint_name: string;
    scanned_at: string;
    distance_meters: number;
    condition_status: string;
    selfie_url?: string;
}

interface Props {
    sites: Site[];
    active_guards: ActiveGuard[];
    recent_logs: RecentLog[];
    total_guards_present: number;
    total_in_patrol: number;
}

type MapLayerType = 'google-hybrid' | 'google-streets' | 'google-satellite' | 'osm' | 'dark';

export default function LiveMapIndex({
    sites,
    active_guards: initialGuards,
    recent_logs: initialLogs,
}: Props) {
    const [guards, setGuards] = useState<ActiveGuard[]>(initialGuards);
    const [logs, setLogs] = useState<RecentLog[]>(initialLogs);
    const [selectedSiteId, setSelectedSiteId] = useState<number | 'all'>('all');
    const [selectedGuard, setSelectedGuard] = useState<ActiveGuard | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [isLiveActive, setIsLiveActive] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('id-ID'));
    const [activeLayer, setActiveLayer] = useState<MapLayerType>('google-hybrid');

    // Map references
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const guardMarkersRef = useRef<Map<number, L.Marker>>(new Map());
    const checkpointLayerGroupRef = useRef<L.LayerGroup | null>(null);

    // Polling live tracking data every 6 seconds
    const fetchLiveData = async () => {
        try {
            const res = await fetch('/peta-live/data', {
                headers: { Accept: 'application/json' },
            });
            const json = await res.json();
            if (json.success && json.data) {
                setGuards(json.data.active_guards);
                setLogs(json.data.recent_logs);
                setLastUpdated(new Date().toLocaleTimeString('id-ID'));
            }
        } catch (e) {
            console.error('Failed to poll live data', e);
        }
    };

    useEffect(() => {
        if (!isLiveActive) return;
        const interval = setInterval(() => {
            fetchLiveData();
        }, 6000);
        return () => clearInterval(interval);
    }, [isLiveActive]);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        fetchLiveData().finally(() => {
            setIsRefreshing(false);
        });
    };

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        // Default center: Site 1 or Jakarta default
        const defaultLat = sites[0]?.latitude ?? -6.2297465;
        const defaultLng = sites[0]?.longitude ?? 106.8295180;

        const map = L.map(mapContainerRef.current, {
            center: [defaultLat, defaultLng],
            zoom: 18,
            zoomControl: false,
            attributionControl: false,
        });

        // Add default tile layer (Google Maps Hybrid: real satellite + labeled buildings and roads)
        const tileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 21,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }).addTo(map);

        tileLayerRef.current = tileLayer;
        checkpointLayerGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Change Tile Layer (Google Hybrid, Google Maps Roadmap, Dark Mode, OSM)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        let newUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        let subdomains: string[] | string = ['mt0', 'mt1', 'mt2', 'mt3'];
        let maxZoom = 21;

        if (activeLayer === 'google-hybrid') {
            newUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
            subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
            maxZoom = 21;
        } else if (activeLayer === 'google-streets') {
            newUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
            subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
            maxZoom = 21;
        } else if (activeLayer === 'google-satellite') {
            newUrl = 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
            subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
            maxZoom = 21;
        } else if (activeLayer === 'osm') {
            newUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            subdomains = ['a', 'b', 'c'];
            maxZoom = 20;
        } else if (activeLayer === 'dark') {
            newUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            subdomains = 'abcd';
            maxZoom = 20;
        }

        const newTileLayer = L.tileLayer(newUrl, {
            maxZoom,
            subdomains,
        }).addTo(map);

        // Put behind markers
        newTileLayer.bringToBack();
        tileLayerRef.current = newTileLayer;
    }, [activeLayer]);

    // Render Checkpoints & 10m Geofence Perimeter Circles
    useEffect(() => {
        const map = mapInstanceRef.current;
        const cpGroup = checkpointLayerGroupRef.current;
        if (!map || !cpGroup) return;

        cpGroup.clearLayers();

        // Checkpoints to display
        const targetSites = selectedSiteId === 'all'
            ? sites
            : sites.filter((s) => s.id === selectedSiteId);

        targetSites.forEach((site) => {
            site.checkpoints.forEach((cp) => {
                if (!cp.latitude || !cp.longitude) return;

                // 1. Draw 10-meter Geofencing Radius Perimeter Ring
                const geofenceCircle = L.circle([cp.latitude, cp.longitude], {
                    radius: cp.max_radius_meters || 10,
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: '3, 4',
                });

                geofenceCircle.bindTooltip(
                    `<div class="text-xs font-mono font-bold text-sky-400">Radius Geofence: ${cp.max_radius_meters || 10}m</div>`,
                    { sticky: true }
                );
                cpGroup.addLayer(geofenceCircle);

                // 2. Custom Target Checkpoint Icon
                const cpIcon = L.divIcon({
                    className: 'custom-cp-marker',
                    html: `
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 28px;
                            height: 28px;
                            background: #0f172a;
                            border: 2px solid #38bdf8;
                            border-radius: 8px;
                            box-shadow: 0 4px 12px rgba(56, 189, 248, 0.4);
                            color: #38bdf8;
                            font-weight: 800;
                            font-size: 11px;
                            font-family: monospace;
                            cursor: pointer;
                        ">
                            ${cp.code.replace('CP-', '')}
                        </div>
                    `,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });

                const marker = L.marker([cp.latitude, cp.longitude], { icon: cpIcon });

                const popupHtml = `
                    <div style="font-family: inherit; color: #f8fafc; padding: 4px; min-width: 180px;">
                        <div style="font-size: 10px; color: #38bdf8; font-weight: bold; text-transform: uppercase;">
                            Checkpoint • ${cp.code}
                        </div>
                        <div style="font-size: 13px; font-weight: bold; margin-top: 2px; color: #ffffff;">
                            ${cp.name}
                        </div>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                            ${site.name}
                        </div>
                        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #334155; font-size: 11px; display: flex; justify-content: space-between;">
                            <span style="color: #94a3b8;">Max Radius:</span>
                            <strong style="color: #38bdf8;">${cp.max_radius_meters || 10} Meter</strong>
                        </div>
                        <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">
                            ${cp.latitude.toFixed(6)}, ${cp.longitude.toFixed(6)}
                        </div>
                    </div>
                `;

                marker.bindPopup(popupHtml, {
                    className: 'custom-leaflet-popup',
                });

                cpGroup.addLayer(marker);
            });
        });
    }, [sites, selectedSiteId]);

    // Update Live Guard Markers
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const currentMarkerIds = new Set<number>();

        const filteredGuards = selectedSiteId === 'all'
            ? guards
            : guards.filter((g) => g.site_id === selectedSiteId);

        filteredGuards.forEach((guard) => {
            if (!guard.latitude || !guard.longitude) return;
            currentMarkerIds.add(guard.id);

            const isSelected = selectedGuard?.id === guard.id;
            const markerColor = guard.is_in_patrol ? '#2563eb' : '#059669';
            const badgeBg = guard.is_in_patrol ? '#1d4ed8' : '#047857';
            const statusLabel = guard.is_in_patrol ? 'Sedang Patroli' : 'Standby / Hadir';

            // HTML Marker with animated wave, avatar icon, and visible floating label
            const guardIconHtml = `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; width: 140px; margin-left: -51px; margin-top: -46px;">
                    <!-- Floating Name & Status Badge -->
                    <div style="
                        background: ${badgeBg};
                        color: #ffffff;
                        padding: 3px 8px;
                        border-radius: 9999px;
                        font-size: 11px;
                        font-weight: 700;
                        white-space: nowrap;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                        border: 1.5px solid ${isSelected ? '#facc15' : '#ffffff'};
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        margin-bottom: 4px;
                        z-index: 10;
                    ">
                        <span style="font-size: 12px;">👮</span>
                        <span>${guard.name.split(' ')[0]}</span>
                        <span style="font-size: 9px; opacity: 0.9; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 4px;">
                            ${guard.is_in_patrol ? 'PATROLI' : 'HADIR'}
                        </span>
                    </div>

                    <!-- Glowing Pulsing Radar Wave -->
                    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                        <div style="
                            position: absolute;
                            width: 100%;
                            height: 100%;
                            border-radius: 9999px;
                            background: ${markerColor};
                            opacity: 0.5;
                            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                        "></div>
                        
                        <!-- Core Guard Avatar Pin -->
                        <div style="
                            position: relative;
                            width: 32px;
                            height: 32px;
                            border-radius: 9999px;
                            background: #0f172a;
                            border: 3px solid ${isSelected ? '#facc15' : '#ffffff'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #ffffff;
                            font-weight: 800;
                            font-size: 13px;
                            box-shadow: 0 4px 14px rgba(0,0,0,0.8);
                        ">
                            ${guard.name.charAt(0)}
                            <span style="
                                position: absolute;
                                bottom: -2px;
                                right: -2px;
                                width: 11px;
                                height: 11px;
                                border-radius: 9999px;
                                background: ${guard.is_in_patrol ? '#38bdf8' : '#10b981'};
                                border: 2px solid #0f172a;
                            "></span>
                        </div>
                    </div>
                </div>
            `;

            const guardIcon = L.divIcon({
                className: 'custom-guard-marker',
                html: guardIconHtml,
                iconSize: [38, 38],
                iconAnchor: [19, 19],
            });

            let marker = guardMarkersRef.current.get(guard.id);

            if (marker) {
                marker.setLatLng([guard.latitude, guard.longitude]);
                marker.setIcon(guardIcon);
            } else {
                marker = L.marker([guard.latitude, guard.longitude], { icon: guardIcon }).addTo(map);
                marker.on('click', () => {
                    setSelectedGuard(guard);
                });
                guardMarkersRef.current.set(guard.id, marker);
            }

            // Bind tooltip and popup
            marker.bindTooltip(`<strong>${guard.name}</strong> • ${statusLabel}`, {
                direction: 'top',
                offset: [0, -22],
            });
        });

        // Remove markers of guards no longer present
        guardMarkersRef.current.forEach((marker, id) => {
            if (!currentMarkerIds.has(id)) {
                map.removeLayer(marker);
                guardMarkersRef.current.delete(id);
            }
        });
    }, [guards, selectedSiteId, selectedGuard]);

    // Fly map to selected guard or site
    const flyToGuard = (guard: ActiveGuard) => {
        setSelectedGuard(guard);
        if (mapInstanceRef.current && guard.latitude && guard.longitude) {
            mapInstanceRef.current.flyTo([guard.latitude, guard.longitude], 19, {
                animate: true,
                duration: 1.2,
            });
        }
    };

    const flyToSite = (siteId: number | 'all') => {
        setSelectedSiteId(siteId);
        if (!mapInstanceRef.current) return;

        if (siteId === 'all') {
            const allCoords: [number, number][] = [];
            sites.forEach((s) => {
                s.checkpoints.forEach((cp) => {
                    if (cp.latitude && cp.longitude) allCoords.push([cp.latitude, cp.longitude]);
                });
            });
            guards.forEach((g) => {
                if (g.latitude && g.longitude) allCoords.push([g.latitude, g.longitude]);
            });

            if (allCoords.length > 0) {
                const bounds = L.latLngBounds(allCoords);
                mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
            }
        } else {
            const site = sites.find((s) => s.id === siteId);
            if (site && site.latitude && site.longitude) {
                mapInstanceRef.current.flyTo([site.latitude, site.longitude], 18, {
                    animate: true,
                    duration: 1.2,
                });
            }
        }
    };

    const zoomIn = () => mapInstanceRef.current?.zoomIn();
    const zoomOut = () => mapInstanceRef.current?.zoomOut();

    const filteredGuards = selectedSiteId === 'all'
        ? guards
        : guards.filter((g) => g.site_id === selectedSiteId);

    const activeSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

    return (
        <div className="min-h-screen bg-[#070c18] p-4 lg:p-6 text-slate-100 space-y-6">
            <Head title="Peta Live & Real Maps Gedung - Patroli Security" />

            {/* Custom Leaflet Dark Popup Styles */}
            <style>{`
                .leaflet-popup-content-wrapper {
                    background: #0f172a !important;
                    border: 1px solid #334155 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.8) !important;
                    color: #f8fafc !important;
                }
                .leaflet-popup-tip {
                    background: #0f172a !important;
                    border: 1px solid #334155 !important;
                }
                .leaflet-container {
                    background: #070c18 !important;
                    font-family: inherit !important;
                }
            `}</style>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <Compass className="size-7 text-blue-500 animate-spin-slow" />
                        Peta Live Interaktif (Maps & Bangunan)
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Peta digital interaktif dengan visual gedung, jalan, citra satelit, serta radius geofencing 10 meter checkpoint real-time.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="flex items-center gap-2 rounded-xl bg-[#11192e] border border-slate-800 px-3.5 py-1.5 text-xs text-slate-300 font-medium">
                        <span className="relative flex size-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                        </span>
                        <span>Update: {lastUpdated} WIB</span>
                    </div>

                    <button
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh Live</span>
                    </button>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <UserCheck className="size-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">
                                {guards.length} Satpam
                            </div>
                            <div className="text-xs font-medium text-slate-400">Total Petugas Hadir (Live)</div>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                        Presensi Aktif
                    </span>
                </div>

                <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                            <ShieldCheck className="size-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">
                                {guards.filter((g) => g.is_in_patrol).length} Petugas
                            </div>
                            <div className="text-xs font-medium text-slate-400">Sedang Keliling Patroli</div>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/80 border border-blue-800 px-2.5 py-0.5 rounded-full">
                        In Progress
                    </span>
                </div>

                <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                            <Shield className="size-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">
                                {guards.filter((g) => !g.is_in_patrol).length} Petugas
                            </div>
                            <div className="text-xs font-medium text-slate-400">Standby di Pos Jaga</div>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2.5 py-0.5 rounded-full">
                        Siap Tugas
                    </span>
                </div>
            </div>

            {/* Filter Tabs by Site & Map Layer Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Site Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => flyToSite('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            selectedSiteId === 'all'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500'
                                : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
                        }`}
                    >
                        <Users className="size-3.5" />
                        <span>Semua Site ({guards.length} Satpam)</span>
                    </button>
                    {sites.map((site) => {
                        const countInSite = guards.filter((g) => g.site_id === site.id).length;
                        return (
                            <button
                                key={site.id}
                                onClick={() => flyToSite(site.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                    selectedSiteId === site.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500'
                                        : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
                                }`}
                            >
                                <MapPin className="size-3.5" />
                                <span>{site.name}</span>
                                <span className="bg-slate-900 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                    {countInSite} Hadir
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Map Layer Mode Switcher */}
                <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveLayer('google-hybrid')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeLayer === 'google-hybrid'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Tampilan Google Maps Satelit & Label Gedung / Jalan"
                    >
                        <span>🛰️ Google Hybrid</span>
                    </button>
                    <button
                        onClick={() => setActiveLayer('google-streets')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeLayer === 'google-streets'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Tampilan Standar Google Maps (Gedung & Jalan)"
                    >
                        <span>🗺️ Google Maps</span>
                    </button>
                    <button
                        onClick={() => setActiveLayer('dark')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeLayer === 'dark'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Tampilan Tactical Dark Mode"
                    >
                        <span>🌙 Tactical Dark</span>
                    </button>
                    <button
                        onClick={() => setActiveLayer('osm')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeLayer === 'osm'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Tampilan OpenStreetMap"
                    >
                        <span>🌐 OSM</span>
                    </button>
                </div>
            </div>

            {/* Main Interactive Map & Guard List Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Visual Real Interactive Map */}
                <div className="lg:col-span-8 rounded-2xl bg-[#0b1329] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col min-h-[580px]">
                    {/* Top Overlay Badge & Information */}
                    <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl shadow-lg">
                        <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                            <span className="font-bold text-white text-xs block">
                                {selectedSiteId === 'all' ? 'Monitoring Semua Site' : activeSite?.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {activeSite?.checkpoints?.length || 0} Checkpoints • Geofence Radius 10m Aktif
                            </span>
                        </div>
                    </div>

                    {/* Custom Map Floating Controls */}
                    <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5">
                        <button
                            onClick={zoomIn}
                            className="flex size-9 items-center justify-center rounded-xl bg-[#0f172a]/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 shadow-lg transition-colors cursor-pointer"
                            title="Zoom In"
                        >
                            <ZoomIn className="size-4" />
                        </button>
                        <button
                            onClick={zoomOut}
                            className="flex size-9 items-center justify-center rounded-xl bg-[#0f172a]/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 shadow-lg transition-colors cursor-pointer"
                            title="Zoom Out"
                        >
                            <ZoomOut className="size-4" />
                        </button>
                        <button
                            onClick={() => flyToSite('all')}
                            className="flex size-9 items-center justify-center rounded-xl bg-[#0f172a]/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 shadow-lg transition-colors cursor-pointer"
                            title="Pusatkan Semua Titik"
                        >
                            <Maximize2 className="size-4" />
                        </button>
                    </div>

                    {/* Leaflet Map DOM Container */}
                    <div ref={mapContainerRef} className="w-full h-[580px] z-0 rounded-2xl" />

                    {/* Legend Overlay Bar at bottom */}
                    <div className="p-3 bg-[#0f172a]/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full bg-emerald-500 border border-slate-900" />
                                <span>Petugas Hadir / Standby</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full bg-blue-500 border border-slate-900" />
                                <span>Petugas Sedang Patroli</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded bg-slate-800 border border-sky-400" />
                                <span>Titik Checkpoint (Radius 10m)</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
                            <ShieldCheck className="size-3.5 text-emerald-400" />
                            <span>Validasi Geofence Ketat &le; 10m</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Guard List, Inspector & Live Feed */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Selected Guard Detail Inspector */}
                    {selectedGuard ? (
                        <div className="rounded-2xl bg-[#0f172a]/95 border border-blue-500/80 p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2 text-white font-bold text-xs">
                                    <LocateFixed className="size-4 text-blue-400" />
                                    <span>Detail Posisi Satpam Terpilih</span>
                                </div>
                                <button
                                    onClick={() => setSelectedGuard(null)}
                                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-800 font-black text-blue-400 border border-slate-700 text-lg">
                                    {selectedGuard.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        {selectedGuard.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {selectedGuard.badge_number} • {selectedGuard.role}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs bg-[#141e33] p-3.5 rounded-xl border border-slate-800 font-mono">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Lokasi Site:</span>
                                    <strong className="text-white">{selectedGuard.site_name}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Status Operasi:</span>
                                    <span className="text-emerald-400 font-bold">{selectedGuard.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Jam Check-in:</span>
                                    <span className="text-white">{selectedGuard.check_in_at} WIB</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Titik Terakhir:</span>
                                    <span className="text-cyan-300 font-bold">{selectedGuard.last_checkpoint_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Scan Terakhir:</span>
                                    <span className="text-emerald-400 font-bold">{selectedGuard.last_scanned_at}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Jarak Radius:</span>
                                    <span className="text-yellow-300">{selectedGuard.last_distance_meters}m (Valid &le; 10m)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Koordinat GPS:</span>
                                    <span className="text-white">{selectedGuard.latitude.toFixed(6)}, {selectedGuard.longitude.toFixed(6)}</span>
                                </div>
                            </div>

                            {selectedGuard.last_selfie_url && (
                                <button
                                    onClick={() => setSelectedPhoto(selectedGuard.last_selfie_url || null)}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
                                >
                                    <Eye className="size-3.5" />
                                    <span>Lihat Foto Selfie & Watermark GPS</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-5 text-center text-xs text-slate-400 space-y-2">
                            <LocateFixed className="size-8 text-slate-600 mx-auto" />
                            <p>Klik salah satu marker petugas pada peta atau kartu di bawah untuk melacak posisi di peta.</p>
                        </div>
                    )}

                    {/* Active Guards List for Quick Map Focus */}
                    <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-white flex items-center gap-2">
                                <Users className="size-4 text-blue-400" />
                                Daftar Satpam Hadir ({filteredGuards.length})
                            </h2>
                            <span className="text-[10px] text-slate-400 font-mono">Klik untuk Zoom</span>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {filteredGuards.map((guard) => (
                                <div
                                    key={guard.id}
                                    onClick={() => flyToGuard(guard)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                        selectedGuard?.id === guard.id
                                            ? 'bg-blue-950/80 border-blue-400'
                                            : 'bg-[#141e33] border-slate-800 hover:border-slate-700 hover:bg-[#182542]'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-slate-800 font-bold text-blue-400 text-xs border border-slate-700">
                                            {guard.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white">{guard.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{guard.badge_number} • {guard.site_code}</div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            guard.is_in_patrol
                                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        }`}>
                                            {guard.is_in_patrol ? 'Patroli' : 'Hadir'}
                                        </span>
                                        <div className="text-[10px] font-mono text-cyan-400 mt-1">{guard.last_scanned_at}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Scan Activity Feed */}
                    <div className="rounded-2xl bg-[#0f172a]/95 border border-slate-800 p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-white flex items-center gap-2">
                                <Activity className="size-4 text-emerald-400" />
                                Log Scan Real-time
                            </h2>
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="rounded-xl bg-[#141e33] border border-slate-800/80 p-2.5 text-xs space-y-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white">{log.user_name}</span>
                                        <span className="font-mono text-[10px] text-emerald-400 font-bold">
                                            {log.scanned_at}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-300 flex items-center justify-between">
                                        <span className="truncate max-w-[150px]">{log.checkpoint_name}</span>
                                        <span className="font-mono text-[10px] text-cyan-400">Jarak: {log.distance_meters}m</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Preview Foto Selfie & Watermark */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    <div className="relative max-w-2xl w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131b2e]">
                            <span className="text-white font-semibold text-sm">
                                Foto Selfie Petugas (Watermark Terverifikasi)
                            </span>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-black">
                            <img src={selectedPhoto} alt="Selfie" className="max-h-[65vh] w-auto object-contain rounded-lg" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
