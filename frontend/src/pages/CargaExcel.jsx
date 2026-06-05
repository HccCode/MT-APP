import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertOctagon, FileSpreadsheet, Server, XCircle, ArrowRight, PlusSquare, Settings2, Database, Zap } from 'lucide-react';

export default function CargaExcel({ token, estructuraGeografica }) {
  const [modoCarga, setModoCarga] = useState('manual'); // 'excel' | 'manual'
  
  const [regionSelec, setRegionSelec] = useState('');
  const [ciudadSelec, setCiudadSelec] = useState('');
  const [hubSelec, setHubSelec] = useState('');
  
  const [archivo, setArchivo] = useState(null);
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [hayErrores, setHayErrores] = useState(false);

  // ESTADOS PARA EL FORMULARIO MANUAL ACTUALIZADO CON TIPO DE INTERFAZ
  const [nuevoEquipo, setNuevoEquipo] = useState({
    chasis: '',
    ip_hub: '',
    cantidad_puertos: 24,
    tipo_interfaz: '1G',
    prefijo_puerto: 'Gi1/0/',
    estatus_inicial: 'DISPONIBLE GI'
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const manejarArchivo = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setArchivo(e.target.files[0]);
    }
  };

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).sort((a, b) => a.localeCompare(b));
  };

  // ==========================================
  // LÓGICA DE MODO EXCEL
  // ==========================================
  const procesarExcel = async (modo) => {
    if (!hubSelec || !archivo) return alert("Selecciona un HUB y un archivo Excel.");
    const formData = new FormData();
    formData.append('file', archivo);

    setCargando(true);
    try {
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

  // ==========================================
  // LÓGICA DE MODO MANUAL (NUEVO CHASIS)
  // ==========================================
  
  // Función para manejar el cambio de velocidad (1G vs 10G)
  const handleCambioInterfaz = (e) => {
    const tipo = e.target.value;
    let prefijo = 'Gi1/0/';
    let estatus = 'DISPONIBLE GI';

    if (tipo === '10G') {
      prefijo = 'Te1/0/'; // TenGigabitEthernet
      estatus = 'DISPONIBLE TE';
    } else if (tipo === '25G') {
      prefijo = 'Twe1/0/'; // TwentyFiveGigE
      estatus = 'DISPONIBLE 25';
    } else if (tipo === '100G') {
      prefijo = 'Hu1/0/'; // HundredGigE
      estatus = 'DISPONIBLE 100';
    }

    setNuevoEquipo({
      ...nuevoEquipo,
      tipo_interfaz: tipo,
      prefijo_puerto: prefijo,
      estatus_inicial: estatus
    });
  };

  const generarPreviewManual = () => {
    if (!hubSelec || !nuevoEquipo.chasis) return alert("Selecciona un HUB y escribe el nombre del Chasis.");
    
    const dataGenerada = [];
    for (let i = 1; i <= nuevoEquipo.cantidad_puertos; i++) {
      dataGenerada.push({
        PUERTO: `${nuevoEquipo.prefijo_puerto}${i}`,
        ESTATUS: nuevoEquipo.estatus_inicial,
        EQUIPO_HOTEL_ID: nuevoEquipo.chasis.toUpperCase(),
        IP_HUB: nuevoEquipo.ip_hub,
        SERVICIO: '',
        _valido: true,
        _errores: []
      });
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
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ puertos: previewData })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error guardando el chasis en MT_DB");
      }
      setPaso(3);
    } catch (err) {
      alert(`Fallo en el aprovisionamiento: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const reiniciarProceso = () => {
    setArchivo(null);
    setPreviewData([]);
    setHayErrores(false);
    setPaso(1);
    if(document.getElementById('excel-upload')) {
        document.getElementById('excel-upload').value = "";
    }
  };

  return (
    <div className="flex-1 bg-[#070b19] overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ENCABEZADO Y TABS */}
        <div className="bg-[#0b132b] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-emerald-400 flex items-center gap-3">
                <Database className="w-7 h-7" /> Aprovisionamiento de Red
              </h1>
              <p className="text-slate-400 text-sm mt-1">Da de alta nuevo equipamiento o inyecta datos masivos al inventario.</p>
            </div>
            {paso === 1 && (
              <div className="flex bg-[#050814] border border-slate-700 p-1 rounded-xl">
                <button 
                  onClick={() => { setModoCarga('manual'); setArchivo(null); }} 
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${modoCarga === 'manual' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                  <PlusSquare className="w-4 h-4" /> Nuevo Chasis (Seguro)
                </button>
                <button 
                  onClick={() => setModoCarga('excel')} 
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${modoCarga === 'excel' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                  <FileSpreadsheet className="w-4 h-4" /> Carga Masiva Excel
                </button>
              </div>
            )}
            {paso > 1 && (
              <div className="flex gap-4">
                <div className={`h-2 w-12 rounded-full transition-all duration-500 bg-emerald-500`}></div>
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${paso >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${paso >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
              </div>
            )}
          </div>
        </div>

        {/* PASO 1: SELECCIÓN DE GEOGRAFÍA Y CONFIGURACIÓN */}
        {paso === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
            
            {/* PANEL IZQUIERDO: DESTINO LÓGICO */}
            <div className="bg-[#090f24] p-6 rounded-2xl border border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Server className="w-5 h-5 text-indigo-400"/> Destino Lógico (HUB)</h2>
              <div className="space-y-4">
                <select value={regionSelec} onChange={(e) => { setRegionSelec(e.target.value); setCiudadSelec(''); setHubSelec(''); }} className="w-full bg-[#0b132b] border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-emerald-500">
                  <option value="">-- SELECCIONA REGIÓN --</option>
                  {Object.keys(estructuraGeografica).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={ciudadSelec} onChange={(e) => { setCiudadSelec(e.target.value); setHubSelec(''); }} disabled={!regionSelec} className="w-full bg-[#0b132b] border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-emerald-500 disabled:opacity-50">
                  <option value="">-- SELECCIONA CIUDAD --</option>
                  {regionSelec && obtenerCiudadesOrdenadas(regionSelec).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={hubSelec} onChange={(e) => setHubSelec(e.target.value)} disabled={!ciudadSelec} className="w-full bg-[#0b132b] border border-slate-700 text-emerald-400 font-bold p-3 rounded-lg outline-none focus:border-emerald-500 disabled:opacity-50">
                  <option value="">-- SELECCIONA HUB / NODO --</option>
                  {regionSelec && ciudadSelec && (estructuraGeografica[regionSelec]?.ciudades[ciudadSelec]?.hubs || []).map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* PANEL DERECHO: OPCIÓN SELECCIONADA */}
            {modoCarga === 'manual' ? (
              <div className="bg-[#090f24] p-6 rounded-2xl border border-emerald-900/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Settings2 className="w-5 h-5 text-emerald-400"/> Generador de Ficha Técnica</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">ID de Equipo / Chasis (Ej. OLT-ZTE-01)</label>
                    <input type="text" value={nuevoEquipo.chasis} onChange={e=>setNuevoEquipo({...nuevoEquipo, chasis: e.target.value})} className="w-full bg-[#0b132b] border border-slate-700 text-white p-2.5 rounded-lg font-mono focus:border-emerald-500 outline-none" placeholder="OLT-01" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">IP Gestión del Hub (Opcional)</label>
                    <input type="text" value={nuevoEquipo.ip_hub} onChange={e=>setNuevoEquipo({...nuevoEquipo, ip_hub: e.target.value})} className="w-full bg-[#0b132b] border border-slate-700 text-white p-2.5 rounded-lg font-mono focus:border-emerald-500 outline-none" placeholder="10.50.0.1" />
                  </div>
                  
                  {/* NUEVO SELECTOR INTELIGENTE DE INTERFAZ */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1 mb-1"><Zap className="w-3 h-3"/> Capacidad (Velocidad)</label>
                    <select value={nuevoEquipo.tipo_interfaz} onChange={handleCambioInterfaz} className="w-full bg-[#1c2541] border border-blue-900/50 text-blue-300 p-2.5 rounded-lg font-bold focus:border-emerald-500 outline-none transition-colors">
                      <option value="1G">Gigabit Ethernet (1G)</option>
                      <option value="10G">TenGigabit (10G)</option>
                      <option value="25G">25 Gigabit (25G)</option>
                      <option value="100G">100 Gigabit (100G)</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Cantidad a Generar</label>
                    <select value={nuevoEquipo.cantidad_puertos} onChange={e=>setNuevoEquipo({...nuevoEquipo, cantidad_puertos: parseInt(e.target.value)})} className="w-full bg-[#0b132b] border border-slate-700 text-white p-2.5 rounded-lg font-bold focus:border-emerald-500 outline-none">
                      <option value={8}>8 Puertos</option>
                      <option value={16}>16 Puertos</option>
                      <option value={24}>24 Puertos</option>
                      <option value={48}>48 Puertos</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex justify-between">
                      Prefijo Físico de Interfaz <span className="text-emerald-500">{nuevoEquipo.estatus_inicial}</span>
                    </label>
                    <input type="text" value={nuevoEquipo.prefijo_puerto} onChange={e=>setNuevoEquipo({...nuevoEquipo, prefijo_puerto: e.target.value})} className="w-full bg-[#0b132b] border border-slate-700 text-emerald-400 p-2.5 rounded-lg font-mono font-bold focus:border-emerald-500 outline-none" placeholder="Gi1/0/" />
                  </div>
                </div>

                <button 
                  onClick={generarPreviewManual} 
                  disabled={!hubSelec || !nuevoEquipo.chasis} 
                  className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  Configurar y Previsualizar Puertos <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-[#090f24] p-6 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center border-dashed">
                <input type="file" id="excel-upload" accept=".xlsx, .xls" onChange={manejarArchivo} className="hidden" />
                <label htmlFor="excel-upload" className="cursor-pointer group flex flex-col items-center">
                  <div className="p-4 bg-indigo-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-12 h-12 text-indigo-400" />
                  </div>
                  <h3 className="text-white font-bold mt-4 text-lg">Selecciona tu archivo Excel</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs">Peligro: Puede sobreescribir datos actuales si el archivo contiene registros preexistentes.</p>
                </label>

                {archivo && (
                  <div className="mt-6 w-full">
                    <div className="bg-[#0b132b] border border-indigo-500/30 p-3 rounded-lg flex items-center justify-between text-sm text-indigo-400 font-mono">
                      <span className="truncate">{archivo.name}</span>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    </div>
                    <button onClick={() => procesarExcel('preview')} disabled={!hubSelec || cargando} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                      {cargando ? 'Escaneando Documento...' : 'Analizar Excel (Preview)'} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: STAGING AREA (PREVISUALIZACIÓN Y ERRORES) */}
        {paso === 2 && (
          <div className="bg-[#090f24] rounded-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[70vh] shadow-2xl">
            <div className={`p-4 flex items-center justify-between shrink-0 ${hayErrores ? 'bg-red-950/40 border-b border-red-900/50' : 'bg-emerald-950/40 border-b border-emerald-900/50'}`}>
              <div className="flex items-center gap-3">
                {hayErrores ? <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" /> : <CheckCircle className="w-6 h-6 text-emerald-500" />}
                <div>
                  <h2 className={`font-black text-lg uppercase tracking-wider ${hayErrores ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hayErrores ? '⚠️ Errores en la validación' : '✅ Lote aprobado para inyección'}
                  </h2>
                  <p className="text-xs text-slate-400">{previewData.length} puertos estructurados en memoria.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={reiniciarProceso} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition">Descartar</button>
                <button 
                  onClick={modoCarga === 'manual' ? guardarChasisManual : () => procesarExcel('commit')} 
                  disabled={hayErrores || cargando} 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargando ? 'Procesando en MT_DB...' : 'Inyectar a Red'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0b132b] text-slate-400 sticky top-0 uppercase font-bold tracking-widest z-10 shadow-sm border-b border-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">St</th>
                    <th className="p-3 w-40">CHASIS ID</th>
                    <th className="p-3 w-32">INTERFAZ</th>
                    <th className="p-3 w-40">ESTATUS INICIAL</th>
                    <th className="p-3 w-32">IP HUB</th>
                    <th className="p-3">VEREDICTO DE SISTEMA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {previewData.map((fila, idx) => (
                    <tr key={idx} className={!fila._valido ? 'bg-red-950/20' : 'hover:bg-slate-800/30'}>
                      <td className="p-3 text-center">
                        {!fila._valido ? <XCircle className="w-4 h-4 text-red-500 inline-block" /> : <CheckCircle className="w-4 h-4 text-emerald-500 inline-block" />}
                      </td>
                      <td className="p-3 text-indigo-300 font-bold">{fila.EQUIPO_HOTEL_ID || '-'}</td>
                      <td className="p-3 font-mono font-bold text-white">{fila.PUERTO}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider uppercase
                          ${fila.ESTATUS.includes('TE') ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700' : 
                          fila.ESTATUS.includes('GI') ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                          'bg-blue-900/30 text-blue-400 border-blue-800'}`}>
                          {fila.ESTATUS}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{fila.IP_HUB || '-'}</td>
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

        {/* PASO 3: ÉXITO */}
        {paso === 3 && (
          <div className="bg-emerald-950/20 p-12 rounded-2xl border border-emerald-900/50 flex flex-col justify-center items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Aprovisionamiento Exitoso</h2>
            <p className="text-emerald-400 font-medium mb-8">
              {modoCarga === 'manual' 
                ? `El chasis ${nuevoEquipo.chasis} y sus ${nuevoEquipo.cantidad_puertos} puertos han sido creados correctamente.` 
                : 'El inventario masivo del Excel ha sido inyectado en MT_DB.'}
            </p>
            <button onClick={reiniciarProceso} className="bg-[#0b132b] border border-slate-700 hover:border-emerald-500 text-white px-6 py-3 rounded-lg font-bold transition shadow-lg">Registrar Nuevo Movimiento</button>
          </div>
        )}

      </div>
    </div>
  );
}