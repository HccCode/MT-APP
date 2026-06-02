import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Server, Activity, AlertTriangle } from 'lucide-react';

// Solución estándar al bug de los íconos de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícono personalizado oscuro para los Nodos (HUBs)
const hubIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

export default function MapaRed({ token, estructuraGeografica }) {
  const [regionSelec, setRegionSelec] = useState('');
  const [ciudadSelec, setCiudadSelec] = useState('');
  const [nodos, setNodos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // Coordenadas predeterminadas (ej. Mexicali) para iniciar el mapa
  const centerPos = [32.6245, -115.4522];

  useEffect(() => {
    const cargarTopologia = async () => {
      setCargando(true);
      try {
        let url = `${API_URL}/api/mapa/topologia`;
        if (ciudadSelec) url += `?ciudad=${encodeURIComponent(ciudadSelec)}`;
        
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        if (json.status === 'success') setNodos(json.data);
      } catch (e) {
        console.error("Error cargando mapa");
      } finally {
        setCargando(false);
      }
    };
    cargarTopologia();
  }, [ciudadSelec, token, API_URL]);

  const obtenerColorEstatus = (estatus) => {
    const est = String(estatus).toUpperCase();
    if (est.includes('ACTIVO')) return '#10B981'; // Verde (Óptimo)
    if (est.includes('SUSPENDIDO')) return '#EF4444'; // Rojo (Alerta)
    if (est.includes('TRONCAL')) return '#F59E0B'; // Ambar (Troncal)
    return '#64748B'; // Gris oscuro (Libres o desconocidos)
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).sort((a, b) => a.localeCompare(b));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b19] overflow-hidden">
      
      {/* ================= BARRA DE CONTROL ================= */}
      <div className="bg-[#090f24] border-b border-slate-800/60 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-10 relative shadow-lg">
        <div className="flex items-center gap-3">
            <span className="bg-indigo-600 px-3 py-1.5 rounded text-xs font-black text-white flex items-center gap-2">
                <MapPin className="w-4 h-4" /> GIS NOC
            </span>
            <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); }} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 outline-none">
                <option value="">-- RED GLOBAL --</option>
                {Object.keys(estructuraGeografica).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={ciudadSelec} onChange={(e) => setCiudadSelec(e.target.value)} disabled={!regionSelec} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 outline-none">
                <option value="">-- TODAS LAS CIUDADES --</option>
                {regionSelec && obtenerCiudadesOrdenadas(regionSelec).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>

        <div className="flex gap-4 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#10B981]"></span> Activo</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#EF4444]"></span> Suspendido</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#F59E0B]"></span> Troncal</div>
        </div>
      </div>

      {/* ================= CONTENEDOR DEL MAPA (LEAFLET) ================= */}
      <div className="flex-1 relative z-0">
        {cargando && (
            <div className="absolute inset-0 bg-[#070b19]/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <p className="text-white font-mono animate-pulse flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" /> Sincronizando topología satelital...
                </p>
            </div>
        )}
        
        <MapContainer center={centerPos} zoom={13} className="w-full h-full" zoomControl={false}>
          {/* TileLayer de CartoDB (Modo Nocturno / Dark Mode para NOC) */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {nodos.map((nodo, idx) => (
            nodo.tipo === 'HUB' ? (
              <Marker key={`hub-${idx}`} position={[nodo.lat, nodo.lng]} icon={hubIcon}>
                <Popup className="custom-popup">
                  <div className="p-1">
                    <div className="flex items-center gap-2 border-b pb-2 mb-2">
                        <Server className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-black text-slate-800 text-sm">NODO {nodo.nombre}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">ID: {nodo.id}</p>
                    <p className="text-xs text-slate-600 mt-1">{nodo.direccion}</p>
                  </div>
                </Popup>
              </Marker>
            ) : (
              <CircleMarker 
                key={`cpe-${idx}`} 
                center={[nodo.lat, nodo.lng]} 
                radius={6}
                pathOptions={{ 
                    color: obtenerColorEstatus(nodo.estatus), 
                    fillColor: obtenerColorEstatus(nodo.estatus), 
                    fillOpacity: 0.8,
                    weight: 2
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center gap-2 border-b pb-2 mb-2">
                        {String(nodo.estatus).toUpperCase().includes('SUSPENDIDO') ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Activity className="w-4 h-4 text-emerald-600" />}
                        <h3 className="font-black text-slate-800 text-sm truncate">{nodo.nombre}</h3>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                        <p><span className="font-bold">Estatus:</span> {nodo.estatus}</p>
                        <p><span className="font-bold">Hub Origen:</span> {nodo.hub_id}</p>
                        <p><span className="font-bold">Puerto:</span> <span className="font-mono">{nodo.puerto}</span></p>
                        <p><span className="font-bold">Ancho Banda:</span> {nodo.mbps} Mbps</p>
                        <p className="truncate mt-1 text-[10px] text-slate-400">{nodo.direccion}</p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );
}