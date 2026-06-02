import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertOctagon, FileSpreadsheet, Server, XCircle, ArrowRight } from 'lucide-react';

export default function CargaExcel({ token, estructuraGeografica }) {
  const [regionSelec, setRegionSelec] = useState('');
  const [ciudadSelec, setCiudadSelec] = useState('');
  const [hubSelec, setHubSelec] = useState('');
  
  const [archivo, setArchivo] = useState(null);
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [hayErrores, setHayErrores] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const manejarArchivo = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setArchivo(e.target.files[0]);
    }
  };

  const procesarExcel = async (modo) => {
    if (!hubSelec || !archivo) return alert("Selecciona un HUB y un archivo Excel.");
    
    const formData = new FormData();
    formData.append('file', archivo);

    setCargando(true);
    try {
      // mode=preview para escaneo, mode=commit para escritura real
      const res = await fetch(`${API_URL}/api/hubs/upload-excel?id_hub=${encodeURIComponent(hubSelec)}&mode=${modo}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.detail || "Error en el servidor");

      if (modo === 'preview') {
        setPreviewData(json.data || []);
        setHayErrores(json.has_errors);
        setPaso(2);
      } else {
        setPaso(3);
      }
    } catch (err) {
      alert(`Error en la carga: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).sort((a, b) => a.localeCompare(b));
  };

  const reiniciarProceso = () => {
    setArchivo(null);
    setPreviewData([]);
    setHayErrores(false);
    setPaso(1);
    document.getElementById('excel-upload').value = "";
  };

  return (
    <div className="flex-1 bg-[#070b19] overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ENCABEZADO */}
        <div className="bg-[#0b132b] p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-emerald-400 flex items-center gap-3">
              <FileSpreadsheet className="w-7 h-7" /> Aprovisionamiento Masivo (Staging Area)
            </h1>
            <p className="text-slate-400 text-sm mt-1">Carga inicial de Puertos, Parámetros Ópticos y Planta Externa.</p>
          </div>
          <div className="flex gap-4">
            <div className={`h-2 w-16 rounded-full transition-all duration-500 ${paso >= 1 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
            <div className={`h-2 w-16 rounded-full transition-all duration-500 ${paso >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
            <div className={`h-2 w-16 rounded-full transition-all duration-500 ${paso >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
          </div>
        </div>

        {/* PASO 1: SELECCIÓN DE GEOGRAFÍA Y ARCHIVO */}
        {paso === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#090f24] p-6 rounded-2xl border border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Server className="w-5 h-5 text-indigo-400"/> Destino Lógico (HUB)</h2>
              <div className="space-y-4">
                <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); setHubSelec(''); }} className="w-full bg-[#0b132b] border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-indigo-500">
                  <option value="">-- SELECCIONA REGIÓN --</option>
                  {Object.keys(estructuraGeografica).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={ciudadSelec} onChange={(e) => { setCiudadSelec(e.target.value); setHubSelec(''); }} disabled={!regionSelec} className="w-full bg-[#0b132b] border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-indigo-500 disabled:opacity-50">
                  <option value="">-- SELECCIONA CIUDAD --</option>
                  {regionSelec && obtenerCiudadesOrdenadas(regionSelec).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={hubSelec} onChange={(e) => setHubSelec(e.target.value)} disabled={!ciudadSelec} className="w-full bg-[#0b132b] border border-slate-700 text-indigo-400 font-bold p-3 rounded-lg outline-none focus:border-indigo-500 disabled:opacity-50">
                  <option value="">-- SELECCIONA HUB / NODO --</option>
                  {regionSelec && ciudadSelec && (estructuraGeografica[regionSelec]?.ciudades[ciudadSelec]?.hubs || []).map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-[#090f24] p-6 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center border-dashed">
              <input type="file" id="excel-upload" accept=".xlsx, .xls" onChange={manejarArchivo} className="hidden" />
              <label htmlFor="excel-upload" className="cursor-pointer group flex flex-col items-center">
                <div className="p-4 bg-emerald-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold mt-4 text-lg">Selecciona tu archivo Excel</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-xs">El documento debe contener la Ficha Técnica de Ingeniería base.</p>
              </label>

              {archivo && (
                <div className="mt-6 w-full">
                  <div className="bg-[#0b132b] border border-emerald-500/30 p-3 rounded-lg flex items-center justify-between text-sm text-emerald-400 font-mono">
                    <span className="truncate">{archivo.name}</span>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  </div>
                  <button onClick={() => procesarExcel('preview')} disabled={!hubSelec || cargando} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                    {cargando ? 'Escaneando...' : 'Analizar Excel (Preview)'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 2: STAGING AREA (PREVISUALIZACIÓN Y ERRORES) */}
        {paso === 2 && (
          <div className="bg-[#090f24] rounded-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[70vh]">
            <div className={`p-4 flex items-center justify-between shrink-0 ${hayErrores ? 'bg-red-950/40 border-b border-red-900/50' : 'bg-emerald-950/40 border-b border-emerald-900/50'}`}>
              <div className="flex items-center gap-3">
                {hayErrores ? <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" /> : <CheckCircle className="w-6 h-6 text-emerald-500" />}
                <div>
                  <h2 className={`font-black text-lg ${hayErrores ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hayErrores ? '⚠️ ERRORES DETECTADOS EN EL ARCHIVO' : '✅ EXCEL VÁLIDO PARA ESCRITURA'}
                  </h2>
                  <p className="text-xs text-slate-400">{previewData.length} registros escaneados.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={reiniciarProceso} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition">Cancelar</button>
                <button 
                  onClick={() => procesarExcel('commit')} 
                  disabled={hayErrores || cargando} 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargando ? 'Escribiendo en MT_DB...' : 'Confirmar e Inyectar a Red'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0b132b] text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-3 w-10">St</th>
                    <th className="p-3">INTERFAZ</th>
                    <th className="p-3">ESTATUS</th>
                    <th className="p-3">SERVICIO ASIGNADO</th>
                    <th className="p-3 w-1/3">VEREDICTO / ERRORES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {previewData.map((fila, idx) => (
                    <tr key={idx} className={!fila._valido ? 'bg-red-950/20' : 'hover:bg-slate-800/30'}>
                      <td className="p-3">
                        {!fila._valido ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      </td>
                      <td className="p-3 font-mono font-bold text-white">{fila.PUERTO}</td>
                      <td className="p-3">{fila.ESTATUS}</td>
                      <td className="p-3 truncate max-w-[200px] text-slate-400">{fila.SERVICIO || '-'}</td>
                      <td className="p-3">
                        {!fila._valido ? (
                          <div className="flex flex-col gap-1 text-[10px] font-bold text-red-400">
                            {fila._errores.map((err, i) => <span key={i}>• {err}</span>)}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-500">Ok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PASO 3: ÉXITO */}
        {paso === 3 && (
          <div className="bg-emerald-950/20 p-12 rounded-2xl border border-emerald-900/50 flex flex-col justify-center items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Base de Datos Actualizada</h2>
            <p className="text-emerald-400 font-medium mb-8">Todos los parámetros ópticos y rutas de planta externa se han registrado.</p>
            <button onClick={reiniciarProceso} className="bg-[#0b132b] border border-slate-700 hover:border-emerald-500 text-white px-6 py-3 rounded-lg font-bold transition">Subir otro archivo</button>
          </div>
        )}

      </div>
    </div>
  );
}