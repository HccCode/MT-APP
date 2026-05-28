import { useState, useEffect } from 'react';
import { Download, Edit2, Check, X, Zap } from 'lucide-react';

export default function Resumen({ estructuraGeografica }) {
  const [regionSelec, setRegionSelec] = useState(localStorage.getItem('mcm_res_reg') || '');
  const [ciudadSelec, setCiudadSelec] = useState(localStorage.getItem('mcm_res_cd') || '');
  
  const [stats, setStats] = useState({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, pct_disp: 0, trafico_mbps: 0 });
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
    if (!regionSelec || !ciudadSelec) {
      setStats({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, pct_disp: 0, trafico_mbps: 0 });
      setDatosHubs([]);
      return;
    }

    setCargando(true);
    await cargarConfigCiudad(ciudadSelec);

    try {
      const hubs = estructuraGeografica[regionSelec]?.ciudades?.[ciudadSelec]?.hubs || [];
      if (hubs.length === 0) {
        setStats({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, pct_disp: 0, trafico_mbps: 0 });
        setDatosHubs([]);
        setCargando(false);
        return;
      }

      const promesas = hubs.map(h => fetch(`${API_URL}/api/hubs?id_hub=${h.id}`).then(res => res.json()));
      const resultados = await Promise.all(promesas);

      let global = { activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, trafico_mbps: 0 };
      let infoHubs = [];

      resultados.forEach(data => {
        if (!data || !data.puertos) return;
        const nombreHub = hubs.find(h => h.id === data.hub)?.nombre || data.hub;
        
        let subActivos = 0, subSusp = 0, subTroncal = 0, subGi = 0, subTe = 0;

        data.puertos.forEach(p => {
          const est = String(p.ESTATUS || '').toUpperCase().trim();
          if (est === 'ACTIVO') {
            global.activos++;
            subActivos++;
            const mbps = parseFloat(String(p.MBPS || '0').replace(/[^0-9.]/g, ''));
            global.trafico_mbps += isNaN(mbps) ? 0 : mbps;
          } else if (est === 'SUSPENDIDO') {
            global.suspendidos++;
            subSusp++;
          } else if (est.includes('TRONCAL')) {
            global.troncales++;
            subTroncal++;
          } else if (est === 'DISPONIBLE GI') {
            global.disp_gi++;
            subGi++;
          } else if (est === 'DISPONIBLE TE') {
            global.disp_te++;
            subTe++;
          }
        });

        const totalDisp = subGi + subTe;
        global.total_disp += totalDisp;

        infoHubs.push({
          nombre: nombreHub,
          id: data.hub,
          activos: subActivos,
          suspendidos: subSusp,
          troncales: subTroncal,
          total_disp: totalDisp,
          disp_gi: subGi,
          disp_te: subTe,
          total: data.puertos.length
        });
      });

      const totalOcupados = global.activos + global.suspendidos + global.troncales;
      const totalGlobal = totalOcupados + global.total_disp;
      const pctDisp = totalGlobal > 0 ? ((global.total_disp / totalGlobal) * 100).toFixed(1) : 0;

      setStats({ ...global, pct_disp: pctDisp });
      setDatosHubs(infoHubs.sort((a, b) => b.total_disp - a.total_disp));

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

  const exportarAExcelNativo = () => {
    if (datosHubs.length === 0) return;
    const headers = [
      'CIUDAD', 'NODO / HUB', 'ID NODO', 'ACTIVOS', 'SUSPENDIDOS', 'TRONCALES', 
      'TOTAL DISPONIBLES', 'DISPONIBLES GI', 'DISPONIBLES TE', 'TOTAL PUERTOS', 
      'ANCHO BANDA BACKBONE', 'CONSUMO ACTUAL PLAZA (Gbps)'
    ];

    const filas = datosHubs.map(h => [
      ciudadSelec, h.nombre, h.id, h.activos, h.suspendidos, h.troncales, 
      h.total_disp, h.disp_gi, h.disp_te, h.total, capacidadTotal, (stats.trafico_mbps / 1000).toFixed(2)
    ]);

    const contenidoCSV = [
      headers.join(','),
      ...filas.map(fila => fila.map(campo => `"${campo}"`).join(','))
    ].join('\n');

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.setAttribute('href', url);
    enlace.setAttribute('download', `Disponibilidad_${ciudadSelec}_${new Date().toISOString().slice(0,10)}.csv`);
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
          <span className="px-3 py-1 rounded-md text-blue-500 border border-blue-600/60 shadow-sm uppercase text-xs font-bold tracking-wider">
            ANÁLISIS DE DISPONIBILIDAD
          </span>
          <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); }} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 outline-none">
            <option value="" className="bg-[#0b132b]">-- REGIÓN --</option>
            {Object.keys(estructuraGeografica).map(r => <option key={r} value={r} className="bg-[#0b132b]">{r}</option>)}
          </select>
          <span className="text-blue-600/80 text-xs">➔</span>
          <select value={ciudadSelec} onChange={(e) => setCiudadSelec(e.target.value)} disabled={!regionSelec} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 disabled:opacity-50 outline-none">
            <option value="" className="bg-[#0b132b]">-- CIUDAD --</option>
            {regionSelec && obtenerCiudadesOrdenadas(regionSelec).map(c => <option key={c} value={c} className="bg-[#0b132b]">{c}</option>)}
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
            {/* VISTA ORIGINAL RESTAURADA: LAS 6 TARJETAS KPI COMPLETAS */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="col-span-2 lg:col-span-1 bg-[#1c2541] border border-blue-500/30 p-4 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
                <p className="text-xs text-blue-400 font-bold mb-1">TOTAL DISPONIBLES</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black text-white">{stats.total_disp}</p>
                  <p className="text-xs text-slate-400 mb-1">puertos</p>
                </div>
                <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${stats.pct_disp}%`}}></div></div>
                <p className="text-[10px] text-slate-500 mt-1">{stats.pct_disp}% de la capacidad total instalada</p>
              </div>

              <div className="bg-[#0b132b] border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                <p className="text-[10px] text-slate-400 font-bold mb-1">DISPONIBLES (GI)</p>
                <p className="text-2xl font-black text-slate-200">{stats.disp_gi}</p>
              </div>
              
              <div className="bg-[#0b132b] border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                <p className="text-[10px] text-slate-400 font-bold mb-1">DISPONIBLES (TE)</p>
                <p className="text-2xl font-black text-slate-200">{stats.disp_te}</p>
              </div>

              <div className="bg-[#0b132b] border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                <p className="text-[10px] text-emerald-500 font-bold mb-1">PUERTOS ACTIVOS</p>
                <p className="text-2xl font-black text-emerald-400">{stats.activos}</p>
              </div>

              <div className="bg-[#0b132b] border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                <p className="text-[10px] text-purple-500 font-bold mb-1">SUSPENDIDOS</p>
                <p className="text-2xl font-black text-purple-400">{stats.suspendidos}</p>
              </div>

              <div className="bg-[#0b132b] border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                <p className="text-[10px] text-amber-500 font-bold mb-1">ENLACES TRONCALES</p>
                <p className="text-2xl font-black text-amber-400">{stats.troncales}</p>
              </div>
            </div>

            {/* SECCIÓN INTEGRADORA: ANCHO DE BANDA, TRÁFICO REAL Y BARRA DE SATURACIÓN */}
            <div className="bg-[#0b132b]/50 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-blue-400">⚡</span> Ancho de Banda Total y Capacidad: {ciudadSelec.toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-500">Monitoreo de saturación basado en el tráfico asignado a puertos activos.</p>
                </div>

                <div className="flex flex-wrap gap-4 items-center justify-end">
                  <div className="bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl text-right min-w-[140px]">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Tráfico Real Agregado</p>
                    <p className="text-lg font-black text-emerald-400 font-mono">{traficoGbps} <span className="text-xs font-normal text-slate-500">Gbps</span></p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-4 min-w-[220px]">
                    <div className="flex-1 text-right">
                      <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Capacidad Backbone</p>
                      {modoEdicion ? (
                        <div className="flex items-center gap-2 justify-end">
                          <input type="text" value={editCapacidad} onChange={e => setEditCapacidad(e.target.value)} className="bg-[#1c2541] border border-blue-500 text-white font-mono text-base font-black rounded px-2 w-20 text-right outline-none" autoFocus />
                          <button onClick={guardarCapacidad} disabled={guardando} className="bg-emerald-600 p-1 rounded cursor-pointer text-white"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setModoEdicion(false)} className="bg-slate-700 p-1 rounded cursor-pointer text-white"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end group">
                          <p className="text-base font-black text-blue-400 font-mono">{capacidadTotal}</p>
                          <button onClick={() => { setEditCapacidad(capacidadTotal); setModoEdicion(true); }} className="text-slate-600 hover:text-blue-400 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/40">
                <div className="flex justify-between items-end">
                  <p className="text-[11px] font-bold text-slate-400">DISPONIBILIDAD REAL DE ANCHO DE BANDA</p>
                  <p className="text-xl font-black text-white">{disponibilidadAnchoBanda}%</p>
                </div>
                <div className="h-3.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                  <div className={`h-full rounded-full transition-all duration-1000 ${parseFloat(disponibilidadAnchoBanda) < 20 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${disponibilidadAnchoBanda}%`}}></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                  <span>0 Gbps (Saturación Máxima)</span>
                  <span>{capacidadTotal} (Límite Configurado)</span>
                </div>
              </div>
            </div>

            {/* VISTA ORIGINAL RESTAURADA: TABLA DE 7 COLUMNAS COMPLETA */}
            <div className="bg-[#0b132b]/30 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-[#0b132b]">
                <h3 className="text-sm font-bold text-slate-200">Desglose de Disponibilidad por Nodo (HUB)</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-left text-xs text-slate-300 whitespace-nowrap">
                  <thead className="bg-[#050814] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4 font-bold tracking-wider">NODO / HUB</th>
                      <th className="p-4 font-bold text-center border-x border-slate-800/50 text-blue-400">TOTAL DISP.</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/50">DISP. (GI)</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/50">DISP. (TE)</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/50 text-emerald-500">ACTIVOS</th>
                      <th className="p-4 font-bold text-center border-r border-slate-800/50 text-purple-400">SUSPENDIDOS</th>
                      <th className="p-4 font-bold text-center text-amber-400">TRONCALES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {datosHubs.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-200">{h.nombre}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{h.id}</p>
                        </td>
                        <td className="p-4 text-center border-x border-slate-800/50">
                          <span className={`px-2.5 py-1 rounded-full font-black ${h.total_disp > 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800/50 text-slate-500'}`}>
                            {h.total_disp}
                          </span>
                        </td>
                        <td className="p-4 text-center border-r border-slate-800/50">{h.disp_gi}</td>
                        <td className="p-4 text-center border-r border-slate-800/50">{h.disp_te}</td>
                        <td className="p-4 text-center border-r border-slate-800/50 text-emerald-400 font-medium">{h.activos}</td>
                        <td className="p-4 text-center border-r border-slate-800/50 text-purple-400 font-medium">{h.suspendidos}</td>
                        <td className="p-4 text-center text-amber-400 font-medium">{h.troncales}</td>
                      </tr>
                    ))}
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