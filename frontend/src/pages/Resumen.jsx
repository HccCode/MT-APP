import { useState, useEffect } from 'react';
import { Download, Edit2, Check, X, Zap, AlertTriangle, Activity, Server, ShieldCheck, Thermometer, MapPin, SlidersHorizontal, Radio, Wifi } from 'lucide-react';

export default function Resumen({ token, estructuraGeografica, puedeEditar, esAdmin }) {
  // --- ESTADOS MAESTROS ---
  const [regionSelec, setRegionSelec] = useState(() => esAdmin ? (localStorage.getItem('mcm_res_reg') || '') : '');
  const [ciudadSelec, setCiudadSelec] = useState(() => esAdmin ? (localStorage.getItem('mcm_res_cd') || '') : '');
  const [tabActiva, setTabActiva] = useState('fibra'); // 'fibra' | 'microondas'
  const [cargando, setCargando] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // --- ESTADOS FIBRA ÓPTICA ---
  const [sitioCalorFiltro, setSitioCalorFiltro] = useState('TODOS');
  const [statsFibra, setStatsFibra] = useState({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, trafico_mbps: 0 });
  const [datosHubs, setDatosHubs] = useState([]);
  const [datosChasis, setDatosChasis] = useState([]);
  const [capacidadTotal, setCapacidadTotal] = useState('40G'); 
  const [editCapacidad, setEditCapacidad] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // --- ESTADOS MICROONDAS ---
  const [filtroRb, setFiltroRb] = useState('TODAS'); 
  const [statsMw, setStatsMw] = useState({ rbs: 0, aps: 0, enlaces: 0, activos: 0, suspendidos: 0, fallas: 0 });
  const [datosRBs, setDatosRBs] = useState([]);

  // Persistencia y Forzado de Región
  useEffect(() => {
    if (!esAdmin && !regionSelec && estructuraGeografica && Object.keys(estructuraGeografica).length > 0) {
      setRegionSelec(Object.keys(estructuraGeografica)[0]);
    }
  }, [esAdmin, estructuraGeografica, regionSelec]);

  useEffect(() => { localStorage.setItem('mcm_res_reg', regionSelec); }, [regionSelec]);
  useEffect(() => { localStorage.setItem('mcm_res_cd', ciudadSelec); }, [ciudadSelec]);
  
  // Limpiar los filtros secundarios al cambiar de ciudad
  useEffect(() => { 
      setSitioCalorFiltro('TODOS'); 
      setFiltroRb('TODAS'); 
  }, [ciudadSelec]);

  // ================= LÓGICA FIBRA ÓPTICA =================
  const limpiarNombreSitio = (nombreRaw) => {
    if (!nombreRaw) return '';
    return String(nombreRaw).replace(/^[0-9]+_/, '').replace(/_[0-9]+(:[0-9]+)?$/, '').replace(/_/g, ' ').trim();
  };

  const cargarConfigCiudad = async (ciudad) => {
    try {
      const res = await fetch(`${API_URL}/api/config-ciudades/${encodeURIComponent(ciudad)}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) setCapacidadTotal((await res.json()).data?.ancho_banda_total || '40G');
    } catch (e) { setCapacidadTotal('40G'); }
  };

  const procesarResumenFibra = async () => {
    if (!regionSelec || !ciudadSelec) return;
    setCargando(true);
    await cargarConfigCiudad(ciudadSelec);

    try {
      const hubs = estructuraGeografica[regionSelec]?.ciudades?.[ciudadSelec]?.hubs || [];
      const promesas = hubs.map(h => fetch(`${API_URL}/api/hubs?id_hub=${h.id}`, { headers: { 'Authorization': `Bearer ${token}` }}).then(res => res.json()));
      const resultados = await Promise.all(promesas);

      let global = { activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, trafico_mbps: 0 };
      let infoHubs = [];
      let mapChasis = {}; 

      resultados.forEach(data => {
        if (!data?.puertos) return;
        const nombreHub = hubs.find(h => h.id === data.hub)?.nombre || data.hub;
        
        let subActivos = 0, subSusp = 0, subTroncal = 0, subDisp = 0;
        let subDispGi = 0, subTotalGi = 0, subDispTe = 0, subTotalTe = 0;
        let subDisp25 = 0, subTotal25 = 0, subDisp100 = 0, subTotal100 = 0;

        data.puertos.forEach(p => {
            const est = String(p.ESTATUS || '').toUpperCase().trim();
            const upperPto = String(p.PUERTO || '').toUpperCase();
            
            let tipo = 'GI'; 
            if (est.includes('100') || upperPto.includes('100G') || upperPto.includes('HU')) tipo = '100G';
            else if (est.includes('25') || upperPto.includes('25G') || upperPto.includes('TWE')) tipo = '25G';
            else if (est.includes('TE') || upperPto.includes('10G') || upperPto.includes('XG')) tipo = 'TE';

            if (tipo === '100G') subTotal100++;
            else if (tipo === '25G') subTotal25++;
            else if (tipo === 'TE') subTotalTe++;
            else subTotalGi++;

            const isDisp = est.includes('DISPONIBLE');

            if (est === 'ACTIVO') {
                global.activos++; subActivos++;
                const mbps = parseFloat(String(p.MBPS || '0').replace(/[^0-9.]/g, ''));
                global.trafico_mbps += isNaN(mbps) ? 0 : mbps;
            }
            else if (est === 'SUSPENDIDO') { global.suspendidos++; subSusp++; }
            else if (est.includes('TRONCAL')) { global.troncales++; subTroncal++; }

            if (isDisp) {
                global.total_disp++; subDisp++;
                if (tipo === '100G') subDisp100++;
                else if (tipo === '25G') subDisp25++;
                else if (tipo === 'TE') { global.disp_te++; subDispTe++; }
                else { global.disp_gi++; subDispGi++; }
            }

            const chasisRaw = String(p.EQUIPO_HOTEL_ID || '').trim();
            const idAgrupacion = (chasisRaw && chasisRaw !== '-' && chasisRaw.toLowerCase() !== 'null') ? chasisRaw : "CHASIS PRINCIPAL";

            if (!mapChasis[idAgrupacion]) {
                mapChasis[idAgrupacion] = { id: idAgrupacion, equipo: idAgrupacion, hub: nombreHub, hub_id: data.hub, total: 0, disp: 0, activos: 0 };
            }
            mapChasis[idAgrupacion].total++;
            if (isDisp) mapChasis[idAgrupacion].disp++;
            if (est === 'ACTIVO') mapChasis[idAgrupacion].activos++;
        });
        
        const totalPuertos = data.puertos.length;
        const pctLibres = totalPuertos > 0 ? ((subDisp / totalPuertos) * 100).toFixed(1) : 0;

        infoHubs.push({ 
          nombre: nombreHub, id: data.hub, 
          activos: subActivos, suspendidos: subSusp, troncales: subTroncal,
          total_disp: subDisp, pct_libres: pctLibres,
          disp_gi: subDispGi, total_gi: subTotalGi, disp_te: subDispTe, total_te: subTotalTe,
          disp_25: subDisp25, total_25: subTotal25, disp_100: subDisp100, total_100: subTotal100, total: totalPuertos
        });
      });

      const arrChasis = Object.values(mapChasis).map(c => {
          c.pct_libres = c.total > 0 ? ((c.disp / c.total) * 100).toFixed(1) : 0;
          return c;
      }).sort((a, b) => parseFloat(a.pct_libres) - parseFloat(b.pct_libres));

      setStatsFibra(global);
      setDatosHubs(infoHubs.sort((a,b) => b.total_disp - a.total_disp));
      setDatosChasis(arrChasis);

    } catch (e) { console.error(e); } finally { setCargando(false); }
  };

  // ================= LÓGICA MICROONDAS =================
  const procesarResumenMicroondas = async () => {
    if (!regionSelec || !ciudadSelec) return;
    setCargando(true);
    try {
        const [resEnl, resRb, resAp] = await Promise.all([
            fetch(`${API_URL}/api/microondas?ciudad=${encodeURIComponent(ciudadSelec)}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/microondas/radiobases`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/microondas/accesspoints`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const enlacesAll = resEnl.ok ? (await resEnl.json()).data : [];
        const rbsAll = resRb.ok ? (await resRb.json()).data : [];
        const apsAll = resAp.ok ? (await resAp.json()).data : [];

        // Filtrar contexto por ciudad
        const rbsCiudad = rbsAll.filter(rb => String(rb.ciudad).toUpperCase() === String(ciudadSelec).toUpperCase());
        const rbIds = rbsCiudad.map(rb => rb.id);
        const apsCiudad = apsAll.filter(ap => rbIds.includes(ap.radio_base_id));
        
        let eActivos = 0, eSusp = 0, eFallas = 0;
        enlacesAll.forEach(e => {
            if(e.estatus === 'ACTIVO') eActivos++;
            else if(e.estatus === 'SUSPENDIDO') eSusp++;
            else eFallas++; // CAÍDO / FALLA
        });

        setStatsMw({
            rbs: rbsCiudad.length,
            aps: apsCiudad.length,
            enlaces: enlacesAll.length,
            activos: eActivos,
            suspendidos: eSusp,
            fallas: eFallas
        });

        // Radiografía por Radio Base
        const rbStats = rbsCiudad.map(rb => {
            const apsEnRb = apsCiudad.filter(ap => ap.radio_base_id === rb.id);
            const apIds = apsEnRb.map(ap => ap.id);
            const enlacesEnRb = enlacesAll.filter(e => apIds.includes(e.ap_id));
            
            let act = 0, susp = 0, fallas = 0;
            enlacesEnRb.forEach(e => {
                if(e.estatus === 'ACTIVO') act++;
                else if(e.estatus === 'SUSPENDIDO') susp++;
                else fallas++;
            });

            return {
                id: rb.id,
                nombre: rb.nombre,
                coordenadas: rb.coordenadas,
                altura: rb.altura_torre,
                total_aps: apsEnRb.length,
                total_enlaces: enlacesEnRb.length,
                activos: act,
                suspendidos: susp,
                fallas: fallas
            };
        });

        setDatosRBs(rbStats.sort((a,b) => b.total_enlaces - a.total_enlaces));
    } catch(e) { console.error(e); } finally { setCargando(false); }
  };

  // --- TRIGGER DE CARGA SEGÚN PESTAÑA ---
  useEffect(() => { 
    if (tabActiva === 'fibra') procesarResumenFibra(); 
    else procesarResumenMicroondas();
  }, [regionSelec, ciudadSelec, tabActiva]);

  // --- VARIABLES DERIVADAS DE FIBRA ---
  const guardarCapacidad = async () => {
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/config-ciudades/${encodeURIComponent(ciudadSelec)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ ancho_banda_total: editCapacidad })
      });
      if (res.ok) { setCapacidadTotal(editCapacidad); setModoEdicion(false); }
    } catch (e) { alert("Error al guardar"); } finally { setGuardando(false); }
  };

  const capacidadNum = parseFloat(capacidadTotal.replace(/[^0-9.]/g, '')) * (capacidadTotal.toUpperCase().includes('G') ? 1000 : 1);
  const traficoGbps = (statsFibra.trafico_mbps / 1000).toFixed(2);
  const disponibilidadAnchoBanda = capacidadNum > 0 ? (((capacidadNum - statsFibra.trafico_mbps) / capacidadNum) * 100).toFixed(1) : 0;

  const mostrar25G = datosHubs.some(h => h.total_25 > 0);
  const mostrar100G = datosHubs.some(h => h.total_100 > 0);

  const alertas = [];
  if (ciudadSelec && !cargando && tabActiva === 'fibra') {
    if (parseFloat(disponibilidadAnchoBanda) < 15 && capacidadNum > 0) {
      alertas.push({ id: 'bw-critico', tipo: 'CRÍTICA', msg: `Saturación de Backbone en ${ciudadSelec}. El tráfico agregado superó el 85% de la capacidad de ${capacidadTotal}.` });
    }
    datosHubs.forEach(h => {
      if (parseFloat(h.pct_libres) < 15 && h.total > 0) {
        alertas.push({ id: `hub-${h.id}`, tipo: 'ADVERTENCIA', msg: `Nivel crítico en nodo ${limpiarNombreSitio(h.nombre)}. Solo ${h.total_disp} libre(s) (${h.pct_libres}%).` });
      }
    });
  }

  const chasisFiltradosParaCalor = datosChasis.filter(c => sitioCalorFiltro === 'TODOS' || c.hub_id === sitioCalorFiltro);
  
  // FILTRADO DE LA TABLA DE RADIO BASES
  const rbsFiltradasParaTabla = datosRBs.filter(rb => {
      if (filtroRb === 'TODAS') return true;
      return String(rb.id) === String(filtroRb);
  });

  const generarUrlMaps = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  const exportarResumenExcel = async () => {
    if (datosHubs.length === 0) return;
    setCargando(true);
    
    const payload = {
        ciudad: ciudadSelec, capacidad_total: capacidadTotal, trafico_gbps: traficoGbps, disponibilidad_pct: String(disponibilidadAnchoBanda),
        stats_activos: statsFibra.activos, stats_suspendidos: statsFibra.suspendidos, stats_troncales: statsFibra.troncales, stats_total_disp: statsFibra.total_disp,
        hubs: datosHubs.map(h => ({
            nombre: limpiarNombreSitio(h.nombre), id: h.id, 
            disp_gi: h.disp_gi, total_gi: h.total_gi, disp_te: h.disp_te, total_te: h.total_te, disp_25: h.disp_25, total_25: h.total_25, disp_100: h.disp_100, total_100: h.total_100,
            activos: h.activos, suspendidos: h.suspendidos, troncales: h.troncales, total_disp: h.total_disp, pct_libres: String(h.pct_libres), total: h.total
        }))
    };

    try {
        const res = await fetch(`${API_URL}/api/resumen/exportar-excel`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Fallo en descarga");
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = downloadUrl; a.download = `Resumen_Nodos_${ciudadSelec.replace(/\s+/g, '_')}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(downloadUrl);
    } catch (e) { alert("Fallo al exportar el reporte."); } finally { setCargando(false); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070b19]">
      
      {/* 1. HEADER Y SELECTOR MAESTRO */}
      <div className="bg-[#090f24] border-b border-slate-800/60 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <ShieldCheck className="w-5 h-5 text-indigo-500 hidden md:block" />
            <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); }} className="bg-[#0b132b] border border-slate-700 px-3 py-1.5 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors w-full md:w-auto">
                <option value="" className="text-slate-500">-- REGIÓN --</option>
                {Object.keys(estructuraGeografica || {}).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="text-indigo-600/50">➔</span>
            <select value={ciudadSelec} onChange={(e) => setCiudadSelec(e.target.value)} disabled={!regionSelec} className="bg-[#0b132b] border border-slate-700 px-3 py-1.5 rounded-md text-sm text-indigo-300 font-bold outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors w-full md:w-auto">
                <option value="" className="text-slate-500">-- CIUDAD --</option>
                {regionSelec && Object.keys(estructuraGeografica[regionSelec]?.ciudades || {}).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        
        {tabActiva === 'fibra' && datosHubs.length > 0 && (
          <button onClick={exportarResumenExcel} disabled={cargando} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 border border-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50">
            <Download className="w-4 h-4" /> Reporte Gerencial
          </button>
        )}
      </div>

      {/* 2. MENÚ DE PESTAÑAS TECNOLÓGICAS */}
      <div className="bg-[#0b132b]/60 border-b border-slate-800/80 p-3 flex gap-2 shrink-0 justify-center sm:justify-start px-6">
        <button onClick={() => setTabActiva('fibra')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${tabActiva==='fibra' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#050814] text-slate-400 hover:text-white border border-slate-800'}`}>
          <Server className="w-4 h-4"/> Nodos y Fibra Óptica
        </button>
        <button onClick={() => setTabActiva('microondas')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${tabActiva==='microondas' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-[#050814] text-slate-400 hover:text-white border border-slate-800'}`}>
          <Radio className="w-4 h-4"/> Topología Microondas
        </button>
      </div>

      {/* 3. ÁREA DE CONTENIDO */}
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 custom-scrollbar">
        {cargando ? (
          <div className="flex justify-center items-center h-40 text-indigo-500 font-mono text-sm animate-pulse">Escaneando red y calculando telemetría...</div>
        ) : !ciudadSelec ? (
          <div className="flex flex-col justify-center items-center h-40 text-slate-600 italic text-sm">
            <Activity className="w-8 h-8 mb-2 stroke-1" />
            Seleccione Región y Ciudad para generar la radiografía.
          </div>
        ) : tabActiva === 'fibra' ? (
          /* ==================================================== */
          /* ================= VISTA FIBRA ÓPTICA ================= */
          /* ==================================================== */
          <>
            {alertas.length > 0 && (
              <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-4 flex flex-col gap-3 shadow-lg mb-2 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                    <h3 className="text-sm font-black text-red-400 uppercase tracking-widest">Alertas Físicas Detectadas</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {alertas.map((al) => (
                        <div key={al.id} className={`p-3 rounded-lg border flex items-start gap-3 shadow-md ${al.tipo === 'CRÍTICA' ? 'bg-red-900/20 border-red-800/50 text-red-200' : 'bg-amber-900/20 border-amber-800/50 text-amber-200'}`}>
                           {al.tipo === 'CRÍTICA' ? <Activity className="w-4 h-4 mt-0.5 text-red-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />}
                           <p className="text-[11px] font-medium leading-relaxed">{al.msg}</p>
                        </div>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl relative overflow-hidden shadow-lg col-span-2 md:col-span-1">
                    <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/10" />
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Tráfico Agregado</p>
                    <p className="text-3xl md:text-4xl font-black text-emerald-400">{traficoGbps} <span className="text-base text-slate-500 font-normal">Gbps</span></p>
                    <p className="text-[9px] text-slate-500 mt-2 font-mono">Consumo Real Time</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg">
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Disponibles</p>
                    <p className="text-3xl md:text-4xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">{statsFibra.total_disp}</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg">
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Activos</p>
                    <p className="text-3xl md:text-4xl font-black text-white">{statsFibra.activos}</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg">
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">En Suspensión</p>
                    <p className="text-3xl md:text-4xl font-black text-purple-400">{statsFibra.suspendidos}</p>
                </div>
            </div>

            <div className="bg-[#0b132b]/50 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6 relative z-10">
                    <div>
                        <h3 className="text-sm font-black text-white tracking-wide uppercase">Capacidad Backbone</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Configuración del anillo para el cálculo de saturación.</p>
                    </div>
                    <div className="bg-[#050814]/80 p-3 md:p-4 rounded-xl border border-slate-700/50 flex items-center gap-4 w-full md:min-w-[250px] shadow-inner">
                        <div className="flex-1 text-right">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Capacidad Declarada</p>
                            {modoEdicion ? (
                                <div className="flex items-center gap-2 justify-end">
                                    <input type="text" value={editCapacidad} onChange={e=>setEditCapacidad(e.target.value)} className="bg-[#1c2541] border border-indigo-500 text-white font-mono text-xl font-black rounded px-2 w-24 text-right outline-none shadow-[0_0_10px_rgba(99,102,241,0.2)]" autoFocus />
                                    <button onClick={guardarCapacidad} disabled={guardando} className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded transition-colors"><Check className="w-4 h-4" /></button>
                                    <button onClick={()=>setModoEdicion(false)} className="bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 justify-end group">
                                    <p className="text-2xl font-black text-indigo-400 font-mono">{capacidadTotal}</p>
                                    {puedeEditar && (
                                        <button onClick={()=>{setEditCapacidad(capacidadTotal); setModoEdicion(true);}} className="text-slate-600 hover:text-indigo-400 transition-colors p-1 bg-slate-800 rounded">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Ancho de Banda Libre</p>
                        <p className="text-xl font-black text-white">{disponibilidadAnchoBanda}%</p>
                    </div>
                    <div className="h-3 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${parseFloat(disponibilidadAnchoBanda) < 15 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`} style={{width: `${disponibilidadAnchoBanda}%`}}></div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0b132b]/80 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-6 mt-6">
              <div className="p-5 border-b border-slate-800/80 bg-[#050814]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2"><Thermometer className="w-4 h-4 text-orange-500" /> Mapa de Calor Operativo (Por Equipo)</h3>
                <div className="flex items-center gap-2 bg-[#0b132b] border border-slate-700 px-3 py-1.5 rounded-lg w-full sm:w-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <select value={sitioCalorFiltro} onChange={(e) => setSitioCalorFiltro(e.target.value)} className="bg-transparent text-xs text-indigo-300 font-bold outline-none cursor-pointer w-full sm:w-auto">
                        <option value="TODOS" className="bg-[#0b132b] text-white">-- TODOS LOS SITIOS --</option>
                        {datosHubs.map(h => <option key={h.id} value={h.id} className="bg-[#0b132b] text-white">{limpiarNombreSitio(h.nombre)}</option>)}
                    </select>
                </div>
              </div>
              
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 bg-[#050814]/30">
                  {chasisFiltradosParaCalor.length === 0 ? (
                      <div className="col-span-full p-8 text-center text-slate-500 italic">No hay chasis aprovisionados que coincidan con la selección geográfica.</div>
                  ) : (
                      chasisFiltradosParaCalor.map((c, i) => {
                          const pct = parseFloat(c.pct_libres);
                          const ocupacion = 100 - Math.round(pct);
                          const isCrit = pct < 15;
                          const isWarn = pct < 30;
                          
                          const colorClass = isCrit ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isWarn ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-emerald-950/10 border-emerald-500/30';
                          const textClass = isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-emerald-400';
                          const barClass = isCrit ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500';

                          return (
                              <div key={i} className={`p-4 rounded-xl border flex flex-col gap-3 transition-transform hover:scale-[1.02] ${colorClass}`}>
                                  <div className="flex justify-between items-start">
                                      <div className="overflow-hidden pr-2">
                                          <p className="font-black text-white text-sm truncate" title={c.equipo}>{c.equipo}</p>
                                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate"><MapPin className="w-3 h-3 shrink-0"/> {c.hub}</p>
                                      </div>
                                      <div className={`px-2 py-1 rounded font-black text-[10px] shrink-0 ${isCrit ? 'bg-red-500/20 text-red-400' : isWarn ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                          {pct}% Libre
                                      </div>
                                  </div>
                                  <div className="mt-1">
                                      <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-slate-400">DISPONIBLES</span><span className={textClass}>{c.disp} / {c.total}</span></div>
                                      <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden border border-slate-800/50">
                                          <div className={`h-full ${barClass} transition-all duration-1000`} style={{ width: `${ocupacion}%` }}></div>
                                      </div>
                                  </div>
                                  <div className="flex justify-between items-center mt-1 border-t border-slate-800/50 pt-2">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ocupación Fís.</span>
                                      <span className={`text-[10px] font-mono font-bold ${isCrit ? 'text-red-300' : 'text-slate-300'}`}>{ocupacion}% Ocupado</span>
                                  </div>
                              </div>
                          )
                      })
                  )}
              </div>
            </div>

            <div className="bg-[#0b132b]/80 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 mt-6">
              <div className="p-5 border-b border-slate-800/80 bg-[#050814]/50">
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2"><Server className="w-4 h-4 text-indigo-500" /> Radiografía por HUB / NODO</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-max w-full text-left text-xs text-slate-300 whitespace-nowrap">
                  <thead className="bg-[#050814] text-slate-400 border-b border-slate-800/80">
                    <tr>
                      <th className="p-4 font-black tracking-widest">SITE (NODO)</th>
                      <th className="p-4 font-bold text-center bg-slate-900/30 text-[10px] tracking-wider">DISP (1G)</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/30 bg-slate-900/30 text-[10px] tracking-wider">TOT (1G)</th>
                      <th className="p-4 font-bold text-center bg-slate-900/10 text-[10px] tracking-wider">DISP (10G)</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/30 bg-slate-900/10 text-[10px] tracking-wider">TOT (10G)</th>
                      {mostrar25G && <th className="p-4 font-bold text-center bg-slate-900/30 text-[10px] tracking-wider">DISP (25G)</th>}
                      {mostrar25G && <th className="p-4 font-bold text-center border-r border-slate-800/30 bg-slate-900/30 text-[10px] tracking-wider">TOT (25G)</th>}
                      {mostrar100G && <th className="p-4 font-bold text-center bg-slate-900/10 text-[10px] tracking-wider">DISP (100G)</th>}
                      {mostrar100G && <th className="p-4 font-bold text-center border-r border-slate-800/30 bg-slate-900/10 text-[10px] tracking-wider">TOT (100G)</th>}
                      <th className="p-4 font-bold text-center text-emerald-500 text-[10px] tracking-wider">ACT</th>
                      <th className="p-4 font-bold text-center text-purple-400 text-[10px] tracking-wider">SUSP</th>
                      <th className="p-4 font-bold text-center text-amber-400 text-[10px] tracking-wider">TRNK</th>
                      <th className="p-4 font-black text-center border-l border-slate-800/50 text-blue-400 tracking-wider">LIBRES</th>
                      <th className="p-4 font-black text-left text-indigo-400 tracking-wider w-48">OCUPACIÓN FÍSICA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {datosHubs.length === 0 ? (
                      <tr><td colSpan="14" className="p-12 text-center text-slate-500 italic font-medium">No hay hardware aprovisionado en esta ciudad.</td></tr>
                    ) : (
                      datosHubs.map((h, i) => {
                        const porcentajeLibre = parseFloat(h.pct_libres);
                        const porcentajeOcupado = 100 - Math.round(porcentajeLibre);
                        const esCritico = porcentajeLibre < 15;
                        const esPeligro = porcentajeLibre < 30;

                        return (
                        <tr key={i} className={`hover:bg-slate-800/30 transition-colors ${esCritico ? 'bg-red-950/10' : ''}`}>
                          <td className="p-4"><p className="font-bold text-slate-200">{limpiarNombreSitio(h.nombre)}</p></td>
                          <td className="p-4 text-center bg-slate-900/30 text-slate-300 font-medium">{h.disp_gi}</td>
                          <td className="p-4 text-center border-r border-slate-800/30 bg-slate-900/30 text-slate-500 font-bold">{h.total_gi}</td>
                          <td className="p-4 text-center bg-slate-900/10 text-slate-300 font-medium">{h.disp_te}</td>
                          <td className="p-4 text-center border-r border-slate-800/30 bg-slate-900/10 text-slate-500 font-bold">{h.total_te}</td>
                          {mostrar25G && <td className="p-4 text-center bg-slate-900/30 text-slate-300 font-medium">{h.disp_25}</td>}
                          {mostrar25G && <td className="p-4 text-center border-r border-slate-800/30 bg-slate-900/30 text-slate-500 font-bold">{h.total_25}</td>}
                          {mostrar100G && <td className="p-4 text-center bg-slate-900/10 text-slate-300 font-medium">{h.disp_100}</td>}
                          {mostrar100G && <td className="p-4 text-center border-r border-slate-800/30 bg-slate-900/10 text-slate-500 font-bold">{h.total_100}</td>}
                          <td className="p-4 text-center text-emerald-400/80 font-medium">{h.activos}</td>
                          <td className="p-4 text-center text-purple-400/80 font-medium">{h.suspendidos}</td>
                          <td className="p-4 text-center text-amber-400/80 font-medium">{h.troncales}</td>
                          <td className="p-4 text-center border-l border-slate-800/50">
                            <span className={`px-2.5 py-1 rounded-full font-black text-[11px] ${h.total_disp > 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm' : 'bg-slate-800/50 text-slate-500'}`}>
                              {h.total_disp}
                            </span>
                          </td>
                          <td className="p-4 w-48">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-slate-900/80 rounded-full overflow-hidden shadow-inner border border-slate-800/50">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${esCritico ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : esPeligro ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${porcentajeOcupado}%` }}></div>
                                </div>
                                <span className={`font-bold text-[10px] w-10 text-right tracking-widest ${esCritico ? 'text-red-400' : esPeligro ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {porcentajeLibre}%
                                </span>
                            </div>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* ==================================================== */
          /* ================ VISTA MICROONDAS ================== */
          /* ==================================================== */
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg">
                    <Radio className="w-8 h-8 text-emerald-500/50 mb-2" />
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Radio Bases Físicas</p>
                    <p className="text-3xl md:text-4xl font-black text-emerald-400">{statsMw.rbs}</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg">
                    <Wifi className="w-8 h-8 text-blue-500/50 mb-2" />
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Sectores / APs Emitiendo</p>
                    <p className="text-3xl md:text-4xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">{statsMw.aps}</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">CPEs Activos</p>
                    <p className="text-3xl md:text-4xl font-black text-white">{statsMw.activos}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">De {statsMw.enlaces} Enlaces Totales</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg">
                    <p className="text-[10px] md:text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Caídos / Fallas</p>
                    <p className={`text-3xl md:text-4xl font-black ${statsMw.fallas > 0 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>{statsMw.fallas}</p>
                </div>
            </div>

            <div className="bg-[#0b132b]/80 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 mt-6">
              <div className="p-5 border-b border-slate-800/80 bg-[#050814]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" /> Radiografía por Radio Base (Microondas)
                </h3>
                
                <div className="flex items-center gap-2 bg-[#0b132b] border border-slate-700 px-3 py-1.5 rounded-lg w-full sm:w-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <select value={filtroRb} onChange={(e) => setFiltroRb(e.target.value)} className="bg-transparent text-xs text-indigo-300 font-bold outline-none cursor-pointer w-full sm:w-auto">
                        <option value="TODAS" className="bg-[#0b132b] text-white">-- TODAS LAS RADIO BASES --</option>
                        {datosRBs.map(rb => <option key={rb.id} value={rb.id} className="bg-[#0b132b] text-white">{rb.nombre}</option>)}
                    </select>
                </div>
                
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-max w-full text-left text-xs text-slate-300 whitespace-nowrap">
                  <thead className="bg-[#050814] text-slate-400 border-b border-slate-800/80">
                    <tr>
                      <th className="p-4 font-black tracking-widest">SITIO / TORRE</th>
                      <th className="p-4 font-bold text-[10px] tracking-wider text-slate-500">COORDENADAS</th>
                      <th className="p-4 font-bold text-[10px] tracking-wider text-slate-500 border-r border-slate-800/50">ALTURA</th>
                      <th className="p-4 font-black text-center text-blue-400 text-[10px] tracking-wider">TOTAL SECTORES (APs)</th>
                      <th className="p-4 font-black text-center text-emerald-400 text-[10px] tracking-wider border-r border-slate-800/50">CLIENTES ASOCIADOS</th>
                      <th className="p-4 font-bold text-center text-emerald-500 text-[10px] tracking-wider">ACTIVOS</th>
                      <th className="p-4 font-bold text-center text-purple-400 text-[10px] tracking-wider">SUSPENDIDOS</th>
                      <th className="p-4 font-bold text-center text-red-500 text-[10px] tracking-wider">FALLAS / CAÍDOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {datosRBs.length === 0 ? (
                      <tr><td colSpan="8" className="p-12 text-center text-slate-500 italic font-medium">No hay Radio Bases registradas en esta ciudad.</td></tr>
                    ) : (
                      rbsFiltradasParaTabla.length === 0 ? (
                        <tr><td colSpan="8" className="p-12 text-center text-slate-500 italic font-medium">La Radio Base seleccionada no tiene equipos asociados.</td></tr>
                      ) : (
                        rbsFiltradasParaTabla.map((rb, i) => (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4"><p className="font-bold text-slate-200">{rb.nombre}</p></td>
                            <td className="p-4 font-mono text-[11px]">
                               {rb.coordenadas ? (
                                   <a 
                                     href={generarUrlMaps(rb.coordenadas)} 
                                     target="_blank" 
                                     rel="noreferrer" 
                                     className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 w-max"
                                     onClick={(e) => e.stopPropagation()}
                                   >
                                       <MapPin className="w-3 h-3" /> {rb.coordenadas}
                                   </a>
                               ) : (
                                   <span className="text-amber-500/80">-</span>
                               )}
                            </td>
                            <td className="p-4 text-slate-400 border-r border-slate-800/50">{rb.altura || '-'}</td>
                            <td className="p-4 text-center font-bold text-blue-300 text-sm bg-blue-900/10">{rb.total_aps}</td>
                            <td className="p-4 text-center font-black text-emerald-300 text-sm border-r border-slate-800/50 bg-emerald-900/10">{rb.total_enlaces}</td>
                            <td className="p-4 text-center text-emerald-500/80 font-bold">{rb.activos}</td>
                            <td className="p-4 text-center text-purple-400/80 font-bold">{rb.suspendidos}</td>
                            <td className="p-4 text-center font-bold">
                               {rb.fallas > 0 ? <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">{rb.fallas}</span> : <span className="text-slate-600">-</span>}
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}