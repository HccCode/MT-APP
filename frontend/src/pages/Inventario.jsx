import { useState, useEffect } from 'react';
import { Search, MapPin, Eye, AlertTriangle, Server, Download, CheckSquare } from 'lucide-react';
import { generarUrlGoogleMaps, formatFechaParaInput } from '../utils/helpers';

import ModalFalla from '../components/modals/ModalFalla';
import ModalVisualizar from '../components/modals/ModalVisualizar';
import ModalEdicionMasiva from '../components/modals/ModalEdicionMasiva';

export default function Inventario({ token, usuario, puedeEditar, esRnoc, esMcmNoc, esAdmin, estructuraGeografica, handleLogout }) {
  const [inventarioReg, setInventarioReg] = useState(localStorage.getItem('mcm_inv_reg') || '');
  const [inventarioCd, setInventarioCd] = useState(localStorage.getItem('mcm_inv_cd') || '');
  const [inventarioHub, setInventarioHub] = useState(localStorage.getItem('mcm_inv_hub') || 'TODOS');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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

  // ESTADOS NUEVOS PARA EDICIÓN MASIVA
  const [puertosSeleccionados, setPuertosSeleccionados] = useState([]);
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);

  const [mostrarModalFalla, setMostrarModalFalla] = useState(false);
  const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);

  const cargarDatosSistemas = async () => {
    if (!token || !inventarioCd || !inventarioHub) { setDatosHub(null); return; }
    setCargando(true); setErrorApp(null);
    try {
      if (inventarioHub === 'TODOS') {
        const hubs = estructuraGeografica[inventarioReg]?.ciudades?.[inventarioCd]?.hubs || [];
        if (hubs.length === 0) {
          setDatosHub({ resumen: { total: 0, disponibles: 0, activos: 0, suspendidos: 0, troncales: 0 }, puertos: [] });
          return;
        }
        
        const promesas = hubs.map(h => fetch(`${API_URL}/api/hubs?id_hub=${h.id}`).then(res => res.json()));
        const resultados = await Promise.all(promesas);
        
        let todosPuertos = [];
        let resumenGlobal = { total: 0, disponibles: 0, activos: 0, suspendidos: 0, troncales: 0 };
        
        resultados.forEach(data => {
          if (data.puertos) {
            const puertosMarcados = data.puertos.map(p => ({...p, HUB_PERTENENCIA: data.hub}));
            todosPuertos = [...todosPuertos, ...puertosMarcados];
          }
          if (data.resumen) {
            resumenGlobal.total += data.resumen.total || 0;
            resumenGlobal.activos += data.resumen.activos || 0;
            resumenGlobal.suspendidos += data.resumen.suspendidos || 0;
            resumenGlobal.troncales += data.resumen.troncales || 0;
          }
        });

        resumenGlobal.disponibles = todosPuertos.filter(p => String(p.ESTATUS || '').toUpperCase().includes('DISPONIBLE')).length;
        setDatosHub({ resumen: resumenGlobal, puertos: todosPuertos });
      } else {
        const respuesta = await fetch(`${API_URL}/api/hubs?id_hub=${inventarioHub}`);
        if (respuesta.status === 401) { handleLogout(); return; }
        
        const data = await respuesta.json();
        if(data.puertos && data.resumen) {
          data.resumen.disponibles = data.puertos.filter(p => String(p.ESTATUS || '').toUpperCase().includes('DISPONIBLE')).length;
        }
        setDatosHub(data);
      }
    } catch { 
      setErrorApp("Error"); 
    } finally { 
      setCargando(false); 
      setPuertosSeleccionados([]); // Limpia la selección al recargar
    }
  };

  useEffect(() => { 
    cargarDatosSistemas(); 
    setFiltroEquipo('TODOS'); 
  }, [inventarioHub, estructuraGeografica, inventarioReg, inventarioCd]);

  const handleExportarExcel = async () => {
    try {
      setCargando(true);
      let url = `${API_URL}/api/hubs/exportar-excel?`;
      if (inventarioReg) url += `region=${encodeURIComponent(inventarioReg)}&`;
      if (inventarioCd) url += `ciudad=${encodeURIComponent(inventarioCd)}&`;
      if (inventarioHub && inventarioHub !== 'TODOS') url += `id_hub=${encodeURIComponent(inventarioHub)}`;
      
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error("Error en la descarga");
      
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Reporte_MT_DB_${inventarioHub !== 'TODOS' ? inventarioHub : 'Global'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert("Fallo al generar el reporte Excel.");
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarCambios = async () => {
    if (!puertoDetalle?.ID) return;
    setGuardando(true);

    const camposPermitidos = [
      "ESTATUS", "PUERTO", "EQUIPO_HOTEL_ID", "IP_HUB", "NOMBRE_CORTO",
      "ID_MCA", "SERVICIO", "POTENCIA_HUB", "POTENCIA_CPE", "TIPO_SERVICIO",
      "MBPS", "IP_GESTION", "IP_CLIENTE", "BDI", "RUTA", "BUFFER", "HILOS",
      "PARCHEO", "LAMBDAS", "DISTANCIA_CLIENTE", "MARCA_CPE", "MODELO_CPE",
      "SERIE_CPE", "FECHA_DE_ENTREGA", "SERIE_SFP_HUB", "SERIE_SFP_CLIENTE",
      "EQUIPAMIENTO", "SERIE", "DIRECCION", "COORDENADAS", "COMENTARIOS",
      "CONTACTO_NOMBRE", "CONTACTO_TELEFONO"
    ];

    const payloadSanitizado = {};

    camposPermitidos.forEach(key => {
      let val = editCampos[key];
      if (val !== null && val !== undefined) {
        payloadSanitizado[key] = String(val);
      }
    });

    try {
      const res = await fetch(`${API_URL}/api/ports/${puertoDetalle.ID}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify(payloadSanitizado) 
      });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { 
        setPuertoDetalle({...puertoDetalle, ...editCampos}); 
        await cargarDatosSistemas(); 
        alert("Modificación física guardada exitosamente en MT_DB."); 
      } else { 
        const errData = await res.json();
        console.error("Detalle Error 422:", errData);
        alert("Fallo de validación: No se pudo guardar la información."); 
      }
    } catch (err) { 
      console.error(err); 
      alert("Fallo de red al intentar actualizar el puerto."); 
    } finally { setGuardando(false); }
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({
        id: estructuraGeografica[region].ciudades[nombre].id,
        nombre: nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const seleccionarPuerto = (p) => { setPuertoDetalle(p); setEditCampos(p); };

  const hubActivoDatos = inventarioHub === 'TODOS' ? null : (estructuraGeografica[inventarioReg]?.ciudades?.[inventarioCd]?.hubs || []).find(h => h.id === inventarioHub);
  const equiposDisponibles = Array.from(new Set(datosHub?.puertos?.map(p => String(p.EQUIPO_HOTEL_ID || '').trim()).filter(Boolean) || [])).sort();

  const puertosFiltrados = datosHub?.puertos?.filter(p => {
    const est = String(p.ESTATUS || '').toUpperCase().trim();
    const eqId = String(p.EQUIPO_HOTEL_ID || '').trim();
    
    if (filtroEstatus !== 'TODOS') {
      if (filtroEstatus === 'DISPONIBLE' && !est.includes('DISPONIBLE')) return false;
      if (filtroEstatus === 'ACTIVO' && est !== 'ACTIVO') return false;
      if (filtroEstatus === 'SUSPENDIDO' && est !== 'SUSPENDIDO') return false;
      if (filtroEstatus === 'TRONCAL' && !est.includes('TRONCAL')) return false;
    }
    if (filtroEquipo !== 'TODOS' && eqId !== filtroEquipo) return false;
    
    return (
      String(p.PUERTO || '').toLowerCase().includes(filtroTexto.toLowerCase()) || 
      String(p.SERVICIO || '').toLowerCase().includes(filtroTexto.toLowerCase()) || 
      String(p.EQUIPO_HOTEL_ID || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      String(p.DIRECCION || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      String(p.COORDENADAS || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      String(p.IP_GESTION || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      String(p.IP_CLIENTE || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      String(p.BDI || '').toLowerCase().includes(filtroTexto.toLowerCase())
    );
  }) || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[#090f24] border-b border-slate-800/60 px-6 py-3 flex flex-col lg:flex-row justify-between items-center gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="px-3 py-1 rounded-md text-blue-500 border border-blue-600/60 shadow-sm uppercase tracking-wider font-bold">FILTROS LISTADO</span>
          
          <select value={inventarioReg} onChange={(e) => { setInventarioReg(e.target.value); setInventarioCd(''); setInventarioHub('TODOS'); }} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
            <option value="">-- REGIÓN --</option>
            {Object.keys(estructuraGeografica).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-blue-600/80 text-[10px]">➔</span>
          <select value={inventarioCd} onChange={(e) => { setInventarioCd(e.target.value); setInventarioHub('TODOS'); }} disabled={!inventarioReg} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 disabled:opacity-50 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
            <option value="">-- CIUDAD --</option>
            {inventarioReg && obtenerCiudadesOrdenadas(inventarioReg).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
          <span className="text-blue-600/80 text-[10px]">➔</span>
          <select value={inventarioHub} onChange={(e) => setInventarioHub(e.target.value)} disabled={!inventarioCd} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-blue-400 font-bold w-48 disabled:opacity-50 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
            <option value="TODOS">-- TODOS LOS HUBs --</option>
            {inventarioReg && inventarioCd && (estructuraGeografica[inventarioReg]?.ciudades[inventarioCd]?.hubs || []).map(h => 
              <option key={h.id} value={h.id}>{h.nombre}</option>
            )}
          </select>

          <button 
            onClick={handleExportarExcel} 
            disabled={cargando || !inventarioCd}
            className="ml-2 bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-md text-white font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg cursor-pointer border border-emerald-500"
            title="Descargar reporte con gráficas y formato"
          >
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
        </div>

        {inventarioHub !== 'TODOS' && hubActivoDatos && (hubActivoDatos.direccion || hubActivoDatos.coordenadas) && (
          <div className="bg-[#0b132b] border border-slate-800 rounded-full px-4 py-1.5 text-[11px] flex items-center text-slate-300 shadow-sm">
            {hubActivoDatos.direccion && (
              <a href={generarUrlGoogleMaps(hubActivoDatos.direccion)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer" title="Ver en Google Maps">
                <span className="text-pink-500 text-sm">📍</span> <span className="hover:underline">{hubActivoDatos.direccion}</span>
              </a>
            )}
            {hubActivoDatos.direccion && hubActivoDatos.coordenadas && <div className="w-px h-4 bg-slate-700 mx-4"></div>}
            {hubActivoDatos.coordenadas && (
              <a href={generarUrlGoogleMaps(hubActivoDatos.coordenadas)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors cursor-pointer" title="Ver en Google Maps">
                <MapPin className="w-3.5 h-3.5 text-amber-500" /> <span className="text-amber-500 font-mono hover:underline">{hubActivoDatos.coordenadas}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {datosHub?.resumen && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 mt-4 shrink-0">
          <div onClick={() => setFiltroEstatus('TODOS')} className={`cursor-pointer p-4 rounded-xl border transition-all ${filtroEstatus === 'TODOS' ? 'bg-[#1c2541] border-slate-400 shadow-xl' : 'bg-[#0b132b]/60 border-slate-800'}`}><p className="text-xs text-slate-400 font-bold">CAPACIDAD GLOBAL</p><p className="text-2xl font-black mt-1">{datosHub.resumen.total}</p></div>
          <div onClick={() => setFiltroEstatus('DISPONIBLE')} className={`cursor-pointer p-4 rounded-xl border transition-all ${filtroEstatus === 'DISPONIBLE' ? 'bg-green-950/40 border-green-500 shadow-xl' : 'bg-[#0b132b]/60 border-slate-800'}`}><p className="text-xs text-green-400 font-bold">PUERTOS DISPONIBLES</p><p className="text-2xl font-black text-green-400 mt-1">{datosHub.resumen.disponibles}</p></div>
          <div onClick={() => setFiltroEstatus('ACTIVO')} className={`cursor-pointer p-4 rounded-xl border transition-all ${filtroEstatus === 'ACTIVO' ? 'bg-blue-950/40 border-blue-500 shadow-xl' : 'bg-[#0b132b]/60 border-slate-800'}`}><p className="text-xs text-blue-400 font-bold">PUERTOS ACTIVOS</p><p className="text-2xl font-black text-blue-400 mt-1">{datosHub.resumen.activos}</p></div>
          <div onClick={() => setFiltroEstatus('SUSPENDIDO')} className={`cursor-pointer p-4 rounded-xl border transition-all ${filtroEstatus === 'SUSPENDIDO' ? 'bg-purple-950/40 border-purple-500 shadow-xl' : 'bg-[#0b132b]/60 border-slate-800'}`}><p className="text-xs text-purple-400 font-bold">SUSPENDIDOS</p><p className="text-2xl font-black text-purple-400 mt-1">{datosHub.resumen.suspendidos}</p></div>
          <div onClick={() => setFiltroEstatus('TRONCAL')} className={`cursor-pointer p-4 rounded-xl border transition-all ${filtroEstatus === 'TRONCAL' ? 'bg-amber-950/40 border-amber-500 shadow-xl' : 'bg-[#0b132b]/60 border-slate-800'}`}><p className="text-xs text-amber-400 font-bold">ENLACES TRONCALES</p><p className="text-2xl font-black text-amber-400 mt-1">{datosHub.resumen.troncales}</p></div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 p-6 overflow-hidden">
        
        {/* PANEL IZQUIERDO: LISTA DE PUERTOS */}
        <div className="xl:col-span-2 flex flex-col bg-[#0b132b]/30 border border-slate-800 rounded-xl overflow-hidden">
          
          <div className="p-4 bg-[#0b132b]/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input type="text" placeholder="Buscar por interfaz, servicio, IP, BDI..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none w-full" />
            </div>

            <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto overflow-hidden">
              
              {/* BOTON DINAMICO PARA EDICION MASIVA */}
              {puertosSeleccionados.length > 0 && puedeEditar && (
                <button onClick={() => setMostrarModalMasivo(true)} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 whitespace-nowrap shadow-[0_0_10px_rgba(217,119,6,0.3)] transition cursor-pointer">
                  <CheckSquare className="w-4 h-4" /> Editar {puertosSeleccionados.length} Puertos
                </button>
              )}

              <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">Equipo ID:</span>
                <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className="bg-[#1c2541] border border-slate-700 text-xs p-1.5 rounded text-white min-w-[120px] max-w-[180px] truncate outline-none focus:border-blue-500">
                  <option value="TODOS">-- TODOS --</option>
                  {equiposDisponibles.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs text-slate-300 text-left border-collapse table-fixed">
              <thead className="bg-[#0b132b] text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-800 z-10 shadow-sm">
                <tr>
                  <th className="p-3 w-12 text-center border-r border-slate-800">
                    {/* SELECT ALL CHECKBOX */}
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-blue-500 rounded"
                      checked={puertosFiltrados.length > 0 && puertosSeleccionados.length === puertosFiltrados.length}
                      onChange={(e) => {
                        if (e.target.checked) setPuertosSeleccionados(puertosFiltrados.map(p => p.ID));
                        else setPuertosSeleccionados([]);
                      }}
                    />
                  </th>
                  <th className="p-3 w-32">ESTATUS</th>
                  <th className="p-3 w-40">INTERFAZ</th>
                  <th className="p-3 w-56">EQUIPO ID</th>
                  <th className="p-3">SERVICIO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {cargando ? <tr><td colSpan="5" className="p-12 text-center text-slate-500 font-mono">Cargando base de datos de ingenieria...</td></tr> :
                puertosFiltrados.length === 0 ? <tr><td colSpan="5" className="p-12 text-center text-slate-500 italic">No se encontraron puertos que coincidan con los filtros seleccionados.</td></tr> :
                puertosFiltrados.map((p, idx) => {
                  const est = String(p.ESTATUS || '').toUpperCase().trim();
                  const isDisponible = est.includes('DISPONIBLE');
                  return (
                    <tr key={idx} onClick={() => seleccionarPuerto(p)} className={`hover:bg-slate-800/20 cursor-pointer ${puertoDetalle?.ID === p.ID ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''}`}>
                      <td className="p-3 text-center border-r border-slate-800/50" onClick={(e) => e.stopPropagation()}>
                        {/* SINGLE CHECKBOX */}
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
                      <td className="p-3 text-slate-200 truncate font-medium">{p.SERVICIO || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO: EDICIÓN DE PUERTO ÚNICO */}
        <div className="bg-[#0b132b]/40 border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden shadow-xl">
          {puertoDetalle ? (
            <div className="flex flex-col h-full space-y-4 overflow-hidden">
              <div className="shrink-0 flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black text-blue-400 tracking-widest">FICHA TÉCNICA DE INGENIERÍA</h3>
                  <button onClick={() => setMostrarModalVisualizar(true)} className="bg-blue-900/30 hover:bg-blue-600 border border-blue-800 text-blue-300 text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-bold cursor-pointer" title="Ver ficha completa de solo lectura">
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </button>
                  
                  {(esRnoc || esAdmin) && (
                    <button onClick={() => setMostrarModalFalla(true)} className="bg-red-900/30 hover:bg-red-600 border border-red-800 text-red-300 text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-bold cursor-pointer" title="Generar formato de Despliegue de Falla">
                      <AlertTriangle className="w-3.5 h-3.5" /> Desplegar Falla
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-xs custom-scrollbar">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">1. Interfaz Física</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block font-bold mb-1">STATUS</label>
                      <select disabled={!puedeEditar} value={editCampos.ESTATUS || ''} onChange={e=>setEditCampos({...editCampos, ESTATUS: e.target.value.toUpperCase()})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white font-bold">
                        <option value="DISPONIBLE GI">DISPONIBLE GI</option>
                        <option value="DISPONIBLE TE">DISPONIBLE TE</option>
                        <option value="DISPONIBLE 25">DISPONIBLE 25</option>
                        <option value="DISPONIBLE 100">DISPONIBLE 100</option>
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                        <option value="TRONCAL">TRONCAL</option>
                        <option value="TRONCAL GI">TRONCAL GI</option>
                        <option value="TRONCAL TE">TRONCAL TE</option>
                        <option value="TRONCAL 25">TRONCAL 25</option>
                        <option value="TRONCAL 100">TRONCAL 100</option>
                      </select>
                    </div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">PUERTO</label><input type="text" disabled={!puedeEditar} value={editCampos.PUERTO || ''} onChange={e=>setEditCampos({...editCampos, PUERTO: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">EQUIPO ID (CHASIS)</label><input type="text" disabled={!puedeEditar} value={editCampos.EQUIPO_HOTEL_ID || ''} onChange={e=>setEditCampos({...editCampos, EQUIPO_HOTEL_ID: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">IP HUB</label><input type="text" disabled={!puedeEditar} value={editCampos.IP_HUB || ''} onChange={e=>setEditCampos({...editCampos, IP_HUB: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">2. Lógica y Enrutamiento</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">IP GESTIÓN</label><input type="text" disabled={!puedeEditar} value={editCampos.IP_GESTION || ''} onChange={e=>setEditCampos({...editCampos, IP_GESTION: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">IP CLIENTE</label><input type="text" disabled={!puedeEditar} value={editCampos.IP_CLIENTE || ''} onChange={e=>setEditCampos({...editCampos, IP_CLIENTE: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                  </div>
                  <div><label className="text-[10px] text-slate-500 block font-bold mb-1">BDI</label><input type="text" disabled={!puedeEditar} value={editCampos.BDI || ''} onChange={e=>setEditCampos({...editCampos, BDI: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">3. Parámetros Ópticos</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">POTENCIA HUB</label><input type="text" disabled={!puedeEditar} value={editCampos.POTENCIA_HUB || ''} onChange={e=>setEditCampos({...editCampos, POTENCIA_HUB: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-amber-400 font-mono" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">POTENCIA CPE</label><input type="text" disabled={!puedeEditar} value={editCampos.POTENCIA_CPE || ''} onChange={e=>setEditCampos({...editCampos, POTENCIA_CPE: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-amber-400 font-mono" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">SERIE SFP HUB</label><input type="text" disabled={!puedeEditar} value={editCampos.SERIE_SFP_HUB || ''} onChange={e=>setEditCampos({...editCampos, SERIE_SFP_HUB: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-slate-300" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">SERIE SFP CPE</label><input type="text" disabled={!puedeEditar} value={editCampos.SERIE_SFP_CLIENTE || ''} onChange={e=>setEditCampos({...editCampos, SERIE_SFP_CLIENTE: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-slate-300" /></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">4. Planta Externa y Fibra</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">RUTA</label><input type="text" disabled={!puedeEditar} value={editCampos.RUTA || ''} onChange={e=>setEditCampos({...editCampos, RUTA: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">DIST. CLIENTE</label><input type="text" disabled={!puedeEditar} value={editCampos.DISTANCIA_CLIENTE || ''} onChange={e=>setEditCampos({...editCampos, DISTANCIA_CLIENTE: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">LAMBDAS</label><input type="text" disabled={!puedeEditar} value={editCampos.LAMBDAS || ''} onChange={e=>setEditCampos({...editCampos, LAMBDAS: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">BUFFER</label><input type="text" disabled={!puedeEditar} value={editCampos.BUFFER || ''} onChange={e=>setEditCampos({...editCampos, BUFFER: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">HILOS</label><input type="text" disabled={!puedeEditar} value={editCampos.HILOS || ''} onChange={e=>setEditCampos({...editCampos, HILOS: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">PARCHEO</label><input type="text" disabled={!puedeEditar} value={editCampos.PARCHEO || ''} onChange={e=>setEditCampos({...editCampos, PARCHEO: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" /></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">5. Equipamiento Cliente (CPE)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">MARCA</label><input type="text" disabled={!puedeEditar} value={editCampos.MARCA_CPE || ''} onChange={e=>setEditCampos({...editCampos, MARCA_CPE: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white truncate" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">MODELO</label><input type="text" disabled={!puedeEditar} value={editCampos.MODELO_CPE || ''} onChange={e=>setEditCampos({...editCampos, MODELO_CPE: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white truncate" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">SERIE CPE</label><input type="text" disabled={!puedeEditar} value={editCampos.SERIE_CPE || ''} onChange={e=>setEditCampos({...editCampos, SERIE_CPE: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-slate-300 truncate" /></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1">6. Servicio, Ubicación y Administrativo</h4>
                  <div><label className="text-[10px] text-slate-500 block font-bold mb-1">CLIENTE / SERVICIO</label><input type="text" disabled={!puedeEditar} value={editCampos.SERVICIO || ''} onChange={e=>setEditCampos({...editCampos, SERVICIO: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-slate-200" /></div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">TIPO SERVICIO</label><input type="text" disabled={!puedeEditar} value={editCampos.TIPO_SERVICIO || ''} onChange={e=>setEditCampos({...editCampos, TIPO_SERVICIO: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">ANCHO BANDA (MBPS)</label><input type="text" disabled={!puedeEditar} value={editCampos.MBPS || ''} onChange={e=>setEditCampos({...editCampos, MBPS: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white font-mono" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block font-bold mb-1">DIRECCIÓN SERVICIO</label>
                      <div className="flex bg-slate-950 border border-slate-800 rounded overflow-hidden focus-within:border-blue-500 transition-colors">
                        <input type="text" disabled={!puedeEditar} value={editCampos.DIRECCION || ''} onChange={e=>setEditCampos({...editCampos, DIRECCION: e.target.value})} className="w-full bg-transparent p-2 text-white truncate outline-none" />
                        {editCampos.DIRECCION && (
                          <a href={generarUrlGoogleMaps(editCampos.DIRECCION)} target="_blank" rel="noreferrer" title="Abrir en Google Maps" className="px-3 bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer transition-colors border-l border-slate-800"><MapPin className="w-4 h-4" /></a>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block font-bold mb-1">COORDENADAS</label>
                      <div className="flex bg-slate-950 border border-slate-800 rounded overflow-hidden focus-within:border-amber-500 transition-colors">
                        <input type="text" disabled={!puedeEditar} value={editCampos.COORDENADAS || ''} onChange={e=>setEditCampos({...editCampos, COORDENADAS: e.target.value})} className="w-full bg-transparent p-2 text-amber-500 font-mono truncate outline-none" />
                        {editCampos.COORDENADAS && (
                          <a href={generarUrlGoogleMaps(editCampos.COORDENADAS)} target="_blank" rel="noreferrer" title="Abrir en Google Maps" className="px-3 bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center cursor-pointer transition-colors border-l border-slate-800"><MapPin className="w-4 h-4" /></a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">NOMBRE CONTACTO</label><input type="text" disabled={!puedeEditar} value={editCampos.CONTACTO_NOMBRE || ''} onChange={e=>setEditCampos({...editCampos, CONTACTO_NOMBRE: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" /></div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">TELÉFONO CONTACTO</label><input type="text" disabled={!puedeEditar} value={editCampos.CONTACTO_TELEFONO || ''} onChange={e=>setEditCampos({...editCampos, CONTACTO_TELEFONO: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white font-mono" /></div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block font-bold mb-1">FECHA DE ENTREGA</label>
                    <input type="date" disabled={!puedeEditar} value={formatFechaParaInput(editCampos.FECHA_DE_ENTREGA)} onChange={e=>setEditCampos({...editCampos, FECHA_DE_ENTREGA: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white" />
                  </div>
                  <div><label className="text-[10px] text-slate-500 block font-bold mb-1">COMENTARIOS</label><textarea rows="2" disabled={!puedeEditar} value={editCampos.COMENTARIOS || ''} onChange={e=>setEditCampos({...editCampos, COMENTARIOS: e.target.value})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white resize-none" /></div>
                </div>
              </div>
              
              {puedeEditar && (<button onClick={handleGuardarCambios} disabled={guardando} className="w-full bg-[#00a86b] hover:bg-[#008f5d] text-white text-xs font-black py-3 rounded-lg cursor-pointer shrink-0 uppercase tracking-widest mt-2 shadow-lg transition">💾 Guardar Ficha</button>)}
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-4 text-slate-600">
              <Server className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs">Selecciona un puerto óptico para auditar o modificar sus variables en MT_DB.</p>
            </div>
          )}
        </div>
      </div>

      {mostrarModalFalla && <ModalFalla puertoDetalle={puertoDetalle} usuario={usuario} cerrarModal={() => setMostrarModalFalla(false)} />}
      {mostrarModalVisualizar && <ModalVisualizar puertoDetalle={puertoDetalle} cerrarModal={() => setMostrarModalVisualizar(false)} />}
      
      {/* RENDERIZADO DEL MODAL DE EDICIÓN MASIVA */}
      {mostrarModalMasivo && (
        <ModalEdicionMasiva 
          puertosIds={puertosSeleccionados} 
          token={token}
          cerrarModal={() => setMostrarModalMasivo(false)}
          recargarDatos={cargarDatosSistemas}
        />
      )}
    </div>
  );
}