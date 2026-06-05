import { useState, useEffect } from 'react';
import { Search, MapPin, Eye, AlertTriangle, Server, Download, CheckSquare, ShieldCheck } from 'lucide-react';
import { generarUrlGoogleMaps, formatFechaParaInput } from '../utils/helpers';
import ModalFalla from '../components/modals/ModalFalla';
import ModalVisualizar from '../components/modals/ModalVisualizar';
import ModalEdicionMasiva from '../components/modals/ModalEdicionMasiva';
import ModalAuditoria from '../components/modals/ModalAuditoria';

export default function Inventario({ token, usuario, puedeEditar, esRnoc, esMcmNoc, esAdmin, estructuraGeografica, handleLogout }) {
  const [inventarioReg, setInventarioReg] = useState(localStorage.getItem('mcm_inv_reg') || '');
  const [inventarioCd, setInventarioCd] = useState(localStorage.getItem('mcm_inv_cd') || '');
  const [inventarioHub, setInventarioHub] = useState(localStorage.getItem('mcm_inv_hub') || 'TODOS');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const limpiarNombreSitio = (nombreRaw) => {
    if (!nombreRaw) return '';
    return String(nombreRaw)
      .replace(/^[0-9]+_/, '')
      .replace(/_[0-9]+(:[0-9]+)?$/, '')
      .replace(/_/g, ' ')
      .trim();
  };

  useEffect(() => { localStorage.setItem('mcm_inv_reg', inventarioReg); }, [inventarioReg]);
  useEffect(() => { localStorage.setItem('mcm_inv_cd', inventarioCd); }, [inventarioCd]);
  useEffect(() => { localStorage.setItem('mcm_inv_hub', inventarioHub); }, [inventarioHub]);

  const [datosHub, setDatosHub] = useState(null);
  const [puertoDetalle, setPuertoDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorApp, setErrorApp] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');
  const [filtroEquipo, setFiltroEquipo] = useState('TODOS');
  
  const [guardando, setGuardando] = useState(false);
  const [editCampos, setEditCampos] = useState({});
  const [puertosSeleccionados, setPuertosSeleccionados] = useState([]);

  // Modales
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);
  const [mostrarModalFalla, setMostrarModalFalla] = useState(false);
  const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);
  const [mostrarModalAuditoria, setMostrarModalAuditoria] = useState(false);

  const cargarDatosSistemas = async () => {
    if (!inventarioCd) {
      setDatosHub(null);
      setPuertoDetalle(null);
      setPuertosSeleccionados([]);
      return;
    }
    setCargando(true);
    setErrorApp(null);
    setPuertoDetalle(null);
    setPuertosSeleccionados([]);
    
    try {
      let url = new URL(`${API_URL}/api/hubs`);
      if (inventarioHub !== 'TODOS') {
        url.searchParams.append('id_hub', inventarioHub);
      } else {
        url.searchParams.append('ciudad', inventarioCd);
      }

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Error obteniendo datos del servidor.");
      const data = await res.json();
      
      let todosPuertos = [];
      if (inventarioHub === 'TODOS') {
        data.forEach(h => {
          if (h.puertos) {
            const puertosConHub = h.puertos.map(p => ({ ...p, HUB_PERTENENCIA: h.hub_nombre }));
            todosPuertos = [...todosPuertos, ...puertosConHub];
          }
        });
        
        let resumenGlobal = { activos: 0, suspendidos: 0, disponibles: 0, total: todosPuertos.length };
        resumenGlobal.activos = todosPuertos.filter(p => String(p.ESTATUS || '').toUpperCase().trim() === 'ACTIVO').length;
        resumenGlobal.suspendidos = todosPuertos.filter(p => String(p.ESTATUS || '').toUpperCase().trim() === 'SUSPENDIDO').length;
        resumenGlobal.disponibles = todosPuertos.filter(p => String(p.ESTATUS || '').toUpperCase().includes('DISPONIBLE')).length;
        
        setDatosHub({ 
          hub_nombre: `TODA LA CIUDAD: ${inventarioCd}`, 
          resumen: resumenGlobal, 
          puertos: todosPuertos 
        });
      } else {
        data.resumen.disponibles = data.puertos.filter(p => String(p.ESTATUS || '').toUpperCase().includes('DISPONIBLE')).length;
        setDatosHub(data);
      }
    } catch (e) {
      setErrorApp(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatosSistemas(); }, [inventarioCd, inventarioHub]);

  const handleExportarExcel = async () => {
    if (!inventarioCd) return alert("Seleccione una ciudad primero");
    setCargando(true);
    try {
      let url = new URL(`${API_URL}/api/hubs/exportar-excel`);
      if (inventarioHub !== 'TODOS') url.searchParams.append('id_hub', inventarioHub);
      else url.searchParams.append('ciudad', inventarioCd);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { handleLogout(); return; }
      if (!res.ok) throw new Error("Error en la descarga");
      
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const nombreArchivo = inventarioHub !== 'TODOS' ? `Inventario_${inventarioHub}` : `Inventario_${inventarioCd}`;
      a.download = `${nombreArchivo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert("Error exportando a Excel: " + e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarCambios = async () => {
    if (!puertoDetalle) return;
    setGuardando(true);
    try {
      const payload = { ...editCampos };
      
      // Reglas de negocio para estatus
      if (!payload.ESTATUS || payload.ESTATUS.trim() === '') {
        const hasService = payload.SERVICIO && payload.SERVICIO.trim() !== '';
        payload.ESTATUS = hasService ? 'ACTIVO' : 'DISPONIBLE GI';
      } else {
        payload.ESTATUS = payload.ESTATUS.toUpperCase().trim();
      }

      const res = await fetch(`${API_URL}/api/ports/${puertoDetalle.ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.status === 401) { handleLogout(); return; }
      if (!res.ok) throw new Error("Fallo al actualizar el puerto.");
      
      await cargarDatosSistemas();
    } catch (e) {
      alert(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const obtenerCiudadesOrdenadas = (region) => {
    const rData = (estructuraGeografica || {})[region];
    if (!rData || !rData.ciudades) return [];
    return Object.keys(rData.ciudades).sort((a, b) => a.localeCompare(b));
  };

  const seleccionarPuerto = (p) => { setPuertoDetalle(p); setEditCampos(p); };

  const uniqueEquipos = datosHub?.puertos 
    ? Array.from(new Set(datosHub.puertos.map(p => p.EQUIPO_HOTEL_ID || 'Sin Asignar'))).sort() 
    : [];

  const puertosFiltrados = datosHub?.puertos?.filter(p => {
    let matchTexto = true;
    if (filtroTexto) {
      const text = filtroTexto.toLowerCase();
      matchTexto = 
        String(p.SERVICIO || '').toLowerCase().includes(text) ||
        String(p.PUERTO || '').toLowerCase().includes(text) ||
        String(p.IP_GESTION || '').toLowerCase().includes(text) ||
        String(p.IP_CLIENTE || '').toLowerCase().includes(text) ||
        String(p.VLAN || '').toLowerCase().includes(text) ||
        String(p.UBICACION || '').toLowerCase().includes(text) ||
        String(p.ESTATUS || '').toLowerCase().includes(text) ||
        String(p.EQUIPO_HOTEL_ID || '').toLowerCase().includes(text);
    }
    
    let matchEstatus = true;
    if (filtroEstatus !== 'TODOS') {
      const est = String(p.ESTATUS || '').toUpperCase().trim();
      if (filtroEstatus === 'DISPONIBLE') {
        matchEstatus = est.includes('DISPONIBLE');
      } else {
        matchEstatus = est === filtroEstatus;
      }
    }

    let matchEquipo = true;
    if (filtroEquipo !== 'TODOS') {
      const equipoP = p.EQUIPO_HOTEL_ID || 'Sin Asignar';
      matchEquipo = equipoP === filtroEquipo;
    }

    return matchTexto && matchEstatus && matchEquipo;
  }) || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070b19]">
      {/* CABECERA Y FILTROS */}
      <div className="bg-[#090f24] border-b border-slate-800/60 p-4 shrink-0 flex flex-col gap-4">
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 custom-scrollbar">
            <span className="px-3 py-1.5 rounded-md text-blue-500 border border-blue-600/60 shadow-sm uppercase tracking-wider font-bold text-xs shrink-0 bg-[#050814]">
              GEOGRAFÍA
            </span>
            <select value={inventarioReg} onChange={(e) => { setInventarioReg(e.target.value); setInventarioCd(''); setInventarioHub('TODOS'); }} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer text-sm shrink-0 min-w-[140px]">
              <option value="">-- REGIÓN --</option>
              {Object.keys(estructuraGeografica || {}).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="text-blue-600/80 text-[10px] shrink-0">➔</span>
            <select value={inventarioCd} onChange={(e) => { setInventarioCd(e.target.value); setInventarioHub('TODOS'); }} disabled={!inventarioReg} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-50 text-sm shrink-0 min-w-[160px]">
              <option value="">-- CIUDAD --</option>
              {inventarioReg && obtenerCiudadesOrdenadas(inventarioReg).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-blue-600/80 text-[10px] shrink-0">➔</span>
            <select value={inventarioHub} onChange={(e) => setInventarioHub(e.target.value)} disabled={!inventarioCd} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-blue-300 font-bold focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-50 text-sm shrink-0 min-w-[200px]">
              <option value="TODOS">TODOS LOS NODOS</option>
              {inventarioReg && inventarioCd && ((estructuraGeografica || {})[inventarioReg]?.ciudades[inventarioCd]?.hubs || []).map(h => (
                <option key={h.id} value={h.id}>{limpiarNombreSitio(h.nombre)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
             <div className="flex items-center gap-2 bg-[#050814] border border-slate-700 rounded-md px-3 py-1.5 focus-within:border-blue-500 transition-colors flex-1 xl:w-[350px]">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input 
                type="text" 
                placeholder="Buscar cliente, IP, VLAN o puerto..." 
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none w-full placeholder:text-slate-600" 
              />
            </div>
          </div>
        </div>

        {/* BARRA SECUNDARIA DE FILTROS TÁCTICOS */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#050814]/50 p-2 rounded-lg border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estatus:</span>
              <select value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)} className="bg-[#1c2541] border border-slate-700 text-xs text-white px-2 py-1 rounded outline-none focus:border-blue-500 transition-colors cursor-pointer">
                <option value="TODOS">TODOS</option>
                <option value="ACTIVO">ACTIVOS</option>
                <option value="DISPONIBLE">DISPONIBLES</option>
                <option value="SUSPENDIDO">SUSPENDIDO</option>
                <option value="TRONCAL">TRONCALES</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Chasis:</span>
              <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className="bg-[#1c2541] border border-slate-700 text-xs text-white px-2 py-1 rounded outline-none focus:border-blue-500 transition-colors cursor-pointer max-w-[200px] truncate">
                <option value="TODOS">TODOS</option>
                {uniqueEquipos.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
             {puertosSeleccionados.length > 0 && puedeEditar && (
                <button onClick={() => setMostrarModalMasivo(true)} className="bg-blue-600/20 hover:bg-blue-600 border border-blue-500 text-blue-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                  <CheckSquare className="w-3.5 h-3.5"/> Editar Seleccionados ({puertosSeleccionados.length})
                </button>
             )}
             {datosHub && (
              <button onClick={handleExportarExcel} disabled={cargando} className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50">
                <Download className="w-3.5 h-3.5" /> Exportar BD
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CUERPO PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL IZQUIERDO: TABLA DE PUERTOS */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${puertoDetalle ? 'hidden lg:flex lg:w-1/2 xl:w-7/12 border-r border-slate-800' : 'w-full'}`}>
          <div className="bg-[#0b132b] p-3 border-b border-slate-800/80 shrink-0 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" />
                {inventarioHub === 'TODOS' ? 'INVENTARIO GLOBAL DE CIUDAD' : 'PUERTOS EN NODO'}
              </h2>
              {datosHub?.resumen && (
                <p className="text-[10px] text-slate-400 mt-1 space-x-3">
                  <span className="text-blue-400 font-bold">Total: {datosHub.resumen.total}</span>
                  <span className="text-emerald-400">Activos: {datosHub.resumen.activos}</span>
                  <span className="text-purple-400">Susp: {datosHub.resumen.suspendidos}</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-[#050814] custom-scrollbar relative">
            <table className="min-w-max w-full text-left text-xs text-slate-300 whitespace-nowrap">
              <thead className="bg-[#0b132b] text-slate-400 sticky top-0 z-10 shadow-sm border-b border-slate-800 uppercase font-black text-[10px] tracking-widest">
                <tr>
                  <th className="p-3 w-10 text-center border-r border-slate-800/50">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-blue-500 rounded"
                      checked={puertosSeleccionados.length > 0 && puertosSeleccionados.length === puertosFiltrados.length}
                      onChange={(e) => {
                        if (e.target.checked) setPuertosSeleccionados(puertosFiltrados.map(p => p.ID));
                        else setPuertosSeleccionados([]);
                      }}
                    />
                  </th>
                  <th className="p-3">ESTATUS</th>
                  <th className="p-3">INTERFAZ</th>
                  <th className="p-3">EQUIPO ID</th>
                  <th className="p-3">IP GESTIÓN</th>
                  <th className="p-3">SERVICIO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {cargando ? <tr><td colSpan="6" className="p-12 text-center text-slate-500 font-mono">Cargando base de datos de ingenieria...</td></tr> :
                puertosFiltrados.length === 0 ? <tr><td colSpan="6" className="p-12 text-center text-slate-500 italic">No se encontraron puertos que coincidan con los filtros seleccionados.</td></tr> :
                puertosFiltrados.map((p, idx) => {
                  const est = String(p.ESTATUS || '').toUpperCase().trim();
                  const isDisponible = est.includes('DISPONIBLE');
                  return (
                    <tr key={idx} onClick={() => seleccionarPuerto(p)} className={`hover:bg-slate-800/20 cursor-pointer ${puertoDetalle?.ID === p.ID ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''}`}>
                      <td className="p-3 text-center border-r border-slate-800/50" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 cursor-pointer accent-blue-500 rounded"
                          checked={puertosSeleccionados.includes(p.ID)}
                          onChange={() => {
                            setPuertosSeleccionados(prev => prev.includes(p.ID) ? prev.filter(id => id !== p.ID) : [...prev, p.ID]);
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          isDisponible ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          est === 'ACTIVO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          est === 'SUSPENDIDO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {p.ESTATUS}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-white truncate">{p.PUERTO}</td>
                      <td className="p-3 text-slate-400 font-mono truncate">
                        {p.EQUIPO_HOTEL_ID || '-'}
                        {inventarioHub === 'TODOS' && p.HUB_PERTENENCIA && (
                          <div className="text-[9px] text-blue-400 mt-0.5 font-bold">NODO: {p.HUB_PERTENENCIA}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-emerald-400 truncate">{p.IP_GESTION || '-'}</td>
                      <td className="p-3 text-slate-200 truncate font-medium">{p.SERVICIO || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO: FICHA TÉCNICA DE INGENIERÍA */}
        <div className={`bg-[#0b132b]/40 border-l border-slate-800 p-5 flex flex-col overflow-hidden shadow-xl transition-all duration-300 ${puertoDetalle ? 'w-full lg:w-1/2 xl:w-5/12' : 'hidden'}`}>
          {puertoDetalle ? (
            <div className="flex flex-col h-full space-y-4 overflow-hidden">
              <div className="shrink-0 flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black text-blue-400 tracking-widest">FICHA TÉCNICA DE INGENIERÍA</h3>
                  <button onClick={() => setMostrarModalVisualizar(true)} className="bg-blue-900/30 hover:bg-blue-600 border border-blue-800 text-blue-300 text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-bold cursor-pointer" title="Ver ficha">
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </button>
                  
                  {esAdmin && (
                    <button onClick={() => setMostrarModalAuditoria(true)} className="bg-emerald-900/30 hover:bg-emerald-600 border border-emerald-800 text-emerald-300 text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-bold cursor-pointer shadow-lg" title="Ver Historial de Cambios Forense">
                      <ShieldCheck className="w-3.5 h-3.5" /> Logs
                    </button>
                  )}

                  {(esRnoc || esAdmin) && (
                    <button onClick={() => setMostrarModalFalla(true)} className="bg-red-900/30 hover:bg-red-600 border border-red-800 text-red-300 text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-bold cursor-pointer">
                      <AlertTriangle className="w-3.5 h-3.5" /> Falla
                    </button>
                  )}
                </div>
                <button onClick={() => setPuertoDetalle(null)} className="text-slate-500 hover:text-white font-bold text-lg leading-none cursor-pointer p-1">×</button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                
                {/* 1. Interfaz Física */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">1. Interfaz Física</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="col-span-2 lg:col-span-3">
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Estatus del Puerto</label>
                      {puedeEditar ? (
                        <select value={editCampos.ESTATUS || ''} onChange={e=>setEditCampos({...editCampos, ESTATUS: e.target.value})} className="w-full bg-[#1c2541] border border-slate-700 text-xs text-white p-2 rounded focus:border-blue-500 outline-none font-bold">
                          <option value="ACTIVO">ACTIVO</option>
                          <option value="DISPONIBLE GI">DISPONIBLE GI</option>
                          <option value="DISPONIBLE TE">DISPONIBLE TE</option>
                          <option value="DISPONIBLE 25">DISPONIBLE 25</option>
                          <option value="DISPONIBLE 100">DISPONIBLE 100</option>
                          <option value="SUSPENDIDO">SUSPENDIDO</option>
                          <option value="TRONCAL">TRONCAL</option>
                        </select>
                      ) : <div className="text-xs font-bold text-white bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.ESTATUS || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Nombre Chasis</label>
                      {puedeEditar ? <input type="text" value={editCampos.EQUIPO_HOTEL_ID || ''} onChange={e=>setEditCampos({...editCampos, EQUIPO_HOTEL_ID: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none font-mono" /> : <div className="text-xs text-white font-mono bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.EQUIPO_HOTEL_ID || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Prefijo / Interfaz</label>
                      {puedeEditar ? <input type="text" value={editCampos.PUERTO || ''} onChange={e=>setEditCampos({...editCampos, PUERTO: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none font-mono" /> : <div className="text-xs text-white font-mono bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.PUERTO || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">IP Gestión Nodo</label>
                      {puedeEditar ? <input type="text" value={editCampos.IP_GESTION || ''} onChange={e=>setEditCampos({...editCampos, IP_GESTION: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-emerald-400 focus:border-emerald-500 outline-none font-mono font-bold" /> : <div className="text-xs text-emerald-400 font-mono font-bold bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.IP_GESTION || '-'}</div>}
                    </div>
                  </div>
                </div>

                {/* 2. Lógica y Enrutamiento */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">2. Lógica y Enrutamiento</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">IP Cliente / P2P</label>
                      {puedeEditar ? <input type="text" value={editCampos.IP_CLIENTE || ''} onChange={e=>setEditCampos({...editCampos, IP_CLIENTE: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-cyan-300 focus:border-blue-500 outline-none font-mono" /> : <div className="text-xs text-cyan-300 font-mono bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.IP_CLIENTE || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">VLAN ID</label>
                      {puedeEditar ? <input type="text" value={editCampos.VLAN || ''} onChange={e=>setEditCampos({...editCampos, VLAN: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-purple-300 focus:border-blue-500 outline-none font-mono font-bold" /> : <div className="text-xs text-purple-300 font-mono font-bold bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.VLAN || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Perfil BW (Mbps)</label>
                      {puedeEditar ? <input type="text" value={editCampos.MBPS || ''} onChange={e=>setEditCampos({...editCampos, MBPS: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-amber-300 focus:border-blue-500 outline-none font-mono font-bold" placeholder="Ej. 100M" /> : <div className="text-xs text-amber-300 font-mono font-bold bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.MBPS || '-'}</div>}
                    </div>
                  </div>
                </div>

                {/* 3. Parámetros Ópticos */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1 flex items-center gap-1">3. Parámetros Ópticos (dBm)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Potencia TX (Transmisión)</label>
                      {puedeEditar ? <input type="text" value={editCampos.POTENCIA_TX || ''} onChange={e=>setEditCampos({...editCampos, POTENCIA_TX: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-blue-300 focus:border-blue-500 outline-none font-mono" placeholder="-2.5" /> : <div className="text-xs text-blue-300 font-mono bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.POTENCIA_TX || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Potencia RX (Recepción)</label>
                      {puedeEditar ? <input type="text" value={editCampos.POTENCIA_RX || ''} onChange={e=>setEditCampos({...editCampos, POTENCIA_RX: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-orange-300 focus:border-blue-500 outline-none font-mono" placeholder="-18.0" /> : <div className="text-xs text-orange-300 font-mono bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.POTENCIA_RX || '-'}</div>}
                    </div>
                  </div>
                </div>

                {/* 4. Planta Externa y Fibra */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">4. Planta Externa y Fibra</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Ruta ODF</label>
                      {puedeEditar ? <input type="text" value={editCampos.ODF || ''} onChange={e=>setEditCampos({...editCampos, ODF: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none" /> : <div className="text-xs text-white bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.ODF || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Asignación Hilo / Pelo</label>
                      {puedeEditar ? <input type="text" value={editCampos.HILO || ''} onChange={e=>setEditCampos({...editCampos, HILO: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none font-bold" /> : <div className="text-xs text-white font-bold bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.HILO || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Caja Empalme / Splitter</label>
                      {puedeEditar ? <input type="text" value={editCampos.SPLITTER || ''} onChange={e=>setEditCampos({...editCampos, SPLITTER: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none" /> : <div className="text-xs text-white bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.SPLITTER || '-'}</div>}
                    </div>
                    <div className="col-span-2 lg:col-span-3">
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Distancia Medida (Km/m)</label>
                      {puedeEditar ? <input type="text" value={editCampos.DISTANCIA || ''} onChange={e=>setEditCampos({...editCampos, DISTANCIA: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none" /> : <div className="text-xs text-white bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.DISTANCIA || '-'}</div>}
                    </div>
                  </div>
                </div>

                {/* 5. Equipamiento Cliente (CPE) */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1 flex items-center gap-1">5. Equipamiento Cliente (CPE)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Marca / Modelo NID</label>
                      {puedeEditar ? <input type="text" value={editCampos.MODELO_NID || ''} onChange={e=>setEditCampos({...editCampos, MODELO_NID: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none" /> : <div className="text-xs text-white bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.MODELO_NID || '-'}</div>}
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Número de Serie (SN) / MAC</label>
                      {puedeEditar ? <input type="text" value={editCampos.SN_MAC || ''} onChange={e=>setEditCampos({...editCampos, SN_MAC: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none font-mono" /> : <div className="text-xs text-white font-mono bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.SN_MAC || '-'}</div>}
                    </div>
                  </div>
                </div>

                {/* 6. Servicio, Ubicación y Administrativo */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">6. Servicio, Ubicación y Administrativo</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="lg:col-span-2">
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Nombre Comercial / Cliente</label>
                      {puedeEditar ? <input type="text" value={editCampos.SERVICIO || ''} onChange={e=>setEditCampos({...editCampos, SERVICIO: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none font-bold" /> : <div className="text-xs text-white font-bold bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.SERVICIO || '-'}</div>}
                    </div>
                    
                    <div className="lg:col-span-2">
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Dirección / Ubicación Física</label>
                      {puedeEditar ? <textarea value={editCampos.UBICACION || ''} onChange={e=>setEditCampos({...editCampos, UBICACION: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none min-h-[60px] custom-scrollbar" /> : <div className="text-xs text-white bg-[#050814] border border-slate-800 p-2 rounded min-h-[60px] whitespace-pre-wrap">{editCampos.UBICACION || '-'}</div>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Coordenadas (Lat, Lng)</label>
                      <div className="flex gap-2">
                        {puedeEditar ? <input type="text" value={editCampos.COORDENADAS || ''} onChange={e=>setEditCampos({...editCampos, COORDENADAS: e.target.value})} className="flex-1 bg-[#050814] border border-slate-700 text-xs p-2 rounded text-white focus:border-blue-500 outline-none font-mono" placeholder="Ej. 32.62781, -115.45446" /> : <div className="flex-1 text-xs text-white font-mono bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.COORDENADAS || '-'}</div>}
                        {editCampos.COORDENADAS && (
                          <a href={generarUrlGoogleMaps(editCampos.COORDENADAS)} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-blue-600 text-white p-2 rounded flex items-center justify-center transition-colors cursor-pointer" title="Ver en Maps">
                            <MapPin className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Fecha Alta Operativa</label>
                      {puedeEditar ? <input type="date" value={formatFechaParaInput(editCampos.FECHA_ALTA)} onChange={e=>setEditCampos({...editCampos, FECHA_ALTA: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-slate-300 focus:border-blue-500 outline-none custom-date-picker" /> : <div className="text-xs text-slate-300 bg-[#050814] border border-slate-800 p-2 rounded">{editCampos.FECHA_ALTA || '-'}</div>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Observaciones / Bitácora</label>
                      {puedeEditar ? <textarea value={editCampos.OBSERVACIONES || ''} onChange={e=>setEditCampos({...editCampos, OBSERVACIONES: e.target.value})} className="w-full bg-[#050814] border border-slate-700 text-xs p-2 rounded text-slate-400 focus:border-blue-500 outline-none min-h-[60px] custom-scrollbar" /> : <div className="text-xs text-slate-400 bg-[#050814] border border-slate-800 p-2 rounded min-h-[60px] whitespace-pre-wrap">{editCampos.OBSERVACIONES || '-'}</div>}
                    </div>
                  </div>
                </div>

              </div>

              {puedeEditar && (
                <div className="pt-4 border-t border-slate-800 shrink-0">
                  <button onClick={handleGuardarCambios} disabled={guardando} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 uppercase tracking-widest text-xs cursor-pointer shadow-lg disabled:opacity-50">
                    {guardando ? 'Escribiendo en MT_DB...' : 'Sobrescribir Ficha Técnica'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-4">
              <Server className="w-16 h-16 opacity-20" />
              <p className="text-sm">Seleccione un puerto en la matriz izquierda para desplegar su <strong>Ficha Técnica de Ingeniería</strong> completa.</p>
            </div>
          )}
        </div>
      </div>

      {mostrarModalMasivo && <ModalEdicionMasiva puertosSeleccionados={puertosSeleccionados} datosHub={datosHub} token={token} usuario={usuario} cerrarModal={() => { setMostrarModalMasivo(false); setPuertosSeleccionados([]); cargarDatosSistemas(); }} />}
      {mostrarModalFalla && <ModalFalla puertoDetalle={puertoDetalle} usuario={usuario} cerrarModal={() => setMostrarModalFalla(false)} />}
      {mostrarModalVisualizar && <ModalVisualizar puertoDetalle={puertoDetalle} cerrarModal={() => setMostrarModalVisualizar(false)} />}
      {mostrarModalAuditoria && <ModalAuditoria idPuerto={puertoDetalle.ID} token={token} cerrarModal={() => setMostrarModalAuditoria(false)} />}
    </div>
  );
}