import React, { useState, useEffect } from 'react';
import { Search, Eye, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Cabezales({ token, handleLogout, puedeCargar }) {
  const [cabezales, setCabezales] = useState([]);
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroId, setFiltroId] = useState('');
  
  // Estados para Modal de Alineación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alineacionActual, setAlineacionActual] = useState([]);
  const [cabezalSeleccionado, setCabezalSeleccionado] = useState(null);

  // Estados para Modal de Carga Excel
  const [modalCarga, setModalCarga] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [idCarga, setIdCarga] = useState('');
  const [servicioCarga, setServicioCarga] = useState('');
  const [ciudadCarga, setCiudadCarga] = useState('');
  const [statusCarga, setStatusCarga] = useState({ loading: false, msg: '', type: '' });

  const buscarCabezales = async () => {
    try {
      let url = new URL('https://mt-backend-2ox8.onrender.com/api/cabezales');
      if (filtroCiudad) url.searchParams.append('ciudad', filtroCiudad);
      if (filtroId) url.searchParams.append('id_equipo', filtroId);

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (data.status === 'success') setCabezales(data.data);
    } catch (e) {
      console.error("Error buscando cabezales:", e);
    }
  };

  const verAlineacion = async (cabezal) => {
    setCabezalSeleccionado(cabezal);
    try {
      const res = await fetch(`https://mt-backend-2ox8.onrender.com/api/cabezales/${cabezal.id}/alineacion`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setAlineacionActual(data.data);
        setModalAbierto(true);
      }
    } catch (e) { console.error("Error cargando alineación", e); }
  };

  const handleSubirExcel = async () => {
    if (!archivo || !idCarga || !servicioCarga) {
      setStatusCarga({ loading: false, msg: 'Completa todos los campos (ID, Servicio, Archivo)', type: 'error' });
      return;
    }

    setStatusCarga({ loading: true, msg: 'Cargando archivo...', type: 'info' });
    const formData = new FormData();
    formData.append('file', archivo);

    try {
      const url = `https://mt-backend-2ox8.onrender.com/api/cabezales/upload-excel?id_equipo=${encodeURIComponent(idCarga)}&servicio=${encodeURIComponent(servicioCarga)}&ciudad=${encodeURIComponent(ciudadCarga)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        setStatusCarga({ loading: false, msg: '¡Alineación cargada exitosamente!', type: 'success' });
        buscarCabezales(); // Refrescar tabla
        setTimeout(() => setModalCarga(false), 2000);
      } else {
        setStatusCarga({ loading: false, msg: data.detail || 'Error en la carga', type: 'error' });
      }
    } catch (e) {
      setStatusCarga({ loading: false, msg: 'Error de conexión', type: 'error' });
    }
  };

  useEffect(() => { buscarCabezales(); }, []);

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden bg-[#070b19]">
      {/* HEADER DE CABEZALES */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          📡 Inventario de Cabezales
        </h1>
        {puedeCargar && (
          <button 
            onClick={() => { setModalCarga(true); setStatusCarga({ loading: false, msg: '', type: '' }); }} 
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-bold flex items-center gap-2 transition"
          >
            <UploadCloud className="w-5 h-5" /> Cargar Excel
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="flex gap-4 mb-4 bg-[#0b132b] p-4 rounded-lg border border-slate-800">
        <input 
          type="text" placeholder="Buscar por ID Equipo..." 
          className="bg-[#050814] border border-slate-700 text-white rounded px-3 py-2 text-sm w-48"
          value={filtroId} onChange={(e) => setFiltroId(e.target.value)}
        />
        <input 
          type="text" placeholder="Buscar por Ciudad..." 
          className="bg-[#050814] border border-slate-700 text-white rounded px-3 py-2 text-sm w-48"
          value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}
        />
        <button onClick={buscarCabezales} className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded text-white font-bold flex items-center gap-2 transition">
          <Search className="w-4 h-4" /> Buscar
        </button>
      </div>

      {/* Tabla Principal */}
      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#0b132b] text-slate-400 sticky top-0 shadow">
            <tr>
              <th className="p-4 border-b border-slate-700">CIUDAD</th>
              <th className="p-4 border-b border-slate-700">ID</th>
              <th className="p-4 border-b border-slate-700">SERVICIO</th>
              <th className="p-4 border-b border-slate-700 text-center">ALINEACIÓN</th>
              <th className="p-4 border-b border-slate-700">GESTION QAM</th>
              <th className="p-4 border-b border-slate-700">MARCA</th>
              <th className="p-4 border-b border-slate-700">MODELO</th>
              <th className="p-4 border-b border-slate-700">SERIE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-[#050814]">
            {cabezales.map(cab => (
              <tr key={cab.id} className="hover:bg-slate-800/50 transition">
                <td className="p-4 font-semibold text-white">{cab.ciudad}</td>
                <td className="p-4 text-cyan-400">{cab.id_equipo}</td>
                <td className="p-4">{cab.servicio}</td>
                <td className="p-4 text-center">
                  <button onClick={() => verAlineacion(cab)} className="bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-3 py-1 rounded flex items-center gap-2 mx-auto hover:bg-indigo-600 hover:text-white transition-colors">
                    <Eye className="w-4 h-4"/> Ver Canales
                  </button>
                </td>
                <td className="p-4">{cab.gestion_qam}</td>
                <td className="p-4">{cab.marca}</td>
                <td className="p-4">{cab.modelo}</td>
                <td className="p-4 font-mono text-xs">{cab.serie}</td>
              </tr>
            ))}
            {cabezales.length === 0 && (
              <tr><td colSpan="8" className="p-8 text-center text-slate-500">No se encontraron cabezales. Intenta buscar o cargar un archivo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Carga de Excel para Cabezales */}
      {modalCarga && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Cargar Alineación de Cabezal</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">ID del Equipo *</label>
                <input type="text" className="w-full bg-[#050814] border border-slate-700 rounded p-2 text-white" 
                  value={idCarga} onChange={e => setIdCarga(e.target.value)} placeholder="Ej. CBZ-001" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Servicio *</label>
                <input type="text" className="w-full bg-[#050814] border border-slate-700 rounded p-2 text-white" 
                  value={servicioCarga} onChange={e => setServicioCarga(e.target.value)} placeholder="Ej. Video IPTV" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Ciudad (Opcional si ya existe)</label>
                <input type="text" className="w-full bg-[#050814] border border-slate-700 rounded p-2 text-white" 
                  value={ciudadCarga} onChange={e => setCiudadCarga(e.target.value)} placeholder="Ej. CDMX" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Archivo Excel (.xlsx) *</label>
                <input type="file" accept=".xlsx, .xls" className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600/20 file:text-emerald-400 hover:file:bg-emerald-600/30"
                  onChange={e => setArchivo(e.target.files[0])} />
              </div>

              {statusCarga.msg && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  statusCarga.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                  statusCarga.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
                  'bg-blue-900/30 text-blue-400 border border-blue-800'
                }`}>
                  {statusCarga.type === 'error' && <AlertTriangle className="w-4 h-4"/>}
                  {statusCarga.type === 'success' && <CheckCircle className="w-4 h-4"/>}
                  {statusCarga.msg}
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setModalCarga(false)} className="px-4 py-2 rounded text-slate-400 hover:bg-slate-800 transition">Cancelar</button>
                <button onClick={handleSubirExcel} disabled={statusCarga.loading} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-bold transition disabled:opacity-50 flex items-center gap-2">
                  {statusCarga.loading ? 'Cargando...' : 'Subir Archivo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alineación (Visualización) */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-6xl w-full flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-[#050814] rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" /> Alineación del Cabezal
                </h2>
                <p className="text-slate-400 text-sm mt-1">ID: <span className="text-cyan-400">{cabezalSeleccionado?.id_equipo}</span> | Ciudad: {cabezalSeleccionado?.ciudad}</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="w-8 h-8 flex items-center justify-center bg-red-900/30 text-red-400 rounded-full hover:bg-red-600 hover:text-white transition">
                ✕
              </button>
            </div>
            <div className="p-0 overflow-auto flex-1">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#0b132b] text-slate-400 sticky top-0 shadow">
                  <tr>
                    <th className="p-3 border-b border-slate-700">PORTADORA</th>
                    <th className="p-3 border-b border-slate-700">FORMATO</th>
                    <th className="p-3 border-b border-slate-700"># CANAL</th>
                    <th className="p-3 border-b border-slate-700">NOMBRE DE CANAL</th>
                    <th className="p-3 border-b border-slate-700">MCAST IP</th>
                    <th className="p-3 border-b border-slate-700">SOURCE IP</th>
                    <th className="p-3 border-b border-slate-700">UDP</th>
                    <th className="p-3 border-b border-slate-700">SID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {alineacionActual.map((al, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-mono text-xs">{al.portadora}</td>
                      <td className="p-3">{al.formato}</td>
                      <td className="p-3 font-bold text-white">{al.canal_num}</td>
                      <td className="p-3 text-cyan-200">{al.nombre_canal}</td>
                      <td className="p-3 font-mono text-xs text-indigo-300">{al.mcast_ip}</td>
                      <td className="p-3 font-mono text-xs">{al.source_ip}</td>
                      <td className="p-3">{al.udp}</td>
                      <td className="p-3">{al.sid}</td>
                    </tr>
                  ))}
                  {alineacionActual.length === 0 && (
                     <tr><td colSpan="8" className="p-8 text-center text-slate-500">No hay datos de alineación registrados para este cabezal.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}