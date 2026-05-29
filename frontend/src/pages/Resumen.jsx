import { useState, useEffect } from 'react';
import { Download, Edit2, Check, X, Zap } from 'lucide-react';

export default function Resumen({ estructuraGeografica }) {
  const [regionSelec, setRegionSelec] = useState(localStorage.getItem('mcm_res_reg') || '');
  const [ciudadSelec, setCiudadSelec] = useState(localStorage.getItem('mcm_res_cd') || '');
  
  const [stats, setStats] = useState({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, trafico_mbps: 0 });
  const [datosHubs, setDatosHubs] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estados para la capacidad de carga (Backbone)
  const [capacidadTotal, setCapacidadTotal] = useState('40G'); 
  const [editCapacidad, setEditCapacidad] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://mt-backend-2ox8.onrender.com';

  useEffect(() => { localStorage.setItem('mcm_res_reg', regionSelec); }, [regionSelec]);
  useEffect(() => { localStorage.setItem('mcm_res_cd', ciudadSelec); }, [ciudadSelec]);

  const cargarConfigCiudad = async (ciudad) => {
    try {
      const res = await fetch(`${API_URL}/api/config-ciudades/${encodeURIComponent(ciudad)}`);
      if (res.ok) {
        const json = await res.json();
        setCapacidadTotal(json.data?.ancho_banda_total || '40G');
      }
    } catch (e) { setCapacidadTotal('40G'); }
  };

  const procesarResumen = async () => {
    if (!regionSelec || !ciudadSelec) return;
    setCargando(true);
    await cargarConfigCiudad(ciudadSelec);

    try {
      const hubs = estructuraGeografica[regionSelec]?.ciudades?.[ciudadSelec]?.hubs || [];
      const promesas = hubs.map(h => fetch(`${API_URL}/api/hubs?id_hub=${h.id}`).then(res => res.json()));
      const resultados = await Promise.all(promesas);

      let global = { activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, trafico_mbps: 0 };
      let infoHubs = [];

      resultados.forEach(data => {
        if (!data?.puertos) return;
        const nombreHub = hubs.find(h => h.id === data.hub)?.nombre || data.hub;
        
        let subActivos = 0, subSusp = 0, subTroncal = 0, subDisp = 0;
        let subDispGi = 0, subTotalGi = 0;
        let subDispTe = 0, subTotalTe = 0;
        let subDisp25 = 0, subTotal25 = 0;
        let subDisp100 = 0, subTotal100 = 0;

        data.puertos.forEach(p => {
            const est = String(p.ESTATUS || '').toUpperCase().trim();
            const upperPto = String(p.PUERTO || '').toUpperCase();
            
            // 1. CLASIFICACIÓN INTELIGENTE DEL TIPO DE PUERTO
            let tipo = 'GI'; 
            if (est.includes('100') || upperPto.includes('100G') || upperPto.includes('HU')) tipo = '100G';
            else if (est.includes('25') || upperPto.includes('25G') || upperPto.includes('TWE')) tipo = '25G';
            else if (est.includes('TE') || upperPto.includes('10G') || upperPto.includes('XG')) tipo = 'TE';
            else if (est.includes('GI') || upperPto.includes('GE') || upperPto.includes('GIG')) tipo = 'GI';

            if (tipo === '100G') subTotal100++;
            else if (tipo === '25G') subTotal25++;
            else if (tipo === 'TE') subTotalTe++;
            else subTotalGi++;

            // 2. CLASIFICACIÓN POR ESTATUS
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
        });

        const totalPuertos = data.puertos.length;
        const pctLibres = totalPuertos > 0 ? ((subDisp / totalPuertos) * 100).toFixed(1) : 0;

        infoHubs.push({ 
          nombre: nombreHub, id: data.hub, 
          activos: subActivos, suspendidos: subSusp, troncales: subTroncal,
          total_disp: subDisp, pct_libres: pctLibres,
          disp_gi: subDispGi, total_gi: subTotalGi,
          disp_te: subDispTe, total_te: subTotalTe,
          disp_25: subDisp25, total_25: subTotal25,
          disp_100: subDisp100, total_100: subTotal100,
          total: totalPuertos
        });
      });

      setStats(global);
      setDatosHubs(infoHubs.sort((a,b) => b.total_disp - a.total_disp));
    } catch (e) { console.error(e); } finally { setCargando(false); }
  };

  useEffect(() => { procesarResumen(); }, [regionSelec, ciudadSelec]);

  const guardarCapacidad = async () => {
    setGuardando(true);
    try {
      const token = localStorage.getItem('mcm_token');
      const res = await fetch(`${API_URL}/api/config-ciudades/${encodeURIComponent(ciudadSelec)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ancho_banda_total: editCapacidad })
      });
      if (res.ok) { setCapacidadTotal(editCapacidad); setModoEdicion(false); }
    } catch (e) { alert("Error al guardar"); } finally { setGuardando(false); }
  };

  const mostrar25G = datosHubs.some(h => h.total_25 > 0);
  const mostrar100G = datosHubs.some(h => h.total_100 > 0);

  const exportarAExcelNativo = () => {
    if (datosHubs.length === 0) return;
    
    // Encabezados ordenados
    const headers = [
      'CIUDAD', 'NODO / HUB', 'ID NODO', 
      'DISPONIBLES GI', 'TOTAL GI', 'DISPONIBLES TE', 'TOTAL TE'
    ];
    if (mostrar25G) headers.push('DISPONIBLES 25G', 'TOTAL 25G');
    if (mostrar100G) headers.push('DISPONIBLES 100G', 'TOTAL 100G');
    
    headers.push(
      'ACTIVOS', 'SUSPENDIDOS', 'TRONCALES', 
      'TOTAL DISPONIBLES', '% LIBRES', 'TOTAL PUERTOS HUB', 
      'ANCHO BANDA BACKBONE', 'CONSUMO PLAZA (Gbps)'
    );

    const filas = datosHubs.map(h => {
      const row = [
        ciudadSelec, h.nombre, h.id, 
        h.disp_gi, h.total_gi, h.disp_te, h.total_te
      ];
      if (mostrar25G) row.push(h.disp_25, h.total_25);
      if (mostrar100G) row.push(h.disp_100, h.total_100);
      
      row.push(
        h.activos, h.suspendidos, h.troncales, 
        h.total_disp, `${h.pct_libres}%`, h.total, 
        capacidadTotal, (stats.trafico_mbps / 1000).toFixed(2)
      );
      return row;
    });

    const contenidoCSV = [
      headers.join(','),
      ...filas.map(fila => fila.map(campo => `"${campo}"`).join(','))
    ].join('\n');

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.setAttribute('href', url);
    enlace.setAttribute('download', `Reporte_Disponibilidad_${ciudadSelec}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).sort((a, b) => a.localeCompare(b));
  };

  const capacidadNum = parseFloat(capacidadTotal.replace(/[^0-9.]/g, '')) * (capacidadTotal.toUpperCase().includes('G') ? 1000 : 1);
  const traficoGbps = (stats.trafico_mbps / 1000).toFixed(2);
  const disponibilidadAnchoBanda = capacidadNum > 0 ? (((capacidadNum - stats.trafico_mbps) / capacidadNum) * 100).toFixed(1) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070b19]">
      <div className="bg-[#090f24] border-b border-slate-800/60 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
            <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); }} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 outline-none">
                <option value="" className="bg-[#0b132b]">-- REGIÓN --</option>
                {Object.keys(estructuraGeografica).map(r => <option key={r} value={r} className="bg-[#0b132b]">{r}</option>)}
            </select>
            <select value={ciudadSelec} onChange={(e) => setCiudadSelec(e.target.value)} disabled={!regionSelec} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 outline-none">
                <option value="" className="bg-[#0b132b]">-- CIUDAD --</option>
                {regionSelec && Object.keys(estructuraGeografica[regionSelec].ciudades).map(c => <option key={c} value={c} className="bg-[#0b132b]">{c}</option>)}
            </select>
        </div>
        {datosHubs.length > 0 && (
          <button onClick={exportarAExcelNativo} className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-lg cursor-pointer">
            <Download className="w-4 h-4" /> Exportar Reporte
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
        {cargando ? (
          <div className="flex justify-center items-center h-40 text-slate-500 font-mono text-sm">Calculando disponibilidad global...</div>
        ) : !ciudadSelec ? (
          <div className="flex justify-center items-center h-40 text-slate-500 italic text-sm">Seleccione Región y Ciudad para generar el resumen.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#0b132b] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                    <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/5" />
                    <p className="text-xs font-bold text-slate-500 mb-2">TRÁFICO TOTAL AGREGADO</p>
                    <p className="text-4xl font-black text-emerald-400">{traficoGbps} <span className="text-lg text-slate-500 font-normal">Gbps</span></p>
                    <p className="text-[10px] text-slate-500 mt-2">Suma de MBPS de puertos activos</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-800 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-bold text-slate-500 mb-2">PUERTOS DISPONIBLES</p>
                    <p className="text-4xl font-black text-blue-400">{stats.total_disp}</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-800 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-bold text-slate-500 mb-2">CLIENTES ACTIVOS</p>
                    <p className="text-4xl font-black text-white">{stats.activos}</p>
                </div>
                <div className="bg-[#0b132b] border border-slate-800 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-bold text-slate-500 mb-2">EN SUSPENSIÓN</p>
                    <p className="text-4xl font-black text-purple-500">{stats.suspendidos}</p>
                </div>
            </div>

            <div className="bg-[#0b132b]/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-white">Capacidad de Carga Estimada</h3>
                        <p className="text-xs text-slate-500">Configuración de Backbone por ciudad para cálculo de saturación.</p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4 min-w-[250px]">
                        <div className="flex-1 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Ancho de Banda Total</p>
                            {modoEdicion ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <input type="text" value={editCapacidad} onChange={e=>setEditCapacidad(e.target.value)} className="bg-[#1c2541] border border-blue-500 text-white font-mono text-xl font-black rounded px-2 w-24 text-center outline-none" autoFocus />
                                    <button onClick={guardarCapacidad} disabled={guardando} className="bg-emerald-600 p-1.5 rounded cursor-pointer"><Check className="w-4 h-4" /></button>
                                    <button onClick={()=>setModoEdicion(false)} className="bg-slate-700 p-1.5 rounded cursor-pointer"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 justify-center group">
                                    <p className="text-2xl font-black justify-center text-blue-400 font-mono">{capacidadTotal}</p>
                                    <button onClick={()=>{setEditCapacidad(capacidadTotal); setModoEdicion(true);}} className="text-slate-600 hover:text-blue-400 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <p className="text-xs font-bold text-slate-400">DISPONIBILIDAD DE ANCHO DE BANDA</p>
                        <p className="text-2xl font-black text-white">{disponibilidadAnchoBanda}%</p>
                    </div>
                    <div className="h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                        <div className={`h-full rounded-full transition-all duration-1000 ${parseFloat(disponibilidadAnchoBanda) < 20 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${disponibilidadAnchoBanda}%`}}></div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0b132b]/30 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-[#0b132b]">
                <h3 className="text-sm font-bold text-slate-200">Desglose de Disponibilidad por Nodo (HUB)</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-max w-full text-left text-xs text-slate-300 whitespace-nowrap">
                  <thead className="bg-[#050814] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4 font-bold tracking-wider">NODO / HUB</th>
                      
                      {/* GIGABIT */}
                      <th className="p-4 font-bold text-center bg-slate-900/40">DISP. (GI)</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/50 bg-slate-900/40">TOTAL (GI)</th>
                      
                      {/* TENGIGABIT */}
                      <th className="p-4 font-bold text-center bg-slate-900/20">DISP. (TE)</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/50 bg-slate-900/20">TOTAL (TE)</th>
                      
                      {/* 25G DINÁMICO */}
                      {mostrar25G && <th className="p-4 font-bold text-center bg-slate-900/40">DISP. (25G)</th>}
                      {mostrar25G && <th className="p-4 font-bold text-center border-r border-slate-800/50 bg-slate-900/40">TOTAL (25G)</th>}
                      
                      {/* 100G DINÁMICO */}
                      {mostrar100G && <th className="p-4 font-bold text-center bg-slate-900/20">DISP. (100G)</th>}
                      {mostrar100G && <th className="p-4 font-bold text-center border-r border-slate-800/50 bg-slate-900/20">TOTAL (100G)</th>}
                      
                      <th className="p-4 font-bold text-center text-emerald-500">ACTIVOS</th>
                      <th className="p-4 font-bold text-center text-purple-400">SUSPEND.</th>
                      <th className="p-4 font-bold text-center text-amber-400">TRONCALES</th>

                      {/* COLUMNAS AL FINAL COMO SE SOLICITÓ */}
                      <th className="p-4 font-bold text-center border-l border-slate-800/50 text-blue-400">TOTAL DISP.</th>
                      <th className="p-4 font-bold text-center text-emerald-400">LIBRES %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {datosHubs.length === 0 ? (
                      <tr><td colSpan="13" className="p-8 text-center text-slate-500 italic">No hay nodos registrados en esta ciudad.</td></tr>
                    ) : (
                      datosHubs.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-slate-200">{h.nombre}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{h.id}</p>
                          </td>

                          <td className="p-4 text-center bg-slate-900/40">{h.disp_gi}</td>
                          <td className="p-4 text-center border-r border-slate-800/50 bg-slate-900/40 text-slate-400 font-bold">{h.total_gi}</td>

                          <td className="p-4 text-center bg-slate-900/20">{h.disp_te}</td>
                          <td className="p-4 text-center border-r border-slate-800/50 bg-slate-900/20 text-slate-400 font-bold">{h.total_te}</td>

                          {mostrar25G && <td className="p-4 text-center bg-slate-900/40">{h.disp_25}</td>}
                          {mostrar25G && <td className="p-4 text-center border-r border-slate-800/50 bg-slate-900/40 text-slate-400 font-bold">{h.total_25}</td>}

                          {mostrar100G && <td className="p-4 text-center bg-slate-900/20">{h.disp_100}</td>}
                          {mostrar100G && <td className="p-4 text-center border-r border-slate-800/50 bg-slate-900/20 text-slate-400 font-bold">{h.total_100}</td>}

                          <td className="p-4 text-center text-emerald-400 font-medium">{h.activos}</td>
                          <td className="p-4 text-center text-purple-400 font-medium">{h.suspendidos}</td>
                          <td className="p-4 text-center text-amber-400 font-medium">{h.troncales}</td>

                          {/* COLUMNAS AL FINAL */}
                          <td className="p-4 text-center border-l border-slate-800/50">
                            <span className={`px-2.5 py-1 rounded-full font-black ${h.total_disp > 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800/50 text-slate-500'}`}>
                              {h.total_disp}
                            </span>
                          </td>
                          <td className="p-4 text-center font-black text-emerald-400">
                            {h.pct_libres}%
                          </td>
                        </tr>
                      ))
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