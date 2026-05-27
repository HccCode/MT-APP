import React, { useState, useEffect } from 'react';
import { Search, Eye, UploadCloud, CheckCircle, AlertTriangle, Edit, Trash2, Check, X } from 'lucide-react';

export default function Cabezales({ token, handleLogout, puedeCargar }) {
  const [cabezales, setCabezales] = useState([]);
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroId, setFiltroId] = useState('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alineacionActual, setAlineacionActual] = useState([]);
  const [cabezalSeleccionado, setCabezalSeleccionado] = useState(null);

  const [modalCarga, setModalCarga] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [statusCarga, setStatusCarga] = useState({ loading: false, msg: '', type: '' });

  // ESTADOS PARA EDICIÓN EN LÍNEA
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

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
      console.error("Error cargando la lista de cabezales:", e);
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
    } catch (e) {
      console.error("Error leyendo mapa de alineación:", e);
    }
  };

  const handleSubirExcel = async () => {
    if (!archivo) {
      setStatusCarga({ loading: false, msg: 'Debe seleccionar un archivo Excel para continuar.', type: 'error' });
      return;
    }

    setStatusCarga({ loading: true, msg: 'Procesando archivo e interpretando cabezales...', type: 'info' });
    const formData = new FormData();
    formData.append('file', archivo);

    try {
      const res = await fetch('https://mt-backend-2ox8.onrender.com/api/cabezales/upload-excel', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        setStatusCarga({ loading: false, msg: data.detail, type: 'success' });
        buscarCabezales();
        setTimeout(() => setModalCarga(false), 2000);
      } else {
        setStatusCarga({ loading: false, msg: data.detail || 'Fallo al procesar el layout.', type: 'error' });
      }
    } catch (e) {
      setStatusCarga({ loading: false, msg: 'Error de comunicación de red con el backend.', type: 'error' });
    }
  };

  // FUNCIONES DE EDICIÓN Y ELIMINACIÓN
  const iniciarEdicion = (cabezal) => {
    setEditandoId(cabezal.id);
    setEditForm({ ...cabezal });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditForm({});
  };

  const guardarEdicion = async (id) => {
    try {
      const res = await fetch(`https://mt-backend-2ox8.onrender.com/api/cabezales/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ciudad: editForm.ciudad,
          id_equipo: editForm.id_equipo,
          servicio: editForm.servicio,
          gestion_qam: editForm.gestion_qam,
          marca: editForm.marca,
          modelo: editForm.modelo,
          serie: editForm.serie
        })
      });
      
      if (res.ok) {
        setEditandoId(null);
        buscarCabezales(); // Refrescar datos
      } else {
        alert("Error al actualizar el cabezal. Verifica tus permisos.");
      }
    } catch (e) {
      console.error(e);
      alert("Fallo de conexión al guardar.");
    }
  };

  const eliminarCabezal = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este cabezal? Se borrará también toda su alineación de canales de forma permanente.")) return;
    
    try {
      const res = await fetch(`https://mt-backend-2ox8.onrender.com/api/cabezales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        buscarCabezales();
      } else {
        alert("Error al eliminar el cabezal.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    buscarCabezales();
  }, []);

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden bg-[#070b19]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          📡 Control Central de Cabezales
        </h1>
        {puedeCargar && (
          <button 
            onClick={() => { setArchivo(null); setModalCarga(true); setStatusCarga({ loading: false, msg: '', type: '' }); }} 
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-bold flex items-center gap-2 transition"
          >
            <UploadCloud className="w-5 h-5" /> Importación Única Excel
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-4 bg-[#0b132b] p-4 rounded-lg border border-slate-800">
        <input 
          type="text" placeholder="Filtrar por ID de Equipo..." 
          className="bg-[#050814] border border-slate-700 text-white rounded px-3 py-2 text-sm w-48 focus:border-cyan-500 outline-none"
          value={filtroId} onChange={(e) => setFiltroId(e.target.value)}
        />
        <input 
          type="text" placeholder="Filtrar por Ciudad..." 
          className="bg-[#050814] border border-slate-700 text-white rounded px-3 py-2 text-sm w-48 focus:border-cyan-500 outline-none"
          value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}
        />
        <button onClick={buscarCabezales} className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded text-white font-bold flex items-center gap-2 transition">
          <Search className="w-4 h-4" /> Ejecutar Filtro
        </button>
      </div>

      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#0b132b] text-slate-400 sticky top-0 z-10 shadow">
            <tr>
              <th className="p-4 border-b border-slate-700">CIUDAD</th>
              <th className="p-4 border-b border-slate-700">ID</th>
              <th className="p-4 border-b border-slate-700">SERVICIO</th>
              <th className="p-4 border-b border-slate-700 text-center">ALINEACIÓN</th>
              <th className="p-4 border-b border-slate-700">GESTION QAM</th>
              <th className="p-4 border-b border-slate-700">MARCA</th>
              <th className="p-4 border-b border-slate-700">MODELO</th>
              <th className="p-4 border-b border-slate-700">SERIE</th>
              {puedeCargar && <th className="p-4 border-b border-slate-700 text-center">ACCIONES</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-[#050814]">
            {cabezales.map(cab => (
              editandoId === cab.id ? (
                /* FILA EN MODO EDICIÓN */
                <tr key={cab.id} className="bg-slate-800/80">
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.ciudad || ''} onChange={e => setEditForm({...editForm, ciudad: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-cyan-400 font-mono text-xs" value={editForm.id_equipo || ''} onChange={e => setEditForm({...editForm, id_equipo: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.servicio || ''} onChange={e => setEditForm({...editForm, servicio: e.target.value})} /></td>
                  <td className="p-2 text-center"><span className="text-slate-500 text-xs">Deshabilitado</span></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.gestion_qam || ''} onChange={e => setEditForm({...editForm, gestion_qam: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.marca || ''} onChange={e => setEditForm({...editForm, marca: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.modelo || ''} onChange={e => setEditForm({...editForm, modelo: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.serie || ''} onChange={e => setEditForm({...editForm, serie: e.target.value})} /></td>
                  <td className="p-2 text-center flex justify-center gap-3 mt-1">
                    <button onClick={() => guardarEdicion(cab.id)} className="text-emerald-400 hover:text-emerald-300 transition" title="Guardar"><Check className="w-5 h-5"/></button>
                    <button onClick={cancelarEdicion} className="text-red-400 hover:text-red-300 transition" title="Cancelar"><X className="w-5 h-5"/></button>
                  </td>
                </tr>
              ) : (
                /* FILA NORMAL (SOLO LECTURA) */
                <tr key={cab.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-4 font-semibold text-white">{cab.ciudad}</td>
                  <td className="p-4 text-cyan-400 font-mono">{cab.id_equipo}</td>
                  <td className="p-4">{cab.servicio}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => verAlineacion(cab)} className="bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-3 py-1 rounded flex items-center gap-2 mx-auto hover:bg-indigo-600 hover:text-white transition-colors">
                      <Eye className="w-4 h-4"/> Desplegar Canales
                    </button>
                  </td>
                  <td className="p-4">{cab.gestion_qam || '---'}</td>
                  <td className="p-4">{cab.marca || '---'}</td>
                  <td className="p-4">{cab.modelo || '---'}</td>
                  <td className="p-4 font-mono text-xs">{cab.serie || '---'}</td>
                  {puedeCargar && (
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => iniciarEdicion(cab)} className="text-blue-400 hover:text-blue-300 transition" title="Editar"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => eliminarCabezal(cab.id)} className="text-red-400 hover:text-red-300 transition" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            ))}
            {cabezales.length === 0 && (
              <tr><td colSpan={puedeCargar ? "9" : "8"} className="p-8 text-center text-slate-500">Ningún cabezal coincide con los criterios de búsqueda.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL IMPORTER MASIVO */}
      {modalCarga && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Procesar Archivo Maestro</h2>
            <p className="text-slate-400 text-xs mb-5 leading-relaxed">
              El sistema estructurará el inventario analizando las columnas <span className="text-white font-mono">CIUDAD</span>, <span className="text-white font-mono">ID</span> y <span className="text-white font-mono">SERVICIO</span> contenidas dentro de cada fila del documento.
            </p>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center bg-[#050814]/50 hover:border-slate-500 transition relative">
                <input 
                  type="file" accept=".xlsx, .xls" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e => { if(e.target.files[0]) setArchivo(e.target.files[0]); }} 
                />
                <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <span className="text-sm block text-slate-300 font-semibold">
                  {archivo ? archivo.name : "Seleccione o arrastre el libro de Excel"}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Formatos permitidos: .xlsx, .xls</span>
              </div>

              {statusCarga.msg && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  statusCarga.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                  statusCarga.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
                  'bg-blue-900/30 text-blue-400 border border-blue-800'
                }`}>
                  {statusCarga.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0"/>}
                  {statusCarga.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0"/>}
                  <span className="text-xs">{statusCarga.msg}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setModalCarga(false)} className="px-4 py-2 rounded text-slate-400 hover:bg-slate-800 transition text-xs font-semibold">Cancelar</button>
                <button onClick={handleSubirExcel} disabled={statusCarga.loading} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-bold transition disabled:opacity-50 text-xs flex items-center gap-2">
                  {statusCarga.loading ? 'Procesando Data...' : 'Ejecutar Carga'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPLORADOR DE ALINEACIÓN */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-6xl w-full flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-[#050814] rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Alineación de Canales
                </h2>
                <p className="text-slate-400 text-xs mt-1">ID Central: <span className="text-cyan-400 font-mono font-bold">{cabezalSeleccionado?.id_equipo}</span> | Servicio: <span className="text-slate-200 font-semibold">{cabezalSeleccionado?.servicio}</span> | Plaza: {cabezalSeleccionado?.ciudad}</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-800 text-slate-400 rounded-full hover:bg-red-600 hover:text-white transition font-bold text-sm">
                ✕
              </button>
            </div>
            <div className="p-0 overflow-auto flex-1">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#0b132b] text-slate-400 sticky top-0 shadow z-10">
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
                <tbody className="divide-y divide-slate-800 bg-[#050814]/30">
                  {alineacionActual.map((al, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-mono text-xs text-slate-400">{al.portadora || '---'}</td>
                      <td className="p-3 text-xs">{al.formato || '---'}</td>
                      <td className="p-3 font-bold text-white font-mono">{al.canal_num || '---'}</td>
                      <td className="p-3 text-cyan-200 font-semibold">{al.nombre_canal || '---'}</td>
                      <td className="p-3 font-mono text-xs text-indigo-300">{al.mcast_ip || '---'}</td>
                      <td className="p-3 font-mono text-xs text-slate-400">{al.source_ip || '---'}</td>
                      <td className="p-3 font-mono text-xs">{al.udp || '---'}</td>
                      <td className="p-3 font-mono text-xs text-amber-400">{al.sid || '---'}</td>
                    </tr>
                  ))}
                  {alineacionActual.length === 0 && (
                     <tr><td colSpan="8" className="p-8 text-center text-slate-500">No se registran mapas de portadoras activos para el nodo seleccionado.</td></tr>
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