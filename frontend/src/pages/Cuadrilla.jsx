import React, { useState } from 'react';
import { Search, Camera, Save, X, Activity, MapPin, Zap } from 'lucide-react';

export default function Cuadrilla({ token }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  const [puertoActivo, setPuertoActivo] = useState(null);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const buscarPuerto = async (e) => {
    e.preventDefault();
    if (busqueda.length < 3) return alert("Escribe al menos 3 letras para buscar");
    
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/ports/search?q=${encodeURIComponent(busqueda)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.status === 'success') setResultados(json.data);
    } catch (err) {
      alert("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  const abrirEdicion = (puerto) => {
    setPuertoActivo(puerto);
    setForm({
      ESTATUS: puerto.ESTATUS,
      POTENCIA_HUB: puerto.POTENCIA_HUB || '',
      POTENCIA_CPE: puerto.POTENCIA_CPE || '',
      SERIE_CPE: puerto.SERIE_CPE || ''
    });
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/ports/${puertoActivo.ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("✅ Datos actualizados en la red");
        setPuertoActivo(null);
        // Actualizar la lista local
        setResultados(resultados.map(p => p.ID === puertoActivo.ID ? { ...p, ...form } : p));
      } else {
        alert("Fallo al guardar");
      }
    } catch (e) {
      alert("Error de red");
    } finally {
      setGuardando(false);
    }
  };

  // Función nativa para solicitar acceso a cámara (Simulada para captura)
  const handleScanClick = () => {
    // Al usar label con input type="file" capture="environment", el celular abrirá la cámara
    document.getElementById('cameraInput').click();
  };

  return (
    <div className="flex-1 bg-[#050814] h-full overflow-y-auto">
      
      {/* VISTA PRINCIPAL: BUSCADOR Y RESULTADOS */}
      {!puertoActivo ? (
        <div className="max-w-md mx-auto p-4 flex flex-col min-h-full">
          <div className="mb-6 mt-2 text-center">
            <h1 className="text-2xl font-black text-indigo-400">Modo Cuadrilla</h1>
            <p className="text-slate-500 text-xs mt-1">Herramienta de trabajo en campo</p>
          </div>

          <form onSubmit={buscarPuerto} className="relative mb-6">
            <input 
              type="text" 
              placeholder="Buscar Servicio, IP o Puerto..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#0b132b] text-white text-lg p-4 pl-12 rounded-2xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none focus:border-indigo-400"
            />
            <Search className="absolute left-4 top-4.5 w-6 h-6 text-indigo-400" />
            <button type="submit" className="hidden">Buscar</button>
          </form>

          {cargando && <p className="text-center text-indigo-400 animate-pulse font-bold">Buscando en MT_DB...</p>}

          <div className="flex-1 space-y-4 pb-10">
            {resultados.length === 0 && !cargando && busqueda.length > 2 && (
              <p className="text-center text-slate-600">No hay coincidencias.</p>
            )}
            
            {resultados.map((p) => (
              <div key={p.ID} className="bg-[#0b132b] border border-slate-700 p-4 rounded-2xl shadow-lg active:scale-95 transition-transform" onClick={() => abrirEdicion(p)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-slate-100 text-lg">{p.PUERTO}</h3>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${p.ESTATUS.includes('ACTIVO') ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : p.ESTATUS.includes('DISPONIBLE') ? 'bg-slate-800 text-slate-400 border-slate-600' : 'bg-red-900/30 text-red-400 border-red-500/50'}`}>
                    {p.ESTATUS}
                  </span>
                </div>
                <p className="text-sm text-indigo-300 font-bold mb-1 truncate">{p.SERVICIO || 'Sin cliente asignado'}</p>
                <div className="flex flex-col gap-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Equipo: {p.EQUIPO_HOTEL_ID || 'N/A'}</span>
                  {p.DIRECCION && <span className="flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /> <span className="truncate">{p.DIRECCION}</span></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (

      /* VISTA SECUNDARIA: EDICIÓN RÁPIDA (MODAL MÓVIL) */
        <div className="max-w-md mx-auto flex flex-col h-full bg-[#0b132b] animate-in slide-in-from-right-8 duration-200">
          <div className="bg-[#050814] p-4 flex justify-between items-center border-b border-slate-800 sticky top-0 z-10">
            <div>
              <h2 className="text-indigo-400 font-black text-xl">{puertoActivo.PUERTO}</h2>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{puertoActivo.SERVICIO}</p>
            </div>
            <button onClick={() => setPuertoActivo(null)} className="p-2 bg-slate-800 rounded-full text-slate-300 active:bg-slate-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-6 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Estatus del Puerto</label>
              <select value={form.ESTATUS} onChange={e=>setForm({...form, ESTATUS: e.target.value})} className="w-full bg-[#1c2541] border-2 border-slate-700 text-white text-lg p-3 rounded-xl outline-none focus:border-indigo-500">
                <option value="DISPONIBLE GI">DISPONIBLE GI</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="SUSPENDIDO">SUSPENDIDO</option>
                <option value="TRONCAL TE">TRONCAL TE</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Potencia TX (dBm)</label>
                <input type="number" step="0.01" value={form.POTENCIA_HUB} onChange={e=>setForm({...form, POTENCIA_HUB: e.target.value})} className="w-full bg-[#1c2541] border-2 border-slate-700 text-amber-400 font-mono text-center text-xl p-3 rounded-xl outline-none focus:border-amber-500" placeholder="-18.5" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Potencia RX (dBm)</label>
                <input type="number" step="0.01" value={form.POTENCIA_CPE} onChange={e=>setForm({...form, POTENCIA_CPE: e.target.value})} className="w-full bg-[#1c2541] border-2 border-slate-700 text-amber-400 font-mono text-center text-xl p-3 rounded-xl outline-none focus:border-amber-500" placeholder="-22.1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Número de Serie CPE</label>
              <div className="flex gap-2">
                <input type="text" value={form.SERIE_CPE} onChange={e=>setForm({...form, SERIE_CPE: e.target.value})} className="flex-1 bg-[#1c2541] border-2 border-slate-700 text-slate-300 font-mono text-lg p-3 rounded-xl outline-none focus:border-indigo-500" placeholder="Ej. HWTC123456" />
                
                {/* BOTÓN MÁGICO PARA CÁMARA */}
                <button onClick={handleScanClick} className="bg-indigo-600 active:bg-indigo-500 p-4 rounded-xl flex items-center justify-center shadow-lg">
                  <Camera className="w-6 h-6 text-white" />
                </button>
                <input type="file" id="cameraInput" accept="image/*" capture="environment" className="hidden" onChange={(e) => alert('Fotografía capturada. (La lectura óptica OCR requiere integración externa)')} />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Presiona la cámara para capturar la etiqueta del equipo.</p>
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-[#050814] pb-8">
            <button onClick={guardarCambios} disabled={guardando} className="w-full bg-emerald-600 active:bg-emerald-500 text-white font-black text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2">
              <Save className="w-6 h-6" /> {guardando ? 'Guardando...' : 'GUARDAR LECTURAS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}