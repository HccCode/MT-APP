import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertOctagon, FileSpreadsheet, Server, XCircle, ArrowRight, Settings2, Database, Zap, Network, Layers, ShieldCheck, Radio, Download } from 'lucide-react';
import { generarPlantillaExcel, generarPlantillaMicroondas } from '../utils/helpers';

export default function CargaExcel({ token, estructuraGeografica, puedeCargar, handleLogout }) {
  // --- CONTROL DE PESTAÑAS PRINCIPALES ---
  const [tabActiva, setTabActiva] = useState('fibra'); // 'fibra' | 'cabezales' | 'microondas'

  // --- ESTADOS COMUNES DE CARGA ---
  const [modoCarga, setModoCarga] = useState('excel'); 
  const [regionSelec, setRegionSelec] = useState(() => localStorage.getItem('mcm_load_reg') || '');
  const [ciudadSelec, setCiudadSelec] = useState(() => localStorage.getItem('mcm_load_cd') || '');
  const [hubSelec, setHubSelec] = useState(() => localStorage.getItem('mcm_load_hub') || '');
  
  const [archivo, setArchivo] = useState(null);
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [hayErrores, setHayErrores] = useState(false);

  // --- ESTADOS FIBRA ÓPTICA (MANUAL) ---
  const [equiposExistentes, setEquiposExistentes] = useState([]);
  const [mapaIpsEquipos, setMapaIpsEquipos] = useState({});
  const [tipoAccionChasis, setTipoAccionChasis] = useState('nuevo'); 

  const [nuevoEquipo, setNuevoEquipo] = useState({
    chasis: '',
    ip_hub: '',
    tipo_puerto: '1G',
    cantidad_puertos: 24,
    prefijo_puerto: 'Gi1/0/',
    inicio_puerto: 1, 
    estatus_inicial: 'DISPONIBLE GI',
    incluir_uplinks: false,
    tipo_uplink: '10G',
    cantidad_uplinks: 4,
    prefijo_uplink: 'Te1/0/',
    inicio_uplink: 1, 
    estatus_uplink: 'DISPONIBLE TE'
  });

  // --- ESTADOS MICROONDAS ---
  const [resultadoMw, setResultadoMw] = useState(null);

  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => { localStorage.setItem('mcm_load_reg', regionSelec); }, [regionSelec]);
  useEffect(() => { localStorage.setItem('mcm_load_cd', ciudadSelec); }, [ciudadSelec]);
  useEffect(() => { localStorage.setItem('mcm_load_hub', hubSelec); }, [hubSelec]);

  // --- FUNCIONES COMUNES ---
  const limpiarNombreSitio = (nombreRaw) => {
    if (!nombreRaw) return '';
    return String(nombreRaw).replace(/^[0-9]+_/, '').replace(/_[0-9]+(:[0-9]+)?$/, '').replace(/_/g, ' ').trim();
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({
        id: estructuraGeografica[region].ciudades[nombre].id,
        nombre: nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  // --- LÓGICA FIBRA: CARGA MANUAL ---
  useEffect(() => {
    if (!hubSelec || tabActiva !== 'fibra') {
      setEquiposExistentes([]);
      setMapaIpsEquipos({});
      setTipoAccionChasis('nuevo');
      setNuevoEquipo(prev => ({...prev, chasis: '', ip_hub: ''}));
      return;
    }
    
    const fetchEquiposDelHub = async () => {
      try {
        const res = await fetch(`${API_URL}/api/hubs?id_hub=${hubSelec}`, { headers: { 'Authorization': `Bearer ${token}`,credentials: 'include' } });
        const json = await res.json();
        
        if (res.ok && json.puertos) {
           const mapIps = {};
           json.puertos.forEach(p => {
               if (p.EQUIPO_HOTEL_ID && p.IP_HUB && !mapIps[p.EQUIPO_HOTEL_ID]) {
                   mapIps[p.EQUIPO_HOTEL_ID] = p.IP_HUB;
               }
           });
           setMapaIpsEquipos(mapIps);

           const unicos = Array.from(new Set(json.puertos.map(p => p.EQUIPO_HOTEL_ID).filter(Boolean))).sort();
           setEquiposExistentes(unicos);
           
           if(unicos.length > 0){
               setTipoAccionChasis('existente');
               setNuevoEquipo(prev => ({ ...prev, chasis: unicos[0], ip_hub: mapIps[unicos[0]] || '' })); 
           } else {
               setTipoAccionChasis('nuevo');
               setNuevoEquipo(prev => ({...prev, chasis: '', ip_hub: ''}));
           }
        }
      } catch (e) { console.error("Error buscando equipos del hub", e); }
    };
    
    fetchEquiposDelHub();
  }, [hubSelec, tabActiva, token, API_URL]);

  const handleCambioPuertoPrincipal = (e) => {
    const tipo = e.target.value;
    let prefijo = 'Gi1/0/';
    let estatus = 'DISPONIBLE GI';
    if (tipo === '10G') { prefijo = 'Te1/0/'; estatus = 'DISPONIBLE TE'; } 
    else if (tipo === '25G') { prefijo = 'Twe1/0/'; estatus = 'DISPONIBLE 25'; } 
    else if (tipo === '100G') { prefijo = 'Hu1/0/'; estatus = 'DISPONIBLE 100'; }
    setNuevoEquipo({ ...nuevoEquipo, tipo_puerto: tipo, prefijo_puerto: prefijo, estatus_inicial: estatus });
  };

  const handleCambioUplink = (e) => {
    const tipo = e.target.value;
    let prefijo = 'Te1/0/';
    let estatus = 'DISPONIBLE TE';
    if (tipo === '1G') { prefijo = 'Gi1/0/'; estatus = 'DISPONIBLE GI'; } 
    else if (tipo === '25G') { prefijo = 'Twe1/0/'; estatus = 'DISPONIBLE 25'; } 
    else if (tipo === '100G') { prefijo = 'Hu1/0/'; estatus = 'DISPONIBLE 100'; }
    setNuevoEquipo({ ...nuevoEquipo, tipo_uplink: tipo, prefijo_uplink: prefijo, estatus_uplink: estatus });
  };

  const generarPreviewManual = () => {
    if (!hubSelec || !nuevoEquipo.chasis) return alert("Selecciona un HUB y escribe/selecciona el nombre del Chasis.");
    if (tipoAccionChasis === 'nuevo' && (!nuevoEquipo.ip_hub || nuevoEquipo.ip_hub.trim() === '')) {
      return alert("Falta información crítica: Al dar de alta un EQUIPO NUEVO, es obligatorio ingresar su IP de Gestión.");
    }
    
    const dataGenerada = [];
    const limitePrincipal = nuevoEquipo.inicio_puerto + nuevoEquipo.cantidad_puertos;
    for (let i = nuevoEquipo.inicio_puerto; i < limitePrincipal; i++) {
      dataGenerada.push({
        PUERTO: `${nuevoEquipo.prefijo_puerto}${i}`, ESTATUS: nuevoEquipo.estatus_inicial,
        EQUIPO_HOTEL_ID: nuevoEquipo.chasis.toUpperCase(), IP_HUB: nuevoEquipo.ip_hub,
        SERVICIO: '', _valido: true, _errores: []
      });
    }

    if (nuevoEquipo.incluir_uplinks) {
        const limiteUplink = nuevoEquipo.inicio_uplink + nuevoEquipo.cantidad_uplinks;
        for (let i = nuevoEquipo.inicio_uplink; i < limiteUplink; i++) {
          dataGenerada.push({
            PUERTO: `${nuevoEquipo.prefijo_uplink}${i}`, ESTATUS: nuevoEquipo.estatus_uplink,
            EQUIPO_HOTEL_ID: nuevoEquipo.chasis.toUpperCase(), IP_HUB: nuevoEquipo.ip_hub,
            SERVICIO: '', _valido: true, _errores: []
          });
        }
    }
    
    setPreviewData(dataGenerada);
    setHayErrores(false);
    setPaso(2);
  };

  const guardarChasisManual = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/hubs/upload-json?id_hub=${encodeURIComponent(hubSelec)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`,credentials: 'include', 'Content-Type': 'application/json' },
        body: JSON.stringify({ puertos: previewData })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error guardando el chasis en MT_DB");
      }
      setPaso(3);
    } catch (err) { alert(`Fallo en el aprovisionamiento: ${err.message}`); } finally { setCargando(false); }
  };

  // --- LÓGICA ARCHIVOS ---
  const manejarArchivo = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setArchivo(e.target.files[0]);
      setResultadoMw(null);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArchivo(e.dataTransfer.files[0]);
      setResultadoMw(null);
    }
  };

  const procesarCargaExcel = async (modo) => {
    if (!archivo) return alert("Selecciona un archivo Excel.");
    
    if (tabActiva === 'fibra' && !hubSelec) return alert("Debes seleccionar un HUB para cargar puertos.");
    if (tabActiva === 'cabezales' && !ciudadSelec) return alert("Debes seleccionar una Ciudad para cargar cabezales.");
    
    const formData = new FormData();
    formData.append('file', archivo);

    setCargando(true);
    try {
      let url = '';
      if (tabActiva === 'fibra') {
          url = `${API_URL}/api/hubs/upload-excel?id_hub=${encodeURIComponent(hubSelec)}&mode=${modo}`;
      } else if (tabActiva === 'cabezales') {
          url = `${API_URL}/api/cabezales/upload-excel?ciudad=${encodeURIComponent(ciudadSelec)}&mode=${modo}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`,credentials: 'include' },
        body: formData
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Error 422 - Verifica que los campos de ciudad o hub estén seleccionados.");

      if (modo === 'preview') {
        setPreviewData(json.data || []);
        setHayErrores(json.has_errors);
        setPaso(2);
      } else {
        setPaso(3);
      }
    } catch (err) { alert(`Error en la carga: ${err.message}`); } finally { setCargando(false); }
  };

  const procesarExcelMicroondas = async () => {
    if (!archivo || !ciudadSelec) return alert("Selecciona Ciudad y un archivo.");
    setCargando(true);
    try {
       throw new Error("El endpoint de carga masiva para Microondas está en desarrollo en el backend.");
    } catch (err) {
       setResultadoMw({ status: 'error', detail: err.message });
    } finally { setCargando(false); }
  };

  const reiniciarProceso = () => {
    setArchivo(null);
    setPreviewData([]);
    setHayErrores(false);
    setPaso(1);
    setResultadoMw(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!puedeCargar) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070b19]">
        <div className="bg-red-950/20 border border-red-900/50 p-10 rounded-2xl text-center max-w-md">
          <ShieldCheck className="w-16 h-16 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-400 mb-2 uppercase tracking-widest">Acceso Denegado</h2>
          <p className="text-slate-400 text-sm">Tu nivel de autorización no permite la ejecución de rutinas de carga masiva en MT_DB.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#070b19] overflow-y-auto custom-scrollbar flex flex-col">
      <div className="bg-[#090f24] border-b border-slate-800/60 pb-4 shrink-0 px-6 py-6">
        <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-widest">
            <UploadCloud className="w-6 h-6 text-emerald-500" /> 
            Aprovisionamiento Masivo (Carga DML)
        </h2>
        <p className="text-xs text-slate-500 mt-1">Motor de ingesta de datos. Utiliza esta herramienta para crear o sobrescribir inventarios a gran escala.</p>
      </div>

      <div className="bg-[#0b132b]/60 border-b border-slate-800/80 p-3 flex gap-2 shrink-0 justify-center sm:justify-start px-6">
        <button onClick={() => { setTabActiva('fibra'); reiniciarProceso(); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${tabActiva==='fibra' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#050814] text-slate-400 hover:text-white border border-slate-800'}`}>
          <Server className="w-4 h-4"/> Nodos y Fibra Óptica
        </button>
        <button onClick={() => { setTabActiva('cabezales'); reiniciarProceso(); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${tabActiva==='cabezales' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-[#050814] text-slate-400 hover:text-white border border-slate-800'}`}>
          <Network className="w-4 h-4"/> Cabezales (HFC)
        </button>
        <button onClick={() => { setTabActiva('microondas'); reiniciarProceso(); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${tabActiva==='microondas' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-[#050814] text-slate-400 hover:text-white border border-slate-800'}`}>
          <Radio className="w-4 h-4"/> Topología Microondas
        </button>
      </div>

      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 w-full flex-1">
        <div className="bg-[#0b132b] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-black flex items-center gap-3 ${tabActiva==='fibra' ? 'text-emerald-400' : (tabActiva==='cabezales' ? 'text-cyan-400' : 'text-purple-400')}`}>
                <Database className="w-7 h-7" /> {tabActiva === 'fibra' ? 'Aprovisionamiento FO' : (tabActiva === 'cabezales' ? 'Aprovisionamiento HFC' : 'Aprovisionamiento MW')}
              </h1>
              <p className="text-slate-400 text-sm mt-1">Da de alta nuevo equipo o inyecta datos masivos a partir de un Excel.</p>
            </div>
            {tabActiva === 'fibra' && paso === 1 && (
              <div className="flex bg-[#050814] border border-slate-700 p-1 rounded-xl">
                <button onClick={() => setModoCarga('excel')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${modoCarga === 'excel' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  <FileSpreadsheet className="w-4 h-4" /> Carga Excel
                </button>
                <button onClick={() => { setModoCarga('manual'); setArchivo(null); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${modoCarga === 'manual' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  <Layers className="w-4 h-4" /> Generador de Chasis
                </button>
              </div>
            )}
            {paso > 1 && (
              <div className="flex gap-4">
                <div className="h-2 w-12 rounded-full transition-all duration-500 bg-emerald-500"></div>
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${paso >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${paso >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
              </div>
            )}
          </div>
        </div>

        {paso === 1 && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in zoom-in duration-300">
            <div className={`xl:col-span-4 bg-[#090f24] p-6 rounded-2xl border flex flex-col h-full shadow-lg ${tabActiva === 'microondas' ? 'border-purple-900/50 shadow-purple-900/10' : (tabActiva === 'cabezales' ? 'border-cyan-900/50 shadow-cyan-900/10' : 'border-slate-800')}`}>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Server className="w-5 h-5 text-indigo-400"/> Destino Lógico (HUB)</h2>
              
              <div className="space-y-4">
                <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); setHubSelec(''); }} className="w-full bg-[#0b132b] border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-emerald-500">
                  <option value="">-- SELECCIONA REGIÓN --</option>
                  {Object.keys(estructuraGeografica || {}).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={ciudadSelec} onChange={(e) => { setCiudadSelec(e.target.value); setHubSelec(''); }} disabled={!regionSelec} className="w-full bg-[#0b132b] border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-emerald-500 disabled:opacity-50">
                  <option value="">-- SELECCIONA CIUDAD --</option>
                  {regionSelec && obtenerCiudadesOrdenadas(regionSelec).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
                
                {tabActiva === 'fibra' && (
                  <select value={hubSelec} onChange={(e) => setHubSelec(e.target.value)} disabled={!ciudadSelec} className="w-full bg-[#0b132b] border border-slate-700 text-emerald-400 font-bold p-3 rounded-lg outline-none focus:border-emerald-500 disabled:opacity-50">
                    <option value="">-- SELECCIONA HUB / NODO --</option>
                    {regionSelec && ciudadSelec && (estructuraGeografica[regionSelec]?.ciudades[ciudadSelec]?.hubs || []).map(h => (
                      <option key={h.id} value={h.id}>{limpiarNombreSitio(h.nombre)}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {tabActiva === 'fibra' && modoCarga === 'manual' ? (
              <div className="xl:col-span-8 bg-[#090f24] p-6 rounded-2xl border border-emerald-900/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Settings2 className="w-5 h-5 text-emerald-400"/> Generador y Expansor de Chasis</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#050814] p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Tipo de Operación</label>
                    <div className="flex bg-[#1c2541] border border-slate-700 rounded-lg p-1 gap-1">
                        <button onClick={() => { setTipoAccionChasis('nuevo'); setNuevoEquipo({...nuevoEquipo, chasis: '', ip_hub: ''}); }} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-colors ${tipoAccionChasis === 'nuevo' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>Nuevo</button>
                        <button onClick={() => { if(equiposExistentes.length > 0){ setTipoAccionChasis('existente'); setNuevoEquipo({...nuevoEquipo, chasis: equiposExistentes[0], ip_hub: mapaIpsEquipos[equiposExistentes[0]] || '' }); } }} disabled={equiposExistentes.length === 0} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${tipoAccionChasis === 'existente' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>Expandir</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">{tipoAccionChasis === 'nuevo' ? 'Nombre del Nuevo Equipo' : 'Equipo a Expandir'}</label>
                    {tipoAccionChasis === 'nuevo' ? (
                        <input type="text" value={nuevoEquipo.chasis} onChange={e=>setNuevoEquipo({...nuevoEquipo, chasis: e.target.value})} className="w-full bg-[#0b132b] border border-slate-700 text-emerald-400 p-2 rounded-lg font-mono focus:border-emerald-500 outline-none" placeholder="Ej. SW-CORE-01" />
                    ) : (
                        <select value={nuevoEquipo.chasis} onChange={e => { const c = e.target.value; setNuevoEquipo({...nuevoEquipo, chasis: c, ip_hub: mapaIpsEquipos[c] || '' }); }} className="w-full bg-[#0b132b] border border-indigo-500 text-indigo-300 p-2 rounded-lg font-mono focus:border-indigo-400 outline-none">
                            {equiposExistentes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex justify-between">IP Gestión {tipoAccionChasis === 'nuevo' ? <span className="text-red-400">* OBLIGATORIA</span> : <span className="text-slate-500">(Auto-Completada)</span>}</label>
                    <input type="text" value={nuevoEquipo.ip_hub} onChange={e=>setNuevoEquipo({...nuevoEquipo, ip_hub: e.target.value})} className={`w-full bg-[#0b132b] border text-white p-2 rounded-lg font-mono outline-none transition-colors ${tipoAccionChasis === 'nuevo' && !nuevoEquipo.ip_hub ? 'border-red-900/50 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'}`} placeholder="10.50.0.1" />
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-800 pt-6">
                    <div className="flex items-center gap-2 mb-4"><Network className="w-4 h-4 text-slate-400" /><h3 className="text-sm font-bold text-slate-200">Bloque Principal de Puertos</h3></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Velocidad</label>
                            <select value={nuevoEquipo.tipo_puerto} onChange={handleCambioPuertoPrincipal} className="w-full bg-[#1c2541] border border-slate-600 text-white p-2.5 rounded-lg font-bold focus:border-emerald-500 outline-none">
                                <option value="1G">Gigabit (1G)</option><option value="10G">TenGigabit (10G)</option><option value="25G">25 Gigabit (25G)</option><option value="100G">100 Gigabit (100G)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex justify-between">Prefijo</label>
                            <input type="text" value={nuevoEquipo.prefijo_puerto} onChange={e=>setNuevoEquipo({...nuevoEquipo, prefijo_puerto: e.target.value})} className="w-full bg-[#0b132b] border border-slate-700 text-emerald-400 p-2.5 rounded-lg font-mono font-bold focus:border-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Empezar en #</label>
                            <input type="number" min="1" value={nuevoEquipo.inicio_puerto} onChange={e=>setNuevoEquipo({...nuevoEquipo, inicio_puerto: parseInt(e.target.value) || 1})} className="w-full bg-[#1c2541] border border-slate-600 text-white p-2.5 rounded-lg font-mono font-bold focus:border-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Cantidad</label>
                            <select value={nuevoEquipo.cantidad_puertos} onChange={e=>setNuevoEquipo({...nuevoEquipo, cantidad_puertos: parseInt(e.target.value)})} className="w-full bg-[#0b132b] border border-slate-700 text-white p-2.5 rounded-lg font-bold focus:border-emerald-500 outline-none">
                                <option value={1}>1</option><option value={2}>2</option><option value={4}>4</option><option value={8}>8</option><option value={12}>12</option><option value={16}>16</option><option value={24}>24</option><option value={48}>48</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t border-slate-800 pt-6 bg-blue-950/10 p-4 rounded-xl border border-blue-900/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400" /><h3 className="text-sm font-bold text-blue-300">Incluir Bloque Secundario (Ej. Uplinks)</h3></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={nuevoEquipo.incluir_uplinks} onChange={e=>setNuevoEquipo({...nuevoEquipo, incluir_uplinks: e.target.checked})} />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                    </div>

                    {nuevoEquipo.incluir_uplinks && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Velocidad</label>
                                <select value={nuevoEquipo.tipo_uplink} onChange={handleCambioUplink} className="w-full bg-[#1c2541] border border-blue-900/50 text-blue-300 p-2.5 rounded-lg font-bold focus:border-blue-500 outline-none transition-colors">
                                    <option value="1G">Gigabit (1G)</option><option value="10G">TenGigabit (10G)</option><option value="25G">25 Gigabit (25G)</option><option value="100G">100 Gigabit (100G)</option>
                                </select>
                            </div>
                            <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Prefijo</label><input type="text" value={nuevoEquipo.prefijo_uplink} onChange={e=>setNuevoEquipo({...nuevoEquipo, prefijo_uplink: e.target.value})} className="w-full bg-[#0b132b] border border-slate-700 text-blue-400 p-2.5 rounded-lg font-mono font-bold focus:border-blue-500 outline-none" /></div>
                            <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Empezar en #</label><input type="number" min="1" value={nuevoEquipo.inicio_uplink} onChange={e=>setNuevoEquipo({...nuevoEquipo, inicio_uplink: parseInt(e.target.value) || 1})} className="w-full bg-[#1c2541] border border-slate-600 text-white p-2.5 rounded-lg font-mono font-bold focus:border-blue-500 outline-none" /></div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Cantidad</label>
                                <select value={nuevoEquipo.cantidad_uplinks} onChange={e=>setNuevoEquipo({...nuevoEquipo, cantidad_uplinks: parseInt(e.target.value)})} className="w-full bg-[#0b132b] border border-slate-700 text-white p-2.5 rounded-lg font-bold focus:border-blue-500 outline-none">
                                    <option value={1}>1</option><option value={2}>2</option><option value={4}>4</option><option value={8}>8</option><option value={12}>12</option><option value={16}>16</option><option value={24}>24</option><option value={48}>48</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={generarPreviewManual} disabled={!hubSelec || !nuevoEquipo.chasis} className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                  Configurar y Previsualizar Red <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className={`xl:col-span-8 bg-[#090f24] p-6 rounded-2xl border flex flex-col justify-center items-center text-center border-dashed ${tabActiva === 'microondas' ? 'border-purple-800/50 bg-purple-950/10' : (tabActiva === 'cabezales' ? 'border-cyan-800/50 bg-cyan-950/10' : 'border-slate-800')}`}>
                
                <div className="w-full mb-6 flex justify-center">
                    <button 
                        onClick={() => tabActiva === 'microondas' ? generarPlantillaMicroondas() : generarPlantillaExcel(tabActiva === 'fibra' ? 'PUERTOS' : 'CABEZALES')} 
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg border
                            ${tabActiva === 'microondas' 
                                ? 'bg-purple-900/40 text-purple-300 border-purple-500/30 hover:bg-purple-600 hover:text-white' 
                                : (tabActiva === 'cabezales' 
                                    ? 'bg-cyan-900/40 text-cyan-300 border-cyan-500/30 hover:bg-cyan-600 hover:text-white'
                                    : 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600 hover:text-white')
                            }`}
                    >
                        <Download className="w-5 h-5" /> 
                        Descargar Plantilla Excel ({tabActiva === 'microondas' ? 'Microondas' : (tabActiva === 'fibra' ? 'Puertos FO' : 'Cabezales')})
                    </button>
                </div>

                <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={manejarArchivo} className="hidden" id="excel-upload-main"/>
                <label htmlFor="excel-upload-main" onDragOver={handleDragOver} onDrop={handleDrop} className="cursor-pointer group flex flex-col items-center w-full py-8 hover:bg-[#050814]/40 rounded-xl transition-all border border-transparent hover:border-slate-800">
                  <div className={`p-4 rounded-full group-hover:scale-110 transition-transform duration-300 ${tabActiva === 'microondas' ? 'bg-purple-500/10' : (tabActiva === 'cabezales' ? 'bg-cyan-500/10' : 'bg-indigo-500/10')}`}>
                    <UploadCloud className={`w-12 h-12 ${tabActiva === 'microondas' ? 'text-purple-400' : (tabActiva === 'cabezales' ? 'text-cyan-400' : 'text-indigo-400')}`} />
                  </div>
                  <h3 className="text-white font-bold mt-4 text-lg">Selecciona tu archivo Excel</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs">Peligro: Puede sobrescribir datos si el archivo contiene claves primarias existentes.</p>
                </label>

                {archivo && (
                  <div className="mt-6 w-full max-w-md mx-auto">
                    <div className={`bg-[#0b132b] border p-3 rounded-lg flex items-center justify-between text-sm font-mono mb-4 ${tabActiva === 'microondas' ? 'border-purple-500/30 text-purple-400' : (tabActiva === 'cabezales' ? 'border-cyan-500/30 text-cyan-400' : 'border-indigo-500/30 text-indigo-400')}`}>
                      <span className="truncate">{archivo.name}</span>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    </div>
                    
                    {tabActiva === 'fibra' || tabActiva === 'cabezales' ? (
                        <button onClick={() => procesarCargaExcel('preview')} disabled={cargando || (tabActiva === 'fibra' && !hubSelec) || (tabActiva === 'cabezales' && !ciudadSelec)} className={`w-full text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2 ${tabActiva === 'cabezales' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.2)]' : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.2)]'}`}>
                          {cargando ? 'Escaneando Documento...' : 'Analizar Excel (Preview)'} <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={procesarExcelMicroondas} disabled={cargando || !ciudadSelec} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                          {cargando ? 'Subiendo Masivo...' : 'Inyectar Microondas'} <ArrowRight className="w-4 h-4" />
                        </button>
                    )}

                    {resultadoMw && tabActiva === 'microondas' && (
                        <div className="mt-4 p-3 bg-red-950/40 border border-red-900/50 rounded flex items-start gap-2 text-left">
                            <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-red-400 text-xs">{resultadoMw.detail}</p>
                        </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {paso === 2 && (tabActiva === 'fibra' || tabActiva === 'cabezales') && (
          <div className="bg-[#090f24] rounded-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[70vh] shadow-2xl">
            <div className={`p-4 flex items-center justify-between shrink-0 ${hayErrores ? 'bg-red-950/40 border-b border-red-900/50' : 'bg-emerald-950/40 border-b border-emerald-900/50'}`}>
              <div className="flex items-center gap-3">
                {hayErrores ? <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" /> : <CheckCircle className="w-6 h-6 text-emerald-500" />}
                <div>
                  <h2 className={`font-black text-lg uppercase tracking-wider ${hayErrores ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hayErrores ? '⚠️ Errores en la validación' : '✅ Lote aprobado para inyección'}
                  </h2>
                  <p className="text-xs text-slate-400">{previewData.length} registros estructurados en memoria.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={reiniciarProceso} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition">Descartar</button>
                <button onClick={modoCarga === 'manual' ? guardarChasisManual : () => procesarCargaExcel('commit')} disabled={hayErrores || cargando} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {cargando ? 'Procesando en MT_DB...' : 'Inyectar en la Red'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                <thead className="bg-[#0b132b] text-slate-400 sticky top-0 uppercase font-bold tracking-widest z-10 shadow-sm border-b border-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">St</th>
                    {tabActiva === 'fibra' ? (
                        <><th className="p-3">CHASIS ID</th><th className="p-3">INTERFAZ</th><th className="p-3">ESTATUS</th><th className="p-3">IP HUB</th></>
                    ) : (
                        <><th className="p-3">CABEZAL ID</th><th className="p-3">MARCA/MOD</th><th className="p-3">SERVICIO</th><th className="p-3">PORTADORA / CANAL</th></>
                    )}
                    <th className="p-3">VEREDICTO DEL SISTEMA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {previewData.map((fila, idx) => (
                    <tr key={idx} className={!fila._valido ? 'bg-red-950/20' : 'hover:bg-slate-800/30'}>
                      <td className="p-3 text-center">
                        {!fila._valido ? <XCircle className="w-4 h-4 text-red-500 inline-block" /> : <CheckCircle className="w-4 h-4 text-emerald-500 inline-block" />}
                      </td>
                      
                      {tabActiva === 'fibra' ? (
                          <>
                              <td className="p-3 text-indigo-300 font-bold">{fila.EQUIPO_HOTEL_ID || '-'}</td>
                              <td className="p-3 font-mono font-bold text-white">{fila.PUERTO}</td>
                              <td className="p-3 text-[10px] uppercase font-bold text-emerald-400">{fila.ESTATUS}</td>
                              <td className="p-3 text-slate-400 font-mono">{fila.IP_HUB || '-'}</td>
                          </>
                      ) : (
                          <>
                              <td className="p-3 text-cyan-300 font-bold">{fila.ID_EQUIPO || '-'}</td>
                              <td className="p-3 text-slate-300">{fila.MARCA || '-'} {fila.MODELO || ''}</td>
                              <td className="p-3 text-slate-400">{fila.SERVICIO || '-'}</td>
                              <td className="p-3 font-mono text-purple-400">{fila.PORTADORA || '-'} / CH:{fila.CANAL || '-'}</td>
                          </>
                      )}

                      <td className="p-3">
                        {!fila._valido ? (
                          <div className="flex flex-col gap-1 text-[10px] font-bold text-red-400">
                            {fila._errores.map((err, i) => <span key={i}>• {err}</span>)}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Listo para inyección</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="bg-emerald-950/20 p-12 rounded-2xl border border-emerald-900/50 flex flex-col justify-center items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Aprovisionamiento Efectuado</h2>
            <p className="text-emerald-400 font-medium mb-8">
              {modoCarga === 'manual' 
                ? `El chasis ${nuevoEquipo.chasis} y sus ${previewData.length} puertos fueron creados con éxito en la base de datos.` 
                : 'El inventario masivo de Excel fue inyectado en MT_DB.'}
            </p>
            <button onClick={reiniciarProceso} className="bg-[#0b132b] border border-slate-700 hover:border-emerald-500 text-white px-6 py-3 rounded-lg font-bold transition shadow-lg">Registrar Nuevo Movimiento</button>
          </div>
        )}
      </div>
    </div>
  );
}