import React, { useState, useEffect } from 'react';
import { Search, Eye, UploadCloud, CheckCircle, AlertTriangle, Edit, Trash2, Check, X } from 'lucide-react';

export default function Cabezales({ token, handleLogout, puedeCargar }) {
  const [cabezales, setCabezales] = useState([]);
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroId, setFiltroId] = useState('');
  
  // MODAL ALINEACIÓN
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alineacionActual, setAlineacionActual] = useState([]);
  const [cabezalSeleccionado, setCabezalSeleccionado] = useState(null);

  // MODAL CARGA EXCEL
  const [modalCarga, setModalCarga] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [statusCarga, setStatusCarga] = useState({ loading: false, msg: '', type: '' });

  // EDICIÓN EN LÍNEA DE EQUIPOS (TABLA PRINCIPAL)
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // EDICIÓN EN LÍNEA DE CANALES (DENTRO DEL MODAL)
  const [editandoCanalId, setEditandoCanalId] = useState(null);
  const [editCanalForm, setEditCanalForm] = useState({});

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
    setEditandoCanalId(null);
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

  const refrescarAlineacionActual = async (cabezalId) => {
    try {
      const res = await fetch(`https://mt-backend-2ox8.onrender.com/api/cabezales/${cabezalId}/alineacion`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') setAlineacionActual(data.data);
    } catch (e) {
      console.error(e);
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

  // CONTROL EN LÍNEA: TABLA DE EQUIPOS
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
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditandoId(null);
        buscarCabezales();
      } else {
        alert("Error al actualizar el cabezal.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const eliminarCabezal = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este cabezal? Se perderá toda su alineación vinculada.")) return;
    try {
      const res = await fetch(`https://mt-backend-2ox8.onrender.com/api/cabezales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) buscarCabezales();
    } catch (e) {
      console.error(e);
    }
  };

  // CONTROL EN LÍNEA: TABLA DE CANALES (MODAL)
  const iniciarEdicionCanal = (canal) => {
    setEditandoCanalId(canal.id);
    setEditCanalForm({ ...canal });
  };

  const cancelarEdicionCanal = () => {
    setEditandoCanalId(null);
    setEditCanalForm({});
  };

  const guardarEdicionCanal = async (id) => {
    try {
      const res = await fetch(`https://mt-backend-2ox8.onrender.com/api/alineaciones/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          portadora: editCanalForm.portadora,
          formato: editCanalForm.formato,
          canal_num: editCanalForm.canal_num,
          nombre_canal: editCanalForm.nombre_canal,
          mcast_ip: editCanalForm.mcast_ip,
          source_ip: editCanalForm.source_ip,
          udp: editCanalForm.udp,
          sid: editCanalForm.sid
        })
      });
      if (res.ok) {
        setEditandoCanalId(null);
        refrescarAlineacionActual(cabezalSeleccionado.id);
      } else {
        alert("Error al actualizar renglón de canal.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const eliminarCanal = async (id) => {
    if (!window.confirm("¿Deseas remover este canal de la alineación?")) return;
    try {
      const res = await fetch(`https://mt-backend-2ox8.onrender.com/api/alineaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) refrescarAlineacionActual(cabezalSeleccionado.id);
    } catch (e) {
      console.error(e);
    }
  };

  // FUNCIÓN AUXILIAR PARA FORZAR VENTANA INDEPENDIENTE POPUP
  const abrirEnVentanaNueva = (ip) => {
    const ancho = 1200;
    const alto = 800;
    // Centrar la ventana nueva en la pantalla del operador
    const izquierda = (window.screen.width - ancho) / 2;
    const arriba = (window.screen.height - alto) / 2;
    
    window.open(
      `http://${ip}`, 
      '_blank', 
      `width=${ancho},height=${alto},top=${arriba},left=${izquierda},resizable=yes,scrollbars=yes,status=yes`
    );
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
                <tr key={cab.id} className="bg-slate-800/80">
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.ciudad || ''} onChange={e => setEditForm({...editForm, ciudad: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-cyan-400 font-mono text-xs" value={editForm.id_equipo || ''} onChange={e => setEditForm({...editForm, id_equipo: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.servicio || ''} onChange={e => setEditForm({...editForm, servicio: e.target.value})} /></td>
                  <td className="p-2 text-center"><span className="text-slate-500 text-xs">Bloqueado</span></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editForm.gestion_qam || ''} onChange={e => setEditForm({...editForm, gestion_qam: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.marca || ''} onChange={e => setEditForm({...editForm, marca: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.modelo || ''} onChange={e => setEditForm({...editForm, modelo: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.serie || ''} onChange={e => setEditForm({...editForm, serie: e.target.value})} /></td>
                  <td className="p-2 text-center flex justify-center gap-3 mt-1">
                    <button onClick={() => guardarEdicion(cab.id)} className="text-emerald-400 hover:text-emerald-300 transition"><Check className="w-5 h-5"/></button>
                    <button onClick={cancelarEdicion} className="text-red-400 hover:text-red-300 transition"><X className="w-5 h-5"/></button>
                  </td>
                </tr>
              ) : (
                <tr key={cab.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-4 font-semibold text-white">{cab.ciudad}</td>
                  <td className="p-4 text-cyan-400 font-mono">{cab.id_equipo}</td>
                  <td className="p-4">{cab.servicio}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => verAlineacion(cab)} className="bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-3 py-1 rounded flex items-center gap-2 mx-auto hover:bg-indigo-600 hover:text-white transition-colors">
                      <Eye className="w-4 h-4"/> Desplegar Canales
                    </button>
                  </td>
                  {/* COLUMNA GESTION QAM ACTUALIZADA A ACCIÓN DE ACCESO EN VENTANA NUEVA */}
                  <td className="p-4">
                    {cab.gestion_qam ? (
                      <button 
                        onClick={() => abrirEnVentanaNueva(cab.gestion_qam)}
                        className="text-cyan-400 hover:text-cyan-300 hover:underline font-mono bg-transparent border-0 p-0 cursor-pointer text-left focus:outline-none"
                      >
                        {cab.gestion_qam}
                      </button>
                    ) : (
                      '---'
                    )}
                  </td>
                  <td className="p-4">{cab.marca || '---'}</td>
                  <td className="p-4">{cab.modelo || '---'}</td>
                  <td className="p-4 font-mono text-xs">{cab.serie || '---'}</td>
                  {puedeCargar && (
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => iniciarEdicion(cab)} className="text-blue-400 hover:text-blue-300 transition"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => eliminarCabezal(cab.id)} className="text-red-400 hover:text-red-300 transition"><Trash2 className="w-4 h-4"/></button>
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

      {/* MODAL MAESTRO EXCEL */}
      {modalCarga && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-2">Procesar Archivo Maestro</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center bg-[#050814]/50 relative">
                <input type="file" accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => { if(e.target.files[0]) setArchivo(e.target.files[0]); }} />
                <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <span className="text-sm block text-slate-300 font-semibold">{archivo ? archivo.name : "Seleccione libro de Excel"}</span>
              </div>
              {statusCarga.msg && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${statusCarga.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'}`}>
                  <span className="text-xs">{statusCarga.msg}</span>
                </div>
              )}
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setModalCarga(false)} className="px-4 py-2 rounded text-slate-400 hover:bg-slate-800 transition text-xs">Cancelar</button>
                <button onClick={handleSubirExcel} disabled={statusCarga.loading} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-bold text-xs">{statusCarga.loading ? 'Procesando...' : 'Ejecutar Carga'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALINEACIÓN */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-7xl w-full flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-[#050814] rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white">Alineación de Canales</h2>
                <p className="text-slate-400 text-xs mt-1">ID: <span className="text-cyan-400 font-mono font-bold">{cabezalSeleccionado?.id_equipo}</span> | Servicio: {cabezalSeleccionado?.servicio}</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-800 text-slate-400 rounded-full hover:bg-red-600 hover:text-white transition font-bold text-sm">✕</button>
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
                    {puedeCargar && <th className="p-3 border-b border-slate-700 text-center">ACCIONES</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {alineacionActual.map((al, idx) => (
                    editandoCanalId === al.id ? (
                      <tr key={al.id || idx} className="bg-slate-800/90">
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editCanalForm.portadora || ''} onChange={e => setEditCanalForm({...editCanalForm, portadora: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editCanalForm.formato || ''} onChange={e => setEditCanalForm({...editCanalForm, formato: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono font-bold" value={editCanalForm.canal_num || ''} onChange={e => setEditCanalForm({...editCanalForm, canal_num: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-cyan-200 text-xs" value={editCanalForm.nombre_canal || ''} onChange={e => setEditCanalForm({...editCanalForm, nombre_canal: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.mcast_ip || ''} onChange={e => setEditCanalForm({...editCanalForm, mcast_ip: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.source_ip || ''} onChange={e => setEditCanalForm({...editCanalForm, source_ip: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.udp || ''} onChange={e => setEditCanalForm({...editCanalForm, udp: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.sid || ''} onChange={e => setEditCanalForm({...editCanalForm, sid: e.target.value})} /></td>
                        <td className="p-1 text-center flex justify-center gap-2 mt-2">
                          <button onClick={() => guardarEdicionCanal(al.id)} className="text-emerald-400 hover:text-emerald-300 transition" title="Guardar"><Check className="w-4 h-4"/></button>
                          <button onClick={cancelarEdicionCanal} className="text-red-400 hover:text-red-300 transition" title="Cancelar"><X className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={al.id || idx} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-mono text-xs text-slate-400">{al.portadora || '---'}</td>
                        <td className="p-3 text-xs">{al.formato || '---'}</td>
                        <td className="p-3 font-bold text-white font-mono">{al.canal_num || '---'}</td>
                        <td className="p-3 text-cyan-200 font-semibold">{al.nombre_canal || '---'}</td>
                        <td className="p-3 font-mono text-xs text-indigo-300">{al.mcast_ip || '---'}</td>
                        <td className="p-3 font-mono text-xs text-slate-400">{al.source_ip || '---'}</td>
                        <td className="p-3 font-mono text-xs">{al.udp || '---'}</td>
                        <td className="p-3 font-mono text-xs text-amber-400">{al.sid || '---'}</td>
                        {puedeCargar && (
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-3">
                              <button onClick={() => iniciarEdicionCanal(al)} className="text-blue-400 hover:text-blue-300 transition" title="Editar Canal"><Edit className="w-3.5 h-3.5"/></button>
                              <button onClick={() => eliminarCanal(al.id)} className="text-red-400 hover:text-red-300 transition" title="Eliminar Canal"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}