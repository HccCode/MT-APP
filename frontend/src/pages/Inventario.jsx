import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, MapPin, Eye, AlertTriangle, Server, Download, CheckSquare, ShieldCheck, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { generarUrlGoogleMaps, formatFechaParaInput } from '../utils/helpers';
import ModalFalla from '../components/modals/ModalFalla';
import ModalVisualizar from '../components/modals/ModalVisualizar';
import ModalEdicionMasiva from '../components/modals/ModalEdicionMasiva';

export default function Inventario({ token, usuario, puedeEditar, esRnoc, esMcmNoc, esAdmin, estructuraGeografica, handleLogout }) {
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const [inventarioReg, setInventarioReg] = useState(() => esAdmin ? (localStorage.getItem('mcm_inv_reg') || '') : '');
  const [inventarioCd, setInventarioCd] = useState(() => esAdmin ? (localStorage.getItem('mcm_inv_cd') || '') : '');
  const [inventarioHub, setInventarioHub] = useState(() => esAdmin ? (localStorage.getItem('mcm_inv_hub') || 'TODOS') : 'TODOS');

  useEffect(() => {
    if (!esAdmin && !inventarioReg && estructuraGeografica && Object.keys(estructuraGeografica).length > 0) {
      const primeraRegion = Object.keys(estructuraGeografica)[0];
      setInventarioReg(primeraRegion);
    }
  }, [esAdmin, estructuraGeografica, inventarioReg]);

  useEffect(() => { localStorage.setItem('mcm_inv_reg', inventarioReg); }, [inventarioReg]);
  useEffect(() => { localStorage.setItem('mcm_inv_cd', inventarioCd); }, [inventarioCd]);
  useEffect(() => { localStorage.setItem('mcm_inv_hub', inventarioHub); }, [inventarioHub]);

  const [puertoDetalle, setPuertoDetalle] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');
  
  const [editCampos, setEditCampos] = useState({});
  const [puertosSeleccionados, setPuertosSeleccionados] = useState([]);
  
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);
  const [mostrarModalFalla, setMostrarModalFalla] = useState(false);
  const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);

  // ESTADO PARA NOTIFICACIONES (TOAST)
  const [msgInv, setMsgInv] = useState({ text: '', type: '' });

  // ESTADOS PARA PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(50);

  // Limpieza de estados al cambiar de HUB/Filtros
  useEffect(() => {
    setPaginaActual(1);
    setPuertosSeleccionados([]);
  }, [filtroTexto, filtroEstatus, inventarioHub, inventarioCd]);

  // Limpieza del Toast
  useEffect(() => {
    if (msgInv.text) {
      const timer = setTimeout(() => setMsgInv({ text: '', type: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [msgInv]);

  // ================= REACT QUERY: OBTENCIÓN DE DATOS (USEQUERY) =================
  const fetchInventario = async () => {
    if (!token || !inventarioCd || !inventarioHub) return null;
    
    if (inventarioHub === 'TODOS') {
      const hubs = estructuraGeografica[inventarioReg]?.ciudades?.[inventarioCd]?.hubs || [];
      if (hubs.length === 0) return { resumen: { total: 0, disponibles: 0, activos: 0, suspendidos: 0, troncales: 0 }, puertos: [] };
      
      const promesas = hubs.map(h => 
        fetch(`${API_URL}/api/hubs?id_hub=${h.id}`, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(res => res.json())
      );
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
      return { resumen: resumenGlobal, puertos: todosPuertos };
    } else {
      const respuesta = await fetch(`${API_URL}/api/hubs?id_hub=${inventarioHub}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (respuesta.status === 401) { handleLogout(); throw new Error('No Autorizado'); }
      
      const data = await respuesta.json();
      if(data.puertos && data.resumen) {
        data.resumen.disponibles = data.puertos.filter(p => String(p.ESTATUS || '').toUpperCase().includes('DISPONIBLE')).length;
      }
      return data;
    }
  };

  const { data: datosHub, isLoading, isFetching } = useQuery({
    queryKey: ['inventario', inventarioReg, inventarioCd, inventarioHub], // El caché se guarda bajo esta llave
    queryFn: fetchInventario,
    enabled: !!token && !!inventarioCd && !!inventarioHub, // Solo ejecuta si hay datos
    staleTime: 1000 * 60 * 5, // La data se considera "fresca" por 5 minutos (evita recargas innecesarias al cambiar rápido de pestaña)
  });

  const cargando = isLoading || isFetching; // Para mostrar los Skeletons

  // ================= REACT QUERY: GUARDAR CAMBIOS (USEMUTATION) =================
  const mutacionGuardar = useMutation({
    mutationFn: async (payloadSanitizado) => {
      const res = await fetch(`${API_URL}/api/ports/${puertoDetalle.ID}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, credentials: 'include' }, 
        body: JSON.stringify(payloadSanitizado) 
      });
      if (res.status === 401) { handleLogout(); throw new Error("No Autorizado"); }
      if (!res.ok) throw new Error("Fallo de validación al guardar.");
      return payloadSanitizado;
    },
    onSuccess: (dataGuardada) => {
      setPuertoDetalle({...puertoDetalle, ...dataGuardada}); 
      // Invalidamos el caché actual para forzar a que React Query descargue la tabla actualizada en segundo plano
      queryClient.invalidateQueries(['inventario', inventarioReg, inventarioCd, inventarioHub]);
      setMsgInv({ text: "Modificación física guardada exitosamente en MT_DB.", type: 'success' });
    },
    onError: (error) => {
      if (error.message !== "No Autorizado") {
        setMsgInv({ text: error.message || "Fallo de red al intentar actualizar el puerto.", type: 'error' });
      }
    }
  });

  const handleGuardarCambios = () => {
    if (!puertoDetalle?.ID) return;
    setMsgInv({ text: '', type: '' });

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

    mutacionGuardar.mutate(payloadSanitizado);
  };

  const handleExportarExcel = async () => {
    try {
      let url = `${API_URL}/api/hubs/exportar-excel?`;
      if (inventarioReg) url += `region=${encodeURIComponent(inventarioReg)}&`;
      if (inventarioCd) url += `ciudad=${encodeURIComponent(inventarioCd)}&`;
      if (inventarioHub && inventarioHub !== 'TODOS') url += `id_hub=${encodeURIComponent(inventarioHub)}`;
      
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` },credentials: 'include' });
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
      setMsgInv({ text: "Fallo al generar el reporte Excel.", type: 'error' });
    }
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({
        id: estructuraGeografica[region].ciudades[nombre].id,
        nombre: nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const seleccionarPuerto = (p) => { setPuertoDetalle(p); setEditCampos(p); };

  // ================= LÓGICA DE FILTRADO =================
  const puertosFiltrados = datosHub?.puertos?.filter(p => {
    const est = String(p.ESTATUS || '').toUpperCase().trim();
    if (filtroEstatus !== 'TODOS') {
      if (filtroEstatus === 'DISPONIBLE' && !est.includes('DISPONIBLE')) return false;
      if (filtroEstatus === 'ACTIVO' && est !== 'ACTIVO') return false;
      if (filtroEstatus === 'SUSPENDIDO' && est !== 'SUSPENDIDO') return false;
      if (filtroEstatus === 'TRONCAL' && !est.includes('TRONCAL')) return false;
    }
    return (
      String(p.PUERTO || '').toLowerCase().includes(filtroTexto.toLowerCase()) || 
      String(p.SERVICIO || '').toLowerCase().includes(filtroTexto.toLowerCase()) || 
      String(p.ESTATUS || '').toLowerCase().includes(filtroTexto.toLowerCase()) || 
      String(p.IP_GESTION || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      String(p.BDI || '').toLowerCase().includes(filtroTexto.toLowerCase())
    );
  }) || [];

  // ================= LÓGICA DE PAGINACIÓN =================
  const totalPaginas = Math.ceil(puertosFiltrados.length / elementosPorPagina) || 1;
  const indiceUltimoElemento = paginaActual * elementosPorPagina;
  const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
  const puertosPaginados = puertosFiltrados.slice(indicePrimerElemento, indiceUltimoElemento);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      
      {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
      {msgInv.text && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${msgInv.type === 'error' ? 'bg-red-950/95 border-red-500/50 text-red-400' : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-400'}`}>
          {msgInv.type === 'error' ? <AlertTriangle className="w-6 h-6 shrink-0" /> : <CheckCircle className="w-6 h-6 shrink-0" />}
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest">{msgInv.type === 'error' ? 'Error' : 'Operación Exitosa'}</h4>
            <p className="text-xs text-white mt-0.5 font-medium">{msgInv.text}</p>
          </div>
          <button onClick={() => setMsgInv({ text: '', type: '' })} className="ml-4 p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
          >
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
        </div>
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

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 p-6 overflow-hidden min-h-0">
        
        <div className="xl:col-span-2 flex flex-col bg-[#0b132b]/30 border border-slate-800 rounded-xl overflow-hidden shadow-lg min-h-0">
          
          <div className="p-4 bg-[#0b132b]/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input type="text" placeholder="Buscar por interfaz, servicio, Estatus, IP..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none w-full" />
            </div>

            <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto overflow-hidden">
              {puertosSeleccionados.length > 0 && puedeEditar && (
                <button onClick={() => setMostrarModalMasivo(true)} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 whitespace-nowrap shadow-[0_0_10px_rgba(217,119,6,0.3)] transition cursor-pointer">
                  <CheckSquare className="w-4 h-4" /> Editar {puertosSeleccionados.length} Puertos
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-xs text-slate-300 text-left border-collapse table-fixed">
              <thead className="bg-[#0f172a] text-slate-400 uppercase font-bold sticky top-0 z-10 outline outline-1 outline-slate-800 shadow-md">
                <tr>
                  <th className="p-3 w-12 text-center border-r border-slate-800">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-blue-500 rounded"
                      checked={puertosPaginados.length > 0 && puertosPaginados.every(p => puertosSeleccionados.includes(p.ID))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const nuevosIds = puertosPaginados.map(p => p.ID).filter(id => !puertosSeleccionados.includes(id));
                          setPuertosSeleccionados(prev => [...prev, ...nuevosIds]);
                        } else {
                          const idsPagina = puertosPaginados.map(p => p.ID);
                          setPuertosSeleccionados(prev => prev.filter(id => !idsPagina.includes(id)));
                        }
                      }}
                    />
                  </th>
                  <th className="p-3 w-32">ESTATUS</th>
                  <th className="p-3 w-40">INTERFAZ</th>
                  <th className="p-3 w-56">NODO</th>
                  <th className="p-3 w-40 text-emerald-400">IP GESTIÓN</th>
                  <th className="p-3">SERVICIO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {cargando ? (
                  // SKELETON LOADER ANIMADO (Vinculado a React Query isFetching/isLoading)
                  [...Array(7)].map((_, i) => (
                    <tr key={`skel-${i}`} className="border-b border-slate-800/40 animate-pulse bg-slate-900/10">
                      <td className="p-3 text-center border-r border-slate-800/50"><div className="w-4 h-4 bg-slate-700/50 rounded mx-auto"></div></td>
                      <td className="p-3"><div className={`h-5 rounded-full bg-slate-700/50 ${i % 2 === 0 ? 'w-16' : 'w-24'}`}></div></td>
                      <td className="p-3"><div className={`h-4 rounded bg-slate-700/50 ${i % 3 === 0 ? 'w-24' : 'w-20'}`}></div></td>
                      <td className="p-3"><div className={`h-4 rounded bg-slate-700/50 ${i % 2 === 0 ? 'w-32' : 'w-40'}`}></div></td>
                      <td className="p-3"><div className="w-20 h-4 bg-slate-700/50 rounded"></div></td>
                      <td className="p-3"><div className={`h-4 rounded bg-slate-700/50 ${i % 3 === 0 ? 'w-48' : 'w-32'}`}></div></td>
                    </tr>
                  ))
                ) : puertosPaginados.length === 0 ? (
                  <tr><td colSpan="6" className="p-12 text-center text-slate-500 italic">No se encontraron puertos que coincidan con los filtros.</td></tr>
                ) : (
                  puertosPaginados.map((p, idx) => {
                    const est = String(p.ESTATUS || '').toUpperCase().trim();
                    const isDisponible = est.includes('DISPONIBLE');
                    return (
                      <tr key={idx} onClick={() => seleccionarPuerto(p)} className={`group hover:bg-slate-800/60 transition-colors duration-200 ease-in-out cursor-pointer ${puertoDetalle?.ID === p.ID ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''}`}>
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
                        <td className="p-3 font-mono text-white truncate group-hover:text-blue-400 transition-colors">{p.PUERTO}</td>
                        <td className="p-3 text-slate-400 font-mono truncate group-hover:text-slate-200 transition-colors">
                          {inventarioHub === 'TODOS' ? (p.HUB_PERTENENCIA || '-') : (estructuraGeografica[inventarioReg]?.ciudades?.[inventarioCd]?.hubs?.find(h => h.id === inventarioHub)?.nombre || '-')}
                        </td>
                        <td className="p-3 font-mono text-emerald-400/80 truncate group-hover:text-emerald-300 transition-colors">{p.IP_GESTION || '-'}</td>
                        <td className="p-3 text-slate-300 truncate font-medium group-hover:text-white transition-colors">{p.SERVICIO || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          <div className="bg-[#0b132b]/80 border-t border-slate-800 p-3 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
            <div className="text-xs text-slate-400">
              Mostrando <span className="font-bold text-white">{puertosFiltrados.length === 0 ? 0 : indicePrimerElemento + 1}</span> a <span className="font-bold text-white">{Math.min(indiceUltimoElemento, puertosFiltrados.length)}</span> de <span className="font-bold text-white">{puertosFiltrados.length}</span> resultados
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                value={elementosPorPagina} 
                onChange={(e) => { setElementosPorPagina(Number(e.target.value)); setPaginaActual(1); }} 
                className="bg-[#050814] text-xs text-slate-300 p-1.5 rounded border border-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
                <option value={500}>500 por página</option>
              </select>

              <div className="flex items-center gap-1 bg-[#050814] border border-slate-700 rounded-lg overflow-hidden p-0.5">
                <button 
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))} 
                  disabled={paginaActual === 1 || puertosFiltrados.length === 0} 
                  className="p-1 rounded bg-slate-800/50 hover:bg-blue-600 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-white font-bold px-3">
                  {paginaActual} <span className="text-slate-500 font-normal">/ {totalPaginas}</span>
                </span>
                <button 
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} 
                  disabled={paginaActual === totalPaginas || puertosFiltrados.length === 0} 
                  className="p-1 rounded bg-slate-800/50 hover:bg-blue-600 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

        <div className="bg-[#0b132b]/40 border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden shadow-xl min-h-0">
          {puertoDetalle ? (
            <div className="flex flex-col h-full space-y-4 overflow-hidden">
              <div className="shrink-0 flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black text-blue-400 tracking-widest">FICHA TÉCNICA DE INGENIERÍA</h3>
                  <button onClick={() => setMostrarModalVisualizar(true)} className="bg-blue-900/30 hover:bg-blue-600 border border-blue-800 text-blue-300 text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-bold cursor-pointer" title="Ver ficha">
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </button>
                  {(esRnoc || esAdmin) && (
                    <button onClick={() => setMostrarModalFalla(true)} className="bg-red-900/30 hover:bg-red-600 border border-red-800 text-red-300 text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-bold cursor-pointer">
                      <AlertTriangle className="w-3.5 h-3.5" />  Desplegar Falla
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
                      <select disabled={!puedeEditar} value={editCampos.ESTATUS || ''} onChange={e=>setEditCampos({...editCampos, ESTATUS: e.target.value.toUpperCase()})} className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-white font-bold cursor-pointer">
                        <option value="DISPONIBLE GI">DISPONIBLE GI</option>
                        <option value="DISPONIBLE TE">DISPONIBLE TE</option>
                        <option value="DISPONIBLE 25">DISPONIBLE 25</option>
                        <option value="DISPONIBLE 100">DISPONIBLE 100</option>
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                        <option value="TRONCAL TE">TRONCAL TE</option>
                        <option value="TRONCAL GI">TRONCAL GI</option>
                        <option value="TRONCAL 25">TRONCAL 25</option>
                        <option value="TRONCAL 100">TRONCAL 100</option>
                      </select>
                    </div>
                    <div><label className="text-[10px] text-slate-500 block font-bold mb-1">PUERTO</label><input type="text" disabled={!puedeEditar} value={editCampos.PUERTO || ''} onChange={e=>setEditCampos({...editCampos, PUERTO: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" /></div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-bold mb-1">IP HUB</label>
                    <input type="text" disabled={!puedeEditar} value={editCampos.IP_HUB || ''} onChange={e=>setEditCampos({...editCampos, IP_HUB: e.target.value})} className="w-full bg-slate-950 font-mono p-2 rounded border border-slate-800 text-white" />
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
              
              {puedeEditar && (<button onClick={handleGuardarCambios} disabled={mutacionGuardar.isPending} className="w-full bg-[#00a86b] hover:bg-[#008f5d] text-white text-xs font-black py-3 rounded-lg cursor-pointer shrink-0 uppercase tracking-widest mt-2 shadow-lg transition">💾 Guardar Ficha</button>)}
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
      
      {mostrarModalMasivo && (
        <ModalEdicionMasiva 
          puertosIds={puertosSeleccionados} 
          token={token}
          cerrarModal={() => setMostrarModalMasivo(false)}
        />
      )}
    </div>
  );
}