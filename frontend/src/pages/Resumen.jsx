import { useState, useEffect } from 'react';
import { Download, Edit2, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Resumen({ estructuraGeografica }) {
  const [regionSelec, setRegionSelec] = useState(localStorage.getItem('mcm_res_reg') || '');
  const [ciudadSelec, setCiudadSelec] = useState(localStorage.getItem('mcm_res_cd') || '');
  
  const [stats, setStats] = useState({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, pct_disp: 0 });
  const [datosHubs, setDatosHubs] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estados para la capacidad de carga (Backbone)
  const [capacidadOriginal, setCapacidadOriginal] = useState('40G'); // Valor por defecto visual
  const [editCapacidad, setEditCapacidad] = useState('');
  const [modoEdicionCapacidad, setModoEdicionCapacidad] = useState(false);
  const [guardandoCapacidad, setGuardandoCapacidad] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://mt-backend-2ox8.onrender.com';

  useEffect(() => { localStorage.setItem('mcm_res_reg', regionSelec); }, [regionSelec]);
  useEffect(() => { localStorage.setItem('mcm_res_cd', ciudadSelec); }, [ciudadSelec]);

  // Cargar la configuración de la ciudad desde la BD
  const cargarConfigCiudad = async (ciudad) => {
    if (!ciudad) return;
    try {
      const res = await fetch(`${API_URL}/api/config-ciudades/${encodeURIComponent(ciudad)}`);
      if (res.ok) {
        const data = await res.json();
        // Si existe en BD, lo usamos, si no, mostramos "40G" por defecto
        if (data.data && data.data.ancho_banda_total) {
          setCapacidadOriginal(data.data.ancho_banda_total);
        } else {
          setCapacidadOriginal('40G');
        }
      }
    } catch (e) {
      console.error("Error cargando config de ciudad:", e);
      setCapacidadOriginal('40G');
    }
  };

  const procesarResumen = async () => {
    if (!regionSelec || !ciudadSelec) {
      setStats({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, pct_disp: 0 });
      setDatosHubs([]);
      return;
    }

    setCargando(true);
    cargarConfigCiudad(ciudadSelec); // Cargar el ancho de banda al cambiar de ciudad

    try {
      const hubs = estructuraGeografica[regionSelec]?.ciudades?.[ciudadSelec]?.hubs || [];
      if (hubs.length === 0) {
        setStats({ activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0, pct_disp: 0 });
        setDatosHubs([]);
        setCargando(false);
        return;
      }

      const promesas = hubs.map(h => fetch(`${API_URL}/api/hubs?id_hub=${h.id}`).then(res => res.json()));
      const resultados = await Promise.all(promesas);

      let global = { activos: 0, suspendidos: 0, troncales: 0, total_disp: 0, disp_gi: 0, disp_te: 0 };
      let infoHubs = [];

      resultados.forEach(data => {
        if (!data || !data.puertos) return;
        const nombreHub = hubs.find(h => h.id === data.hub)?.nombre || data.hub;
        
        const activos = data.puertos.filter(p => String(p.ESTATUS||'').toUpperCase() === 'ACTIVO').length;
        const suspendidos = data.puertos.filter(p => String(p.ESTATUS||'').toUpperCase() === 'SUSPENDIDO').length;
        const troncales = data.puertos.filter(p => String(p.ESTATUS||'').toUpperCase().includes('TRONCAL')).length;
        
        const dispGi = data.puertos.filter(p => String(p.ESTATUS||'').toUpperCase() === 'DISPONIBLE GI').length;
        const dispTe = data.puertos.filter(p => String(p.ESTATUS||'').toUpperCase() === 'DISPONIBLE TE').length;
        const totalDisp = dispGi + dispTe;
        
        global.activos += activos;
        global.suspendidos += suspendidos;
        global.troncales += troncales;
        global.disp_gi += dispGi;
        global.disp_te += dispTe;
        global.total_disp += totalDisp;

        infoHubs.push({
          nombre: nombreHub, id: data.hub,
          activos, suspendidos, troncales, total_disp: totalDisp, disp_gi: dispGi, disp_te: dispTe,
          total: data.puertos.length
        });
      });

      const totalOcupados = global.activos + global.suspendidos + global.troncales;
      const totalGlobal = totalOcupados + global.total_disp;
      const pctDisp = totalGlobal > 0 ? ((global.total_disp / totalGlobal) * 100).toFixed(1) : 0;

      setStats({ ...global, pct_disp: pctDisp });
      setDatosHubs(infoHubs.sort((a,b) => b.total_disp - a.total_disp));

    } catch (e) { console.error(e); } finally { setCargando(false); }
  };

  useEffect(() => { procesarResumen(); }, [regionSelec, ciudadSelec]);

  // Manejadores para la edición del Backbone
  const iniciarEdicionCapacidad = () => {
    setEditCapacidad(capacidadOriginal);
    setModoEdicionCapacidad(true);
  };

  const cancelarEdicionCapacidad = () => {
    setModoEdicionCapacidad(false);
    setEditCapacidad('');
  };

  const guardarCapacidad = async () => {
    if (!ciudadSelec) return;
    setGuardandoCapacidad(true);
    try {
      const token = localStorage.getItem('mcm_token');
      const res = await fetch(`${API_URL}/api/config-ciudades/${encodeURIComponent(ciudadSelec)}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ancho_banda_total: editCapacidad })
      });

      if (res.ok) {
        setCapacidadOriginal(editCapacidad);
        setModoEdicionCapacidad(false);
      } else {
        alert("Error al guardar la capacidad. Verifica tus permisos.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red al guardar.");
    } finally {
      setGuardandoCapacidad(false);
    }
  };


  const exportarAExcel = () => {
    if (datosHubs.length === 0) return;
    const dataAExportar = datosHubs.map(h => ({
      'CIUDAD': ciudadSelec,
      'NODO': h.nombre,
      'ID NODO': h.id,
      'ACTIVOS': h.activos,
      'SUSPENDIDOS': h.suspendidos,
      'TRONCALES': h.troncales,
      'TOTAL DISPONIBLES': h.total_disp,
      'DISPONIBLES GI': h.disp_gi,
      'DISPONIBLES TE': h.disp_te,
      'TOTAL PUERTOS': h.total,
      'CAPACIDAD BACKBONE CIUDAD': capacidadOriginal
    }));

    const ws = XLSX.utils.json_to_sheet(dataAExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Disponibilidad_Puertos");
    XLSX.writeFile(wb, `Disponibilidad_${ciudadSelec}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).sort((a, b) => a.localeCompare(b));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070b19]">
      <div className="bg-[#090f24] border-b border-slate-800/60 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 rounded-md text-blue-500 border border-blue-600/60 shadow-sm uppercase text-xs font-bold tracking-wider">
            ANÁLISIS DE DISPONIBILIDAD
          </span>
          <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); }} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors">
            <option value="" className="bg-[#0b132b]">-- REGIÓN --</option>
            {Object.keys(estructuraGeografica).map(r => <option key={r} value={r} className="bg-[#0b132b]">{r}</option>)}
          </select>
          <span className="text-blue-600/80 text-xs">➔</span>
          <select value={ciudadSelec} onChange={(e) => setCiudadSelec(e.target.value)} disabled={!regionSelec} className="bg-transparent border border-slate-600 px-3 py-1.5 rounded-md text-sm text-slate-200 disabled:opacity-50 outline-none focus:border-blue-500 transition-colors">
            <option value="" className="bg-[#0b132b]">-- CIUDAD --</option>
            {regionSelec && obtenerCiudadesOrdenadas(regionSelec).map(c => <option key={c} value={c} className="bg-[#0b132b]">{c}</option>)}
          </select>
        </div>
        
        {datosHubs.length > 0 && (
          <button onClick={exportarAExcel} className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-600 text-emerald-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-lg">
            <Download className="w-4 h-4" /> Exportar Reporte Excel
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
            {/* KPI PRINCIPALES */}
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

            {/* SECCIÓN ANCHO DE BANDA CON EDICIÓN */}
            <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <span className="text-blue-400">⚡</span> Ancho de Banda Total: {ciudadSelec.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-400">Capacidad sumada de todos los servicios dedicados en la plaza.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Capacidad de Carga Estimada (Backbone)</p>
                
                {modoEdicionCapacidad ? (
                  <div className="flex items-center gap-2 justify-end">
                    <input 
                      type="text" 
                      value={editCapacidad} 
                      onChange={(e) => setEditCapacidad(e.target.value)} 
                      className="bg-slate-900 border border-blue-500 text-white font-mono text-xl font-black rounded px-2 py-1 w-24 text-right focus:outline-none"
                      autoFocus
                    />
                    <button 
                      onClick={guardarCapacidad} 
                      disabled={guardandoCapacidad}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded transition-colors disabled:opacity-50"
                      title="Guardar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={cancelarEdicionCapacidad} 
                      className="bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 justify-end group">
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 font-mono tracking-wider">
                      {capacidadOriginal}
                    </p>
                    {/* Botón de edición visible al hacer hover en el contenedor o siempre presente */}
                    <button 
                      onClick={iniciarEdicionCapacidad}
                      className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                      title="Editar Ancho de Banda Total"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* TABLA DE DETALLE POR NODO */}
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
                    {datosHubs.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-slate-500 italic">No hay nodos registrados en esta ciudad.</td></tr>
                    ) : (
                      datosHubs.map((h, i) => (
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