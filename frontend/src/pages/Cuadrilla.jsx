import React, { useState } from 'react';
import { Search, Save, X, Activity, MapPin, Zap, Server, Navigation, Users } from 'lucide-react';

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
      
      if (json.status === 'success') {
        setResultados(json.data);
      } else {
        // AQUÍ ATRAPAMOS EL ERROR REAL DEL SERVIDOR
        alert("Fallo interno del servidor: " + json.detail);
      }
    } catch (err) {
      alert("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  // Al seleccionar el cliente, cargamos sus datos y preparamos las lecturas a editar
  const abrirEdicion = (puerto) => {
    setPuertoActivo(puerto);
    setForm({
      ESTATUS: puerto.ESTATUS || 'DISPONIBLE GI',
      POTENCIA_HUB: puerto.POTENCIA_HUB || '',
      POTENCIA_CPE: puerto.POTENCIA_CPE || ''
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
        alert("✅ Lecturas guardadas correctamente en MT_DB");
        // Actualizamos la lista visual
        setResultados(resultados.map(p => p.ID === puertoActivo.ID ? { ...p, ...form } : p));
        setPuertoActivo(null);
      } else {
        alert("Fallo al guardar la información.");
      }
    } catch (e) {
      alert("Error de red.");
    } finally {
      setGuardando(false);
    }
  };

  // Componente visual para mostrar filas de datos (Solo lectura)
  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-800/50 last:border-0">
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      <span className="text-[11px] text-slate-100 font-mono font-bold text-right w-1/2 truncate">{value || '-'}</span>
    </div>
  );

  return (
    <div className="flex-1 bg-[#050814] h-full overflow-hidden flex flex-col relative">
      
      {/* ========================================================================= */}
      {/* VISTA 1: BUSCADOR (COMPACTO Y LIMPIO)                                     */}
      {/* ========================================================================= */}
      <div className={`flex flex-col h-full w-full max-w-md mx-auto p-4 transition-transform duration-300 ${puertoActivo ? '-translate-x-full absolute opacity-0' : 'translate-x-0'}`}>
        <div className="mb-6 mt-4 text-center shrink-0">
          <h1 className="text-2xl font-black text-indigo-400">Trabajo en Campo</h1>
          <p className="text-slate-500 text-xs mt-1">Busca el cliente o puerto a intervenir</p>
        </div>

        <form onSubmit={buscarPuerto} className="relative mb-6 shrink-0">
          <input 
            type="text" 
            placeholder="Ej. Banamex, Nodo Centro..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#0b132b] text-white text-lg p-4 pl-12 rounded-2xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none focus:border-indigo-400"
          />
          <Search className="absolute left-4 top-4.5 w-6 h-6 text-indigo-400" />
          <button type="submit" className="hidden">Buscar</button>
        </form>

        {cargando && <p className="text-center text-indigo-400 animate-pulse font-bold flex justify-center items-center gap-2"><Activity className="w-5 h-5"/> Buscando...</p>}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-10">
          {resultados.length === 0 && !cargando && busqueda.length > 2 && (
            <p className="text-center text-slate-600">No se encontraron coincidencias.</p>
          )}
          
          {resultados.map((p) => (
            <div key={p.ID} className="bg-[#0b132b] border border-slate-700 p-4 rounded-xl shadow-lg cursor-pointer active:scale-95 transition-transform" onClick={() => abrirEdicion(p)}>
              <div className="flex justify-between items-start mb-1.5">
                <h3 className="font-black text-slate-100 text-lg">{p.PUERTO || '-'}</h3>
                <span className={`px-2 py-1 rounded-md text-[9px] font-black border uppercase ${String(p.ESTATUS).includes('ACTIVO') ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : String(p.ESTATUS).includes('DISPONIBLE') ? 'bg-slate-800 text-slate-400 border-slate-600' : String(p.ESTATUS).includes('SUSPENDIDO') ? 'bg-red-900/30 text-red-400 border-red-500/50' : 'bg-amber-900/30 text-amber-400 border-amber-500/50'}`}>
                  {p.ESTATUS}
                </span>
              </div>
              <p className="text-[13px] text-indigo-300 font-bold mb-2 truncate">{p.SERVICIO || 'Sin cliente asignado'}</p>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1"><Server className="w-3 h-3 text-slate-500" /> {p.EQUIPO_HOTEL_ID || 'N/A'}</span>
                {p.IP_GESTION && <span className="text-emerald-400 bg-emerald-900/20 px-1.5 rounded">{p.IP_GESTION}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 2: FICHA TÉCNICA DE INGENIERÍA (AL SELECCIONAR CLIENTE)             */}
      {/* ========================================================================= */}
      <div className={`flex flex-col h-full w-full max-w-md mx-auto bg-[#050814] transition-transform duration-300 ${puertoActivo ? 'translate-x-0' : 'translate-x-full absolute opacity-0'}`}>
        {puertoActivo && (
          <>
            {/* Cabecera / Botón Regresar */}
            <div className="bg-[#0b132b] p-4 flex justify-between items-center border-b border-slate-800 shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <button onClick={() => setPuertoActivo(null)} className="p-2 bg-slate-800 rounded-full text-slate-300 active:bg-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-indigo-400 font-black text-sm uppercase tracking-widest leading-none">Ficha Técnica</h2>
                  <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{puertoActivo.SERVICIO || puertoActivo.PUERTO}</p>
                </div>
              </div>
            </div>

            {/* Contenido de la Ficha */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-24">
              
              {/* Bloque: Identificación */}
              <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-white font-black text-lg truncate mb-1">{puertoActivo.SERVICIO || 'Sin Cliente'}</h3>
                <p className="text-indigo-400 font-mono text-xs mb-3 font-bold">Chasis: {puertoActivo.EQUIPO_HOTEL_ID || '-'} <span className="text-slate-500 mx-1">|</span> Puerto: {puertoActivo.PUERTO || '-'}</p>
              </div>

              {/* Bloque: Lógica (Solo Lectura) */}
              <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-blue-400 font-black text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-slate-800 pb-2"><Server className="w-4 h-4"/> Lógica y Enrutamiento</h3>
                <InfoRow label="IP Gestión" value={puertoActivo.IP_GESTION} />
                <InfoRow label="IP Cliente" value={puertoActivo.IP_CLIENTE} />
                <InfoRow label="BDI / VLAN" value={puertoActivo.BDI} />
              </div>

              {/* Bloque: Planta Externa (Solo Lectura) */}
              <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-emerald-400 font-black text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-slate-800 pb-2"><Activity className="w-4 h-4"/> Planta Externa</h3>
                <InfoRow label="Ruta OSP" value={puertoActivo.RUTA} />
                <InfoRow label="Distancia" value={puertoActivo.DISTANCIA_CLIENTE} />
                <InfoRow label="Lambdas" value={puertoActivo.LAMBDAS} />
                <InfoRow label="Buffer" value={puertoActivo.BUFFER} />
                <InfoRow label="Hilos" value={puertoActivo.HILOS} />
              </div>

              {/* Bloque: Ubicación y Contacto (Solo Lectura) */}
              <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-pink-400 font-black text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-slate-800 pb-2"><Users className="w-4 h-4"/> Contacto y Sitio</h3>
                <InfoRow label="Nombre Contacto" value={puertoActivo.CONTACTO_NOMBRE} />
                <InfoRow label="Teléfono" value={puertoActivo.CONTACTO_TELEFONO} />
                
                {/* Botón de Google Maps */}
                {puertoActivo.COORDENADAS ? (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Coordenadas GPS</p>
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(puertoActivo.COORDENADAS)}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-full bg-[#1c2541] hover:bg-slate-700 border border-slate-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-lg"
                    >
                      <Navigation className="w-5 h-5 text-emerald-400"/> Abrir en Google Maps
                    </a>
                  </div>
                ) : (
                  <InfoRow label="Coordenadas" value="No registradas" />
                )}
              </div>

              {/* ============================================================== */}
              {/* FORMULARIO EDITABLE (LECTURAS EN CAMPO)                        */}
              {/* ============================================================== */}
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 shadow-md">
                <h3 className="text-amber-500 font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4"/> Reportar Lecturas en Campo</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Estatus Físico</label>
                    <select value={form.ESTATUS} onChange={e=>setForm({...form, ESTATUS: e.target.value})} className="w-full bg-[#0b132b] border border-slate-700 text-white text-sm p-3 rounded-xl outline-none focus:border-amber-500 cursor-pointer font-bold shadow-inner">
                      <option value="DISPONIBLE GI">DISPONIBLE GI</option>
                      <option value="DISPONIBLE TE">DISPONIBLE TE</option>
                      <option value="DISPONIBLE 25">DISPONIBLE 25</option>
                      <option value="DISPONIBLE 100">DISPONIBLE 100</option>
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="SUSPENDIDO">SUSPENDIDO</option>
                      <option value="TRONCAL TE">TRONCAL TE</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 text-center">Potencia HUB</label>
                      <input type="text" value={form.POTENCIA_HUB} onChange={e=>setForm({...form, POTENCIA_HUB: e.target.value})} placeholder="-18.5" className="w-full bg-[#0b132b] border border-slate-700 text-amber-400 text-center text-sm p-3 rounded-xl outline-none focus:border-amber-500 font-mono font-bold shadow-inner" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 text-center">Potencia CPE</label>
                      <input type="text" value={form.POTENCIA_CPE} onChange={e=>setForm({...form, POTENCIA_CPE: e.target.value})} placeholder="-22.1" className="w-full bg-[#0b132b] border border-slate-700 text-amber-400 text-center text-sm p-3 rounded-xl outline-none focus:border-amber-500 font-mono font-bold shadow-inner" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÓN FLOTANTE PARA GUARDAR */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050814] via-[#050814] to-transparent shrink-0">
              <button onClick={guardarCambios} disabled={guardando} className="w-full max-w-md mx-auto bg-emerald-600 active:scale-95 text-white font-black text-base py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2 transition-transform">
                <Save className="w-5 h-5" /> {guardando ? 'Guardando...' : 'GUARDAR LECTURAS'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}