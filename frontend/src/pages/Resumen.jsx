import { useState, useEffect } from 'react';
import { BarChart3, Layers, Activity, RefreshCw } from 'lucide-react';

export default function Resumen({ estructuraGeografica }) {
  const [resumenReg, setResumenReg] = useState(localStorage.getItem('mcm_res_reg') || '');
  const [resumenCd, setResumenCd] = useState(localStorage.getItem('mcm_res_cd') || '');
  const [resumenHub, setResumenHub] = useState(localStorage.getItem('mcm_res_hub') || '');
  const [subTabResumen, setSubTabResumen] = useState('equipos'); 
  const [resumenEquiposData, setResumenEquiposData] = useState([]);
  const [resumenAnchoBandaData, setResumenAnchoBandaData] = useState([]);
  const [listaClientesActivos, setListaClientesActivos] = useState([]);
  const [listaClientesSuspendidos, setListaClientesSuspendidos] = useState([]);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [detallesClientesHub, setDetallesClientesHub] = useState({}); 

  // URL Dinámica
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => { localStorage.setItem('mcm_res_reg', resumenReg); }, [resumenReg]);
  useEffect(() => { localStorage.setItem('mcm_res_cd', resumenCd); }, [resumenCd]);
  useEffect(() => { localStorage.setItem('mcm_res_hub', resumenHub); }, [resumenHub]);

  useEffect(() => {
    const hbs = estructuraGeografica[resumenReg]?.ciudades?.[resumenCd]?.hubs || [];
    if (hbs.length === 1 && resumenHub !== hbs[0].id) {
      setResumenHub(hbs[0].id);
    }
  }, [estructuraGeografica, resumenReg, resumenCd, resumenHub]);

  const cargarResumenDashboardEquipos = async () => {
    let hubs = estructuraGeografica[resumenReg]?.ciudades?.[resumenCd]?.hubs || [];
    if (hubs.length === 0) { 
        setResumenEquiposData([]); 
        setResumenAnchoBandaData([]); 
        setListaClientesActivos([]);
        setListaClientesSuspendidos([]);
        setDetallesClientesHub({});
        return; 
    }
    if (resumenHub) hubs = hubs.filter(h => h.id === resumenHub);

    setCargandoResumen(true);
    setDetallesClientesHub({}); 
    try {
      const mapaEquipos = {};
      const mapaSitiosBanda = {};
      let activosTemp = [];
      let suspendidosTemp = [];

      const promesas = hubs.map(async (h) => {
        const res = await fetch(`${API_URL}/api/hubs?id_hub=${h.id}`);
        if (!res.ok) return;
        const data = await res.json();
        return { hubId: h.id, hubNombre: h.nombre, puertos: data.puertos || [] };
      });

      const listadoHubsData = await Promise.all(promesas);

      listadoHubsData.forEach(hubData => {
        if (!hubData) return;
        if (!mapaSitiosBanda[hubData.hubId]) {
          mapaSitiosBanda[hubData.hubId] = { hubId: hubData.hubId, hubNombre: hubData.hubNombre, anchoBandaTotal: 0, puertosActivos: 0, puertosSuspendidos: 0 };
        }
        
        hubData.puertos.forEach(p => {
          let equipoId = String(p.EQUIPO_HOTEL_ID || '').trim();
          if (!equipoId) equipoId = "SIN EQUIPO ASIGNADO";
          const puertoName = String(p.PUERTO || '').toLowerCase().trim();
          const estatus = String(p.ESTATUS || '').toUpperCase().trim();
          const mbpsPort = parseFloat(p.MBPS) || 0;

          let forceSpeed = null;
          if (estatus.includes('100')) forceSpeed = 'HU';
          else if (estatus.includes('25')) forceSpeed = 'TF';
          else if (estatus.includes('TE')) forceSpeed = 'TE';
          else if (estatus.includes('GI')) forceSpeed = 'GI';

          const isHu = forceSpeed === 'HU' || puertoName.includes('hundred') || puertoName.includes('100g') || puertoName.startsWith('hu');
          const isTf = forceSpeed === 'TF' || (!isHu && (puertoName.includes('twentyfive') || puertoName.includes('25g') || puertoName.startsWith('tf') || puertoName.startsWith('twe')));
          const isTe = forceSpeed === 'TE' || (!isHu && !isTf && (puertoName.includes('tengigabit') || puertoName.includes('tengige') || puertoName.includes('10g') || puertoName.startsWith('te') || puertoName.startsWith('xe') || puertoName.startsWith('xge')));
          const isGi = forceSpeed === 'GI' || (!isHu && !isTf && !isTe);
           
          if (!mapaEquipos[equipoId]) {
            mapaEquipos[equipoId] = {
              equipoId: equipoId, hubId: hubData.hubId, hubNombre: hubData.hubNombre,
              giLibres: 0, giOcupados: 0, teLibres: 0, teOcupados: 0, tfLibres: 0, tfOcupados: 0, huLibres: 0, huOcupados: 0, totalPuertos: 0
            };
          }

          mapaEquipos[equipoId].totalPuertos++;
          const esLibre = estatus.includes('DISPONIBLE');
          const esOcupado = estatus === 'ACTIVO' || estatus.includes('TRONCAL') || estatus === 'SUSPENDIDO';

          if (isGi) {
            if (esLibre) mapaEquipos[equipoId].giLibres++; else if (esOcupado) mapaEquipos[equipoId].giOcupados++;
          } else if (isTe) {
            if (esLibre) mapaEquipos[equipoId].teLibres++; else if (esOcupado) mapaEquipos[equipoId].teOcupados++;
          } else if (isTf) {
            if (esLibre) mapaEquipos[equipoId].tfLibres++; else if (esOcupado) mapaEquipos[equipoId].tfOcupados++;
          } else if (isHu) {
            if (esLibre) mapaEquipos[equipoId].huLibres++; else if (esOcupado) mapaEquipos[equipoId].huOcupados++;
          }

          if (estatus === 'ACTIVO') {
            mapaSitiosBanda[hubData.hubId].puertosActivos++;
            mapaSitiosBanda[hubData.hubId].anchoBandaTotal += mbpsPort;
            activosTemp.push({...p, hubId: hubData.hubId, HUB_NOMBRE: hubData.hubNombre});
          } else if (estatus === 'SUSPENDIDO') {
            mapaSitiosBanda[hubData.hubId].puertosSuspendidos++;
            suspendidosTemp.push({...p, hubId: hubData.hubId, HUB_NOMBRE: hubData.hubNombre});
          } else if (estatus === 'TRONCAL' || estatus === 'TRONCAL GI' || estatus === 'TRONCAL TE') {
            mapaSitiosBanda[hubData.hubId].anchoBandaTotal += mbpsPort;
          }
        });
      });

      const listaEquiposFinal = Object.values(mapaEquipos).map(eq => {
        const totalGi = eq.giLibres + eq.giOcupados;
        const totalTe = eq.teLibres + eq.teOcupados;
        const totalTf = eq.tfLibres + eq.tfOcupados;
        const totalHu = eq.huLibres + eq.huOcupados;
        return {
          ...eq, totalGi, totalTe, totalTf, totalHu,
          giPct: totalGi > 0 ? Math.round((eq.giLibres / totalGi) * 100) : 0,
          tePct: totalTe > 0 ? Math.round((eq.teLibres / totalTe) * 100) : 0,
          tfPct: totalTf > 0 ? Math.round((eq.tfLibres / totalTf) * 100) : 0,
          huPct: totalHu > 0 ? Math.round((eq.huLibres / totalHu) * 100) : 0
        };
      });

      setResumenEquiposData(listaEquiposFinal);
      setResumenAnchoBandaData(Object.values(mapaSitiosBanda));
      setListaClientesActivos(activosTemp);
      setListaClientesSuspendidos(suspendidosTemp);
    } catch (e) { console.error(e); } finally { setCargandoResumen(false); }
  };

  useEffect(() => { cargarResumenDashboardEquipos(); }, [resumenCd, resumenHub, resumenReg, estructuraGeografica]);

  const handleResumenRegionChange = (r) => { setResumenReg(r); setResumenCd(''); setResumenHub(''); };
  const handleResumenCiudadChange = (c) => { setResumenCd(c); setResumenHub(''); };
  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({
        id: estructuraGeografica[region].ciudades[nombre].id,
        nombre: nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };
  const hubActualResumen = (estructuraGeografica[resumenReg]?.ciudades?.[resumenCd]?.hubs || []).find(h => h.id === resumenHub);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#04060f]">
      <div className="bg-[#130e06] border-b border-amber-900/40 px-6 py-3 flex flex-col lg:flex-row justify-between items-center gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="px-3 py-1 rounded-md text-amber-500 border border-amber-600/60 shadow-sm uppercase tracking-wider font-bold">FILTROS MÉTRICAS</span>
          <select value={resumenReg} onChange={(e) => handleResumenRegionChange(e.target.value)} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"><option value="" className="bg-[#0b132b]">-- REGIÓN --</option>{Object.keys(estructuraGeografica).map(r => <option key={r} value={r} className="bg-[#0b132b]">{r}</option>)}</select>
          <span className="text-amber-600/80 text-[10px]">➔</span>
          <select value={resumenCd} onChange={(e) => handleResumenCiudadChange(e.target.value)} disabled={!resumenReg} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 disabled:opacity-50 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"><option value="" className="bg-[#0b132b]">-- CIUDAD --</option>{resumenReg && obtenerCiudadesOrdenadas(resumenReg).map(c => <option key={c.id} value={c.nombre} className="bg-[#0b132b]">{c.nombre}</option>)}</select>
          <span className="text-amber-600/80 text-[10px]">➔</span>
          <select value={resumenHub} onChange={(e) => setResumenHub(e.target.value)} disabled={!resumenCd} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-amber-400 font-bold w-48 disabled:opacity-50 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"><option value="" className="bg-[#0b132b]">-- TODOS LOS HUBs --</option>{resumenReg && resumenCd && (estructuraGeografica[resumenReg]?.ciudades[resumenCd]?.hubs || []).map(h => <option key={h.id} value={h.id} className="bg-[#0b132b]">{h.nombre}</option>)}</select>
        </div>
      </div>

      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5"><BarChart3 className="w-6 h-6 text-amber-400" /> PANEL ANALÍTICO DE INFRAESTRUCTURA</h2>
          <p className="text-xs text-slate-400 mt-1">Localización actual: <span className="text-amber-400 font-black uppercase">{resumenCd}</span> {hubActualResumen && <span>➔ Nodo: <span className="text-blue-400 font-bold">{hubActualResumen.nombre}</span></span>}</p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner shrink-0">
          <button onClick={() => setSubTabResumen('equipos')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${subTabResumen === 'equipos' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}><Layers className="w-3.5 h-3.5" /> Disponibilidad por Equipo</button>
          <button onClick={() => setSubTabResumen('ancho_banda')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${subTabResumen === 'ancho_banda' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}><Activity className="w-3.5 h-3.5" /> Ancho de Banda Total</button>
        </div>
        <button onClick={cargarResumenDashboardEquipos} className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0"><RefreshCw className={`w-3.5 h-3.5 ${cargandoResumen ? 'animate-spin' : ''}`} /> Recalcular Todo</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {cargandoResumen ? (
          <div className="text-center py-48 text-sm text-slate-400 font-mono tracking-widest bg-[#0b132b]/20 border-2 border-dashed border-slate-800 rounded-2xl animate-pulse">🚀 ESCANEANDO Y PROCESANDO PROTOCOLOS ÓPTICOS EN LA CIUDAD...</div>
        ) : (
          <>
            {subTabResumen === 'equipos' && (
              (!resumenReg || !resumenCd) ? (
                <div className="text-center py-36 text-xs text-slate-500 italic bg-[#0b132b]/10 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-3 shadow-inner"><span className="text-3xl">📊</span>Selecciona la Región y Ciudad en la barra superior para visualizar la disponibilidad de puertos.</div>
              ) : resumenEquiposData.length === 0 ? (
                <div className="text-center py-36 text-xs text-slate-500 italic bg-[#0b132b]/10 border border-dashed border-slate-800 rounded-2xl">No se encontraron puertos registrados para estructurar chasis en esta localización.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resumenEquiposData.map((eq, idx) => (
                    <div key={idx} className="bg-slate-950/90 border-2 border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:border-blue-500/40 transition-all shadow-2xl relative">
                      <div className="border-b border-slate-900 pb-3"><span className="bg-amber-950/60 px-2.5 py-1 rounded-md text-[10px] font-mono font-black text-amber-400 border border-amber-800/60 uppercase tracking-wider">{eq.hubNombre}</span><h3 className="text-base font-black text-white mt-3 truncate tracking-tight text-blue-400 font-mono">⚙️ {eq.equipoId}</h3></div>
                      <div className="flex justify-evenly gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-900">
                        {eq.totalGi > 0 && (<div className="text-center flex-1 border-r border-slate-800/60 last:border-0"><p className="text-[10px] text-slate-500 font-bold uppercase">BASE GIGABIT</p><p className="text-lg font-mono font-black text-white mt-1">{eq.totalGi}</p></div>)}
                        {eq.totalTe > 0 && (<div className="text-center flex-1 border-r border-slate-800/60 last:border-0"><p className="text-[10px] text-slate-500 font-bold uppercase">BASE TENGIGABIT</p><p className="text-lg font-mono font-black text-white mt-1">{eq.totalTe}</p></div>)}
                        {eq.totalTf > 0 && (<div className="text-center flex-1 border-r border-slate-800/60 last:border-0"><p className="text-[10px] text-slate-500 font-bold uppercase">BASE 25G</p><p className="text-lg font-mono font-black text-white mt-1">{eq.totalTf}</p></div>)}
                        {eq.totalHu > 0 && (<div className="text-center flex-1 border-r border-slate-800/60 last:border-0"><p className="text-[10px] text-slate-500 font-bold uppercase">BASE 100G</p><p className="text-lg font-mono font-black text-white mt-1">{eq.totalHu}</p></div>)}
                      </div>  
                      <div className="space-y-5">
                        {eq.totalGi > 0 && (<div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">GigabitEthernet</span><span className="font-mono text-green-400 font-black">{eq.giLibres} Libres <span className="text-slate-600 font-normal">/ {eq.giOcupados} Ocup.</span></span></div><div className="w-full bg-slate-900 h-6 rounded-xl overflow-hidden border border-slate-800 p-1"><div className="bg-gradient-to-r from-green-600 to-emerald-400 h-full rounded-lg flex items-center justify-end transition-all duration-500" style={{ width: `${eq.giPct}%`, opacity: eq.giPct > 0 ? 1 : 0, paddingRight: eq.giPct > 15 ? '8px' : '0' }}>{eq.giPct > 15 && <span className="text-[10px] font-black text-black font-mono">{eq.giPct}% Disp</span>}</div></div></div>)}
                        {eq.totalTe > 0 && (<div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">TenGigabitEthernet (10G)</span><span className="font-mono text-purple-400 font-black">{eq.teLibres} Libres <span className="text-slate-600 font-normal">/ {eq.teOcupados} Ocup.</span></span></div><div className="w-full bg-slate-900 h-6 rounded-xl overflow-hidden border border-slate-800 p-1"><div className="bg-gradient-to-r from-purple-600 to-fuchsia-400 h-full rounded-lg flex items-center justify-end transition-all duration-500" style={{ width: `${eq.tePct}%`, opacity: eq.tePct > 0 ? 1 : 0, paddingRight: eq.tePct > 15 ? '8px' : '0' }}>{eq.tePct > 15 && <span className="text-[10px] font-black text-black font-mono">{eq.tePct}% Disp</span>}</div></div></div>)}
                        {eq.totalTf > 0 && (<div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">TwentyFiveGig (25G)</span><span className="font-mono text-cyan-400 font-black">{eq.tfLibres} Libres <span className="text-slate-600 font-normal">/ {eq.tfOcupados} Ocup.</span></span></div><div className="w-full bg-slate-900 h-6 rounded-xl overflow-hidden border border-slate-800 p-1"><div className="bg-gradient-to-r from-cyan-600 to-sky-400 h-full rounded-lg flex items-center justify-end transition-all duration-500" style={{ width: `${eq.tfPct}%`, opacity: eq.tfPct > 0 ? 1 : 0, paddingRight: eq.tfPct > 15 ? '8px' : '0' }}>{eq.tfPct > 15 && <span className="text-[10px] font-black text-black font-mono">{eq.tfPct}% Disp</span>}</div></div></div>)}
                        {eq.totalHu > 0 && (<div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">HundredGig (100G)</span><span className="font-mono text-amber-500 font-black">{eq.huLibres} Libres <span className="text-slate-600 font-normal">/ {eq.huOcupados} Ocup.</span></span></div><div className="w-full bg-slate-900 h-6 rounded-xl overflow-hidden border border-slate-800 p-1"><div className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-lg flex items-center justify-end transition-all duration-500" style={{ width: `${eq.huPct}%`, opacity: eq.huPct > 0 ? 1 : 0, paddingRight: eq.huPct > 15 ? '8px' : '0' }}>{eq.huPct > 15 && <span className="text-[10px] font-black text-black font-mono">{eq.huPct}% Disp</span>}</div></div></div>)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            {subTabResumen === 'ancho_banda' && (
              (!resumenReg || !resumenCd) ? (
                <div className="text-center py-36 text-xs text-slate-500 italic bg-[#0b132b]/10 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-3 shadow-inner"><span className="text-3xl">⚡</span>Selecciona la Región y Ciudad en la barra superior para visualizar el ancho de banda y clientes.</div>
              ) : resumenAnchoBandaData.length === 0 ? (
                <div className="text-center py-36 text-xs text-slate-500 italic bg-[#0b132b]/10 border border-dashed border-slate-800 rounded-2xl">No hay asignaciones activas calculadas en este nodo geográfico.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {resumenAnchoBandaData.map((sitio, idx) => {
                    const totalGbps = (sitio.anchoBandaTotal / 1000).toFixed(2);
                    const tipoExpandido = detallesClientesHub[sitio.hubId]; 
                    const isExpandidoActivo = tipoExpandido === 'ACTIVO';
                    const isExpandidoSuspendido = tipoExpandido === 'SUSPENDIDO';
                    return (
                      <div key={idx} className="bg-[#0b132b]/40 border-2 border-slate-800 rounded-2xl p-6 space-y-4 hover:border-blue-500/30 transition-all shadow-xl h-fit">
                        <div className="flex justify-between items-start border-b border-slate-800/80 pb-3"><div><span className="text-[10px] font-mono font-black px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-900 rounded uppercase">SITIO CENTRAL HUB</span><h3 className="text-lg font-black text-white mt-1.5 font-mono">⚡ {sitio.hubNombre}</h3></div><div className="text-right"><p className="text-[10px] text-slate-500 font-bold uppercase">Tráfico Agregado</p><p className="text-2xl font-mono font-black text-emerald-400 mt-0.5">{totalGbps} <span className="text-xs font-bold text-slate-400">Gbps</span></p></div></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div onClick={() => setDetallesClientesHub(prev => ({ ...prev, [sitio.hubId]: isExpandidoActivo ? null : 'ACTIVO' }))} className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${isExpandidoActivo ? 'bg-blue-900/30 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-slate-950 border-slate-900/60 hover:border-blue-500/30'}`}><p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">CLIENTES ACTIVOS</p><p className="text-3xl font-mono font-black text-white mt-1">{sitio.puertosActivos}</p></div>
                          <div onClick={() => setDetallesClientesHub(prev => ({ ...prev, [sitio.hubId]: isExpandidoSuspendido ? null : 'SUSPENDIDO' }))} className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${isExpandidoSuspendido ? 'bg-purple-900/30 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-slate-950 border-slate-900/60 hover:border-purple-500/30'}`}><p className="text-[11px] text-purple-500 font-bold uppercase tracking-widest">EN SUSPENSIÓN</p><p className="text-3xl font-mono font-black text-purple-400 mt-1">{sitio.puertosSuspendidos || 0}</p></div>
                        </div>
                        {tipoExpandido && (
                          <div className="mt-4 bg-[#0b132b] rounded-xl border border-slate-800 overflow-hidden shadow-inner"><div className={`px-4 py-2.5 text-[10px] font-black tracking-widest flex justify-between items-center ${tipoExpandido === 'SUSPENDIDO' ? 'bg-purple-950/60 text-purple-400 border-b border-purple-900/40' : 'bg-blue-950/60 text-blue-400 border-b border-blue-900/40'}`}><span>{tipoExpandido === 'SUSPENDIDO' ? '🔴 LISTA DE CLIENTES EN SUSPENSIÓN' : '🟢 LISTA DE CLIENTES ACTIVOS'}</span><span className="bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-slate-400">{tipoExpandido === 'SUSPENDIDO' ? listaClientesSuspendidos.filter(c => c.hubId === sitio.hubId).length : listaClientesActivos.filter(c => c.hubId === sitio.hubId).length} REGISTROS</span></div><div className="max-h-[250px] overflow-y-auto custom-scrollbar"><table className="w-full text-left text-xs text-slate-300 table-fixed"><thead className="bg-[#050814] text-slate-500 sticky top-0 border-b border-slate-800"><tr><th className="p-2.5 font-bold w-1/3">Cliente / Servicio</th><th className="p-2.5 font-bold w-1/3">IP Cliente</th><th className="p-2.5 font-bold w-1/3">Equipo / Interfaz</th></tr></thead><tbody className="divide-y divide-slate-800/40">{(tipoExpandido === 'SUSPENDIDO' ? listaClientesSuspendidos : listaClientesActivos).filter(c => c.hubId === sitio.hubId).map((c, i) => (<tr key={i} className="hover:bg-slate-800/30 transition-colors"><td className="p-2.5 font-semibold text-white truncate pr-2" title={c.SERVICIO || c.CLIENTE}>{c.SERVICIO || c.CLIENTE || '-'}</td><td className="p-2.5 font-mono text-[11px] text-slate-400 truncate">{c.IP_CLIENTE || '-'}</td><td className="p-2.5 font-mono text-[10px] truncate">{c.EQUIPO_HOTEL_ID}<br/><span className="text-slate-500">{c.PUERTO}</span></td></tr>))} {(tipoExpandido === 'SUSPENDIDO' ? listaClientesSuspendidos : listaClientesActivos).filter(c => c.hubId === sitio.hubId).length === 0 && (<tr><td colSpan="3" className="p-4 text-center text-slate-500 italic">No hay registros para mostrar.</td></tr>)}</tbody></table></div></div>
                        )}
                        <div className="space-y-1 pt-1"><div className="flex justify-between text-[11px] text-slate-400"><span>Capacidad de Carga Estimada (Backbone 40G)</span><span className="font-mono font-bold text-slate-300">{Math.round((sitio.anchoBandaTotal / 40000) * 100)}%</span></div><div className="w-full bg-slate-950 h-3 rounded-full border border-slate-900 p-0.5 overflow-hidden"><div className="bg-gradient-to-r from-blue-600 to-indigo-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((sitio.anchoBandaTotal / 40000) * 100))}%` }} /></div></div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}