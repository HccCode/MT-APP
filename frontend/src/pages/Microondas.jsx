import { useState, useEffect } from 'react';
import { Search, Radio, Wifi, Save, Plus, Trash2 } from 'lucide-react';

export default function Microondas({ token, puedeEditar, handleLogout }) {
  const [enlaces, setEnlaces] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enlaceDetalle, setEnlaceDetalle] = useState(null);
  const [editCampos, setEditCampos] = useState({});
  const [creandoNuevo, setCreandoNuevo] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const cargarEnlaces = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/microondas?q=${filtroTexto}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) {
        const data = await res.json();
        setEnlaces(data.data);
      }
    } catch (e) { console.error(e); } finally { setCargando(false); }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => cargarEnlaces(), 500);
    return () => clearTimeout(timeoutId);
  }, [filtroTexto, token]);

  const seleccionarEnlace = (e) => {
    setCreandoNuevo(false);
    setEnlaceDetalle(e);
    setEditCampos(e);
  };

  const prepararNuevo = () => {
    setEnlaceDetalle(null);
    setEditCampos({ estatus: 'ACTIVO', cliente: '', sitio_base: '' });
    setCreandoNuevo(true);
  };

  const guardarEnlace = async () => {
    try {
      const isUpdate = !creandoNuevo && enlaceDetalle?.id;
      const url = isUpdate ? `${API_URL}/api/microondas/${enlaceDetalle.id}` : `${API_URL}/api/microondas`;
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editCampos)
      });

      if (res.ok) {
        alert("Enlace guardado correctamente");
        setCreandoNuevo(false);
        cargarEnlaces();
      } else {
        alert("Error al guardar");
      }
    } catch (e) { console.error(e); }
  };

  const eliminarEnlace = async () => {
    if (!window.confirm("¿Seguro que deseas eliminar este enlace?")) return;
    try {
      await fetch(`${API_URL}/api/microondas/${enlaceDetalle.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setEnlaceDetalle(null);
      cargarEnlaces();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-6 p-6 overflow-hidden bg-[#070b19]">
      
      {/* Tabla de Enlaces */}
      <div className="xl:col-span-2 flex-1 flex flex-col bg-[#0b132b]/30 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-[#0b132b]/80 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 w-full max-w-md relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3" />
            <input type="text" placeholder="Buscar por cliente, IP o SSID..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="bg-[#050814] border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 w-full rounded pl-9 py-2" />
          </div>
          {puedeEditar && (
            <button onClick={prepararNuevo} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 cursor-pointer shadow-lg">
              <Plus className="w-4 h-4" /> Nuevo Enlace
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-xs text-slate-300 text-left whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-md">
              <tr>
                <th className="p-3">Estatus</th>
                <th className="p-3">Cliente / Servicio</th>
                <th className="p-3">Sitio Base</th>
                <th className="p-3">IP AP</th>
                <th className="p-3">IP Cliente</th>
                <th className="p-3">SSID</th>
                <th className="p-3">Señal (AP/ST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {enlaces.map((e) => (
                <tr key={e.id} onClick={() => seleccionarEnlace(e)} className={`group hover:bg-slate-800/60 cursor-pointer ${enlaceDetalle?.id === e.id ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''}`}>
                  <td className="p-3 font-black text-[10px]">{e.estatus === 'ACTIVO' ? <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">ACTIVO</span> : <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">{e.estatus}</span>}</td>
                  <td className="p-3 font-bold group-hover:text-blue-400">{e.cliente}</td>
                  <td className="p-3">{e.sitio_base}</td>
                  <td className="p-3 font-mono text-emerald-400/80">{e.ip_gestion_ap}</td>
                  <td className="p-3 font-mono text-emerald-400/80">{e.ip_gestion_st}</td>
                  <td className="p-3 font-mono text-slate-400">{e.ssid}</td>
                  <td className="p-3 font-mono text-amber-500/80">{e.senal_rx_ap || '-'} / {e.senal_rx_st || '-'} dBm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel de Edición Lateral */}
      <div className="w-full xl:w-1/3 bg-[#0b132b]/40 border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl">
        {(enlaceDetalle || creandoNuevo) ? (
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-xs font-black text-blue-400 tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2 shrink-0">
              <Radio className="w-4 h-4" /> {creandoNuevo ? 'NUEVO ENLACE UBIQUITI' : 'DETALLE DE RADIOENLACE'}
            </h3>
            
            <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4 custom-scrollbar text-[11px] text-slate-300">
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-slate-500 font-bold mb-1">CLIENTE / SERVICIO</label><input type="text" disabled={!puedeEditar} value={editCampos.cliente || ''} onChange={e=>setEditCampos({...editCampos, cliente: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none focus:border-blue-500" /></div>
                <div><label className="block text-slate-500 font-bold mb-1">ESTATUS</label>
                  <select disabled={!puedeEditar} value={editCampos.estatus || ''} onChange={e=>setEditCampos({...editCampos, estatus: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none">
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="SUSPENDIDO">SUSPENDIDO</option>
                    <option value="FALLA">FALLA / CAÍDO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-slate-500 font-bold mb-1">CIUDAD</label><input type="text" disabled={!puedeEditar} value={editCampos.ciudad || ''} onChange={e=>setEditCampos({...editCampos, ciudad: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                <div><label className="block text-slate-500 font-bold mb-1">SITIO BASE (NODO)</label><input type="text" disabled={!puedeEditar} value={editCampos.sitio_base || ''} onChange={e=>setEditCampos({...editCampos, sitio_base: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
              </div>

              {/* Parámetros de RF */}
              <div className="p-3 border border-slate-700/50 rounded-lg bg-slate-800/10 space-y-3">
                <h4 className="font-bold text-amber-500 uppercase flex items-center gap-1 border-b border-slate-800 pb-1"><Wifi className="w-3 h-3"/> Configuración RF</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-slate-500 font-bold mb-1">SSID</label><input type="text" disabled={!puedeEditar} value={editCampos.ssid || ''} onChange={e=>setEditCampos({...editCampos, ssid: e.target.value})} className="w-full bg-[#050814] font-mono p-2 rounded border border-slate-700 text-white outline-none" /></div>
                  <div><label className="block text-slate-500 font-bold mb-1">FRECUENCIA (MHz)</label><input type="text" disabled={!puedeEditar} value={editCampos.frecuencia || ''} onChange={e=>setEditCampos({...editCampos, frecuencia: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="Ej: 5800 DFS"/></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-slate-500 font-bold mb-1">CANAL (MHz)</label><input type="text" disabled={!puedeEditar} value={editCampos.ancho_canal || ''} onChange={e=>setEditCampos({...editCampos, ancho_canal: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="20/40/80"/></div>
                  <div><label className="block text-slate-500 font-bold mb-1">DIST. (km)</label><input type="text" disabled={!puedeEditar} value={editCampos.distancia_km || ''} onChange={e=>setEditCampos({...editCampos, distancia_km: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                  <div><label className="block text-slate-500 font-bold mb-1">CAPACIDAD</label><input type="text" disabled={!puedeEditar} value={editCampos.tx_rx_rate || ''} onChange={e=>setEditCampos({...editCampos, tx_rx_rate: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-amber-300 font-mono outline-none" placeholder="300/300 Mbps"/></div>
                </div>
              </div>

              {/* Lado Local (AP) */}
              <div className="p-3 border border-slate-700/50 rounded-lg bg-slate-800/10 space-y-3">
                <h4 className="font-bold text-blue-400 uppercase border-b border-slate-800 pb-1">Access Point (Local)</h4>
                <div><label className="block text-slate-500 font-bold mb-1">MODELO UBIQUITI</label><input type="text" disabled={!puedeEditar} value={editCampos.modelo_ap || ''} onChange={e=>setEditCampos({...editCampos, modelo_ap: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-slate-500 font-bold mb-1">IP GESTIÓN AP</label><input type="text" disabled={!puedeEditar} value={editCampos.ip_gestion_ap || ''} onChange={e=>setEditCampos({...editCampos, ip_gestion_ap: e.target.value})} className="w-full bg-[#050814] font-mono text-emerald-400 p-2 rounded border border-slate-700 outline-none" /></div>
                  <div><label className="block text-slate-500 font-bold mb-1">SEÑAL RX (dBm)</label><input type="text" disabled={!puedeEditar} value={editCampos.senal_rx_ap || ''} onChange={e=>setEditCampos({...editCampos, senal_rx_ap: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="-55" /></div>
                </div>
                <div><label className="block text-slate-500 font-bold mb-1">MAC ADDRESS AP</label><input type="text" disabled={!puedeEditar} value={editCampos.mac_ap || ''} onChange={e=>setEditCampos({...editCampos, mac_ap: e.target.value})} className="w-full bg-[#050814] font-mono p-2 rounded border border-slate-700 text-slate-400 outline-none" /></div>
              </div>

              {/* Lado Remoto (Station) */}
              <div className="p-3 border border-slate-700/50 rounded-lg bg-slate-800/10 space-y-3">
                <h4 className="font-bold text-purple-400 uppercase border-b border-slate-800 pb-1">Station / CPE (Remoto)</h4>
                <div><label className="block text-slate-500 font-bold mb-1">MODELO UBIQUITI</label><input type="text" disabled={!puedeEditar} value={editCampos.modelo_st || ''} onChange={e=>setEditCampos({...editCampos, modelo_st: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-slate-500 font-bold mb-1">IP GESTIÓN ST</label><input type="text" disabled={!puedeEditar} value={editCampos.ip_gestion_st || ''} onChange={e=>setEditCampos({...editCampos, ip_gestion_st: e.target.value})} className="w-full bg-[#050814] font-mono text-emerald-400 p-2 rounded border border-slate-700 outline-none" /></div>
                  <div><label className="block text-slate-500 font-bold mb-1">SEÑAL RX (dBm)</label><input type="text" disabled={!puedeEditar} value={editCampos.senal_rx_st || ''} onChange={e=>setEditCampos({...editCampos, senal_rx_st: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="-56" /></div>
                </div>
                <div><label className="block text-slate-500 font-bold mb-1">MAC ADDRESS ST</label><input type="text" disabled={!puedeEditar} value={editCampos.mac_st || ''} onChange={e=>setEditCampos({...editCampos, mac_st: e.target.value})} className="w-full bg-[#050814] font-mono p-2 rounded border border-slate-700 text-slate-400 outline-none" /></div>
              </div>

              <div><label className="block text-slate-500 font-bold mb-1">COMENTARIOS</label><textarea rows="2" disabled={!puedeEditar} value={editCampos.comentarios || ''} onChange={e=>setEditCampos({...editCampos, comentarios: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white resize-none outline-none" /></div>

            </div>

            {puedeEditar && (
              <div className="flex gap-2 mt-4 shrink-0">
                <button onClick={guardarEnlace} className="flex-1 bg-[#00a86b] hover:bg-[#008f5d] text-white text-[11px] font-black py-3 rounded-lg cursor-pointer flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> GUARDAR ENLACE
                </button>
                {!creandoNuevo && (
                  <button onClick={eliminarEnlace} className="p-3 bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg cursor-pointer border border-red-800 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center p-4 text-slate-600">
            <Radio className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Selecciona un enlace del listado o crea uno nuevo para ver sus propiedades RF.</p>
          </div>
        )}
      </div>
    </div>
  );
}