import React, { useState, useEffect } from 'react';
import { Search, Eye, UploadCloud, CheckCircle, AlertTriangle, AlertOctagon, ArrowRight, Edit, Trash2, Check, X, FileSpreadsheet, XCircle } from 'lucide-react';

export default function Cabezales({ token, handleLogout, puedeCargar, estructuraGeografica }) {
  const [cabezales, setCabezales] = useState([]);
  
  const [filtroReg, setFiltroReg] = useState(localStorage.getItem('mcm_cab_reg') || '');
  const [filtroCd, setFiltroCd] = useState(localStorage.getItem('mcm_cab_cd') || '');
  const [filtroTexto, setFiltroTexto] = useState('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alineacionActual, setAlineacionActual] = useState([]);
  const [cabezalSeleccionado, setCabezalSeleccionado] = useState(null);
  
  const [filtroCanal, setFiltroCanal] = useState('');

  // ESTADOS MODIFICADOS: Área de Staging
  const [modalCarga, setModalCarga] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [statusCarga, setStatusCarga] = useState({ loading: false, msg: '', type: '' });
  const [pasoCarga, setPasoCarga] = useState(1);
  const [previewData, setPreviewData] = useState([]);
  const [hayErrores, setHayErrores] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [editandoCanalId, setEditandoCanalId] = useState(null);
  const [editCanalForm, setEditCanalForm] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => { localStorage.setItem('mcm_cab_reg', filtroReg); }, [filtroReg]);
  useEffect(() => { localStorage.setItem('mcm_cab_cd', filtroCd); }, [filtroCd]);

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({
        id: estructuraGeografica[region].ciudades[nombre].id,
        nombre: nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const buscarCabezales = async () => {
    if (!filtroCd) {
      setCabezales([]);
      return;
    }

    try {
      let url = new URL(`${API_URL}/api/cabezales`);
      url.searchParams.append('ciudad', filtroCd); 

      const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (data.status === 'success') setCabezales(data.data);
    } catch (e) {
      console.error("Error cargando la lista de cabezales:", e);
    }
  };

  useEffect(() => {
    buscarCabezales();
  }, [filtroCd]);

  const cabezalesFiltrados = cabezales.filter(cab => {
    if (!filtroTexto) return true;
    const text = filtroTexto.toLowerCase();
    return (
        String(cab.id_equipo || '').toLowerCase().includes(text) ||
        String(cab.servicio || '').toLowerCase().includes(text)
    );
  });

  const verAlineacion = async (cabezal) => {
    setCabezalSeleccionado(cabezal);
    setEditandoCanalId(null);
    setFiltroCanal(''); 
    try {
      const res = await fetch(`${API_URL}/api/cabezales/${cabezal.id}/alineacion`, {
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
      const res = await fetch(`${API_URL}/api/cabezales/${cabezalId}/alineacion`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') setAlineacionActual(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const canalesFiltrados = alineacionActual.filter(al => {
    if (!filtroCanal) return true;
    return String(al.nombre_canal || '').toLowerCase().includes(filtroCanal.toLowerCase());
  });

  // LÓGICA REESCRITA: Motor de Carga Masiva (Preview & Commit)
  const procesarExcelCabezales = async (modo) => {
    if (!archivo) {
      setStatusCarga({ loading: false, msg: 'Debe seleccionar un archivo Excel para continuar.', type: 'error' });
      return;
    }

    setStatusCarga({ loading: true, msg: modo === 'preview' ? 'Analizando cabezales...' : 'Inyectando cabezales...', type: 'info' });
    const formData = new FormData();
    formData.append('file', archivo);

    try {
      const res = await fetch(`${API_URL}/api/cabezales/upload-excel?mode=${modo}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Error en el servidor");

      if (modo === 'preview') {
        setPreviewData(data.data || []);
        setHayErrores(data.has_errors);
        setPasoCarga(2);
        setStatusCarga({ loading: false, msg: '', type: '' });
      } else {
        setStatusCarga({ loading: false, msg: data.detail, type: 'success' });
        setPasoCarga(3);
        buscarCabezales();
      }
    } catch (e) {
      setStatusCarga({ loading: false, msg: e.message || 'Error de comunicación de red con el backend.', type: 'error' });
    }
  };

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
      const res = await fetch(`${API_URL}/api/cabezales/${id}`, {
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
      const res = await fetch(`${API_URL}/api/cabezales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) buscarCabezales();
    } catch (e) {
      console.error(e);
    }
  };

  const exportarAlineacionExcel = async (cabezal) => {
    try {
      const res = await fetch(`${API_URL}/api/cabezales/${cabezal.id}/exportar-excel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error en la descarga");
      
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Alineacion_${cabezal.id_equipo || 'Cabezal'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert("Fallo al exportar los canales a Excel. Asegúrate de tener el backend actualizado.");
    }
  };

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
      const res = await fetch(`${API_URL}/api/alineaciones/${id}`, {
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
      const res = await fetch(`${API_URL}/api/alineaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) refrescarAlineacionActual(cabezalSeleccionado.id);
    } catch (e) {
      console.error(e);
    }
  };

  const abrirEnVentanaNueva = (ip) => {
    const ancho = 1200;
    const alto = 800;
    const izquierda = (window.screen.width - ancho) / 2;
    const arriba = (window.screen.height - alto) / 2;
    
    window.open(
      `http://${ip}`, 
      '_blank', 
      `width=${ancho},height=${alto},top=${arriba},left=${izquierda},resizable=yes,scrollbars=yes,status=yes`
    );
  };

  return (
    <div className="p-0 flex flex-col h-full overflow-hidden bg-[#070b19]">
      <div className="p-6 pb-2 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          📡 Control Central de Cabezales
        </h1>
        {puedeCargar && (
          <button 
            onClick={() => { setArchivo(null); setModalCarga(true); setPasoCarga(1); setStatusCarga({ loading: false, msg: '', type: '' }); }}
            className=" hidden md:flex bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-white font-bold flex items-center gap-2 transition shadow-lg"
          >
            <UploadCloud className="w-5 h-5" /> Importación Única Excel
          </button>
        )}
      </div>

      <div className="bg-[#090f24] border-y border-slate-800/60 px-6 py-3 flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0 mb-4 shadow-md">
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium w-full lg:w-auto">
          <span className="px-3 py-1 rounded-md text-blue-500 border border-blue-600/60 shadow-sm uppercase tracking-wider font-bold">FILTROS</span>
          
          <select value={filtroReg} onChange={(e) => { setFiltroReg(e.target.value); setFiltroCd(''); }} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer min-w-[150px]">
            <option value="">-- REGIÓN --</option>
            {estructuraGeografica && Object.keys(estructuraGeografica).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          
          <span className="text-blue-600/80 text-[10px]">➔</span>
          
          <select value={filtroCd} onChange={(e) => setFiltroCd(e.target.value)} disabled={!filtroReg} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 disabled:opacity-50 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer min-w-[180px]">
            <option value="">-- SELECCIONAR CIUDAD --</option>
            {filtroReg && obtenerCiudadesOrdenadas(filtroReg).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-[400px] bg-[#050814] border border-slate-700 rounded-md px-3 py-1.5 focus-within:border-cyan-500 transition-colors">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input 
            type="text" 
            placeholder="Buscar por ID de Equipo o Servicio / Cliente..." 
            value={filtroTexto} 
            onChange={(e) => setFiltroTexto(e.target.value)} 
            disabled={!filtroCd}
            className="bg-transparent text-xs text-white focus:outline-none w-full disabled:opacity-50" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg custom-scrollbar mx-6 mb-6">
        <table className="min-w-max w-full text-left text-sm text-slate-300 whitespace-nowrap">
          <thead className="bg-[#0b132b] text-slate-400 sticky top-0 z-10 shadow">
            <tr>
              <th className="p-4 border-b border-slate-700">CIUDAD</th>
              <th className="p-4 border-b border-slate-700 text-cyan-400">ID EQUIPO</th>
              <th className="p-4 border-b border-slate-700">SERVICIO / CLIENTE</th>
              <th className="p-4 border-b border-slate-700 text-center">ALINEACIÓN</th>
              <th className="p-4 border-b border-slate-700">GESTION QAM</th>
              <th className="p-4 border-b border-slate-700">MARCA</th>
              <th className="p-4 border-b border-slate-700">MODELO</th>
              <th className="p-4 border-b border-slate-700">SERIE</th>
              {puedeCargar && <th className="p-4 border-b border-slate-700 text-center">ACCIONES</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-[#050814]">
            {cabezalesFiltrados.map(cab => (
              editandoId === cab.id ? (
                <tr key={cab.id} className="bg-slate-800/80">
                  <td className="p-2"><input type="text" className="w-full min-w-[120px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.ciudad || ''} onChange={e => setEditForm({...editForm, ciudad: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full min-w-[120px] bg-[#050814] border border-cyan-700 rounded px-2 py-1 text-cyan-300 text-xs font-bold" value={editForm.id_equipo || ''} onChange={e => setEditForm({...editForm, id_equipo: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full min-w-[150px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.servicio || ''} onChange={e => setEditForm({...editForm, servicio: e.target.value})} /></td>
                  <td className="p-2 text-center"><span className="text-slate-500 text-xs">Bloqueado</span></td>
                  <td className="p-2"><input type="text" className="w-full min-w-[120px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editForm.gestion_qam || ''} onChange={e => setEditForm({...editForm, gestion_qam: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full min-w-[120px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.marca || ''} onChange={e => setEditForm({...editForm, marca: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full min-w-[120px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.modelo || ''} onChange={e => setEditForm({...editForm, modelo: e.target.value})} /></td>
                  <td className="p-2"><input type="text" className="w-full min-w-[120px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editForm.serie || ''} onChange={e => setEditForm({...editForm, serie: e.target.value})} /></td>
                  <td className="p-2 text-center flex justify-center gap-3 mt-1">
                    <button onClick={() => guardarEdicion(cab.id)} className="text-emerald-400 hover:text-emerald-300 transition"><Check className="w-5 h-5"/></button>
                    <button onClick={cancelarEdicion} className="text-red-400 hover:text-red-300 transition"><X className="w-5 h-5"/></button>
                  </td>
                </tr>
              ) : (
                <tr key={cab.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-4 font-semibold text-white">{cab.ciudad}</td>
                  <td className="p-4 font-bold text-cyan-400 font-mono text-xs">{cab.id_equipo}</td>
                  <td className="p-4 text-slate-200">{cab.servicio}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => verAlineacion(cab)} className="bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-3 py-1 rounded flex items-center gap-2 mx-auto hover:bg-indigo-600 hover:text-white transition-colors">
                      <Eye className="w-4 h-4"/> Desplegar Canales
                    </button>
                  </td>
                  <td className="p-4">
                    {cab.gestion_qam ? (
                      <button onClick={() => abrirEnVentanaNueva(cab.gestion_qam)} className="text-cyan-400 hover:text-cyan-300 hover:underline font-mono bg-transparent border-0 p-0 cursor-pointer text-left focus:outline-none">
                        {cab.gestion_qam}
                      </button>
                    ) : '---'}
                  </td>
                  <td className="p-4">{cab.marca || '---'}</td>
                  <td className="p-4">{cab.modelo || '---'}</td>
                  <td className="p-4 font-mono text-xs">{cab.serie || '---'}</td>
                  {puedeCargar && (
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => exportarAlineacionExcel(cab)} className="text-emerald-400 hover:text-emerald-300 transition" title="Exportar Canales a Excel"><FileSpreadsheet className="w-4 h-4"/></button>
                        <button onClick={() => iniciarEdicion(cab)} className="text-blue-400 hover:text-blue-300 transition" title="Editar"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => eliminarCabezal(cab.id)} className="text-red-400 hover:text-red-300 transition" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            ))}
            {cabezalesFiltrados.length === 0 && (
              <tr>
                <td colSpan={puedeCargar ? "9" : "8"} className="p-8 text-center text-slate-500 italic">
                  {!filtroReg || !filtroCd 
                    ? "⚠️ Por favor, seleccione una Región y Ciudad para desplegar el inventario." 
                    : "Ningún cabezal coincide con los criterios de búsqueda o filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalCarga && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            
            {pasoCarga === 1 && (
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-2">Procesar Archivo de Cabezales</h2>
                    <p className="text-slate-400 text-xs mb-6">El archivo será pre-evaluado antes de impactar MT_DB.</p>
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-[#050814]/50 relative transition-colors hover:border-emerald-500/50">
                            <input type="file" accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => { if(e.target.files[0]) setArchivo(e.target.files[0]); }} />
                            <UploadCloud className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                            <span className="text-sm block text-slate-300 font-semibold">{archivo ? archivo.name : "Seleccione libro de Excel"}</span>
                        </div>
                        {statusCarga.msg && (
                            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${statusCarga.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-blue-900/30 text-blue-400 border border-blue-800'}`}>
                            <span className="text-xs">{statusCarga.msg}</span>
                            </div>
                        )}
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => setModalCarga(false)} className="px-4 py-2 rounded text-slate-400 hover:bg-slate-800 transition text-xs font-bold">Cancelar</button>
                            <button onClick={() => procesarExcelCabezales('preview')} disabled={statusCarga.loading || !archivo} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-bold text-xs flex items-center gap-2">
                                {statusCarga.loading ? 'Analizando...' : 'Analizar Excel'} <ArrowRight className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pasoCarga === 2 && (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className={`p-4 flex items-center justify-between shrink-0 ${hayErrores ? 'bg-red-950/40 border-b border-red-900/50' : 'bg-emerald-950/40 border-b border-emerald-900/50'}`}>
                        <div className="flex items-center gap-3">
                            {hayErrores ? <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" /> : <CheckCircle className="w-6 h-6 text-emerald-500" />}
                            <div>
                                <h2 className={`font-black text-lg uppercase tracking-wider ${hayErrores ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {hayErrores ? '⚠️ Errores en la validación' : '✅ Lote aprobado para inyección'}
                                </h2>
                                <p className="text-xs text-slate-400">{previewData.length} canales extraídos del archivo.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => {setPasoCarga(1); setArchivo(null); setPreviewData([]);}} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition">Descartar</button>
                            <button 
                                onClick={() => procesarExcelCabezales('commit')} 
                                disabled={hayErrores || statusCarga.loading} 
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {statusCarga.loading ? 'Procesando...' : 'Inyectar Cabezales'}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-[#0b132b] text-slate-400 sticky top-0 uppercase font-bold tracking-widest z-10 shadow-sm border-b border-slate-700">
                                <tr>
                                    <th className="p-3 w-10 text-center">ST</th>
                                    <th className="p-3">ID EQUIPO</th>
                                    <th className="p-3">CIUDAD</th>
                                    <th className="p-3">SERVICIO</th>
                                    <th className="p-3">CANAL</th>
                                    <th className="p-3">VEREDICTO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {previewData.map((fila, idx) => (
                                    <tr key={idx} className={!fila._valido ? 'bg-red-950/20' : 'hover:bg-slate-800/30'}>
                                        <td className="p-3 text-center">
                                            {!fila._valido ? <XCircle className="w-4 h-4 text-red-500 inline-block" /> : <CheckCircle className="w-4 h-4 text-emerald-500 inline-block" />}
                                        </td>
                                        <td className="p-3 text-indigo-300 font-bold">{fila.ID_EQUIPO || '-'}</td>
                                        <td className="p-3 text-white">{fila.CIUDAD || '-'}</td>
                                        <td className="p-3 font-mono text-cyan-200">{fila.SERVICIO || '-'}</td>
                                        <td className="p-3 text-slate-400">{fila.CANAL} - {fila.NOMBRE_CANAL}</td>
                                        <td className="p-3">
                                            {!fila._valido ? (
                                                <div className="flex flex-col gap-1 text-[10px] font-bold text-red-400">
                                                    {fila._errores.map((err, i) => <span key={i}>• {err}</span>)}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Listo</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {pasoCarga === 3 && (
                <div className="p-12 flex flex-col justify-center items-center text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">Alineación Exitosa</h2>
                    <p className="text-emerald-400 font-medium mb-8">
                        {statusCarga.msg}
                    </p>
                    <button onClick={() => {setModalCarga(false); setPasoCarga(1); setArchivo(null);}} className="bg-[#0b132b] border border-slate-700 hover:border-emerald-500 text-white px-6 py-3 rounded-lg font-bold transition shadow-lg">Regresar al Inventario</button>
                </div>
            )}
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b132b] border border-slate-700 rounded-xl max-w-7xl w-full flex flex-col max-h-[85vh] shadow-2xl">
            
            <div className="p-5 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#050814] rounded-t-xl shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Alineación de Canales</h2>
                <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                  <span className="bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800 font-mono font-bold">ID: {cabezalSeleccionado?.id_equipo}</span>
                  <span>Servicio: {cabezalSeleccionado?.servicio}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-[#0b132b] border border-slate-700 rounded-md px-3 py-1.5 focus-within:border-indigo-500 transition-colors w-full sm:w-[300px]">
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre de canal..." 
                    value={filtroCanal} 
                    onChange={(e) => setFiltroCanal(e.target.value)} 
                    className="bg-transparent text-xs text-white focus:outline-none w-full" 
                  />
                </div>
                <button onClick={() => setModalAbierto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-800 text-slate-400 rounded-full hover:bg-red-600 hover:text-white transition font-bold text-sm shrink-0">✕</button>
              </div>
            </div>

            <div className="p-0 overflow-auto flex-1 custom-scrollbar">
              <table className="min-w-max w-full text-left text-sm text-slate-300 whitespace-nowrap">
                <thead className="bg-[#0b132b] text-slate-400 sticky top-0 z-10 shadow">
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
                <tbody className="divide-y divide-slate-800 bg-[#050814]/30">
                  {canalesFiltrados.map((al, idx) => (
                    editandoCanalId === al.id ? (
                      <tr key={al.id || idx} className="bg-slate-800/90">
                        <td className="p-1"><input type="text" className="w-full min-w-[90px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editCanalForm.portadora || ''} onChange={e => setEditCanalForm({...editCanalForm, portadora: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full min-w-[90px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs" value={editCanalForm.formato || ''} onChange={e => setEditCanalForm({...editCanalForm, formato: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full min-w-[80px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono font-bold" value={editCanalForm.canal_num || ''} onChange={e => setEditCanalForm({...editCanalForm, canal_num: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full min-w-[150px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-cyan-200 text-xs" value={editCanalForm.nombre_canal || ''} onChange={e => setEditCanalForm({...editCanalForm, nombre_canal: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full min-w-[110px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.mcast_ip || ''} onChange={e => setEditCanalForm({...editCanalForm, mcast_ip: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full min-w-[110px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.source_ip || ''} onChange={e => setEditCanalForm({...editCanalForm, source_ip: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full min-w-[70px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.udp || ''} onChange={e => setEditCanalForm({...editCanalForm, udp: e.target.value})} /></td>
                        <td className="p-1"><input type="text" className="w-full min-w-[70px] bg-[#050814] border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono" value={editCanalForm.sid || ''} onChange={e => setEditCanalForm({...editCanalForm, sid: e.target.value})} /></td>
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
                  
                  {canalesFiltrados.length === 0 && alineacionActual.length > 0 && (
                    <tr>
                      <td colSpan={puedeCargar ? "9" : "8"} className="p-8 text-center text-slate-500 italic">
                        No se encontraron canales que coincidan con "{filtroCanal}".
                      </td>
                    </tr>
                  )}
                  {alineacionActual.length === 0 && (
                    <tr>
                      <td colSpan={puedeCargar ? "9" : "8"} className="p-8 text-center text-slate-500 italic">
                        No hay canales registrados en este cabezal.
                      </td>
                    </tr>
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