import React, { useState } from 'react';
import { Search, X, Activity, Server, Navigation, Users, ShieldAlert, Zap, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

export default function Cuadrilla({ token, handleLogout }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  const [puertoActivo, setPuertoActivo] = useState(null);

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
        alert("Fallo interno del servidor: " + json.detail);
      }
    } catch (err) {
      alert("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const abrirDetalle = (puerto) => {
    setPuertoActivo(puerto);
  };

  const cerrarSesion = () => {
    if (handleLogout) {
      handleLogout();
    } else {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  // Componente visual para mostrar filas de datos
  const InfoRow = ({ label, value, isPhone }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-800/50 last:border-0">
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      {isPhone && value && value !== '-' ? (
        <a 
          href={`tel:${value.replace(/[^0-9+]/g, '')}`} 
          className="text-[11px] text-emerald-400 font-mono font-bold text-right w-1/2 truncate flex justify-end items-center gap-1.5 active:scale-95 transition-transform"
          onClick={(e) => e.stopPropagation()}
        >
          📞 {value}
        </a>
      ) : (
        <span className="text-[11px] text-slate-100 font-mono font-bold text-right w-1/2 truncate">{value || '-'}</span>
      )}
    </div>
  );

  // NUEVO COMPONENTE: Sección Acordeón Colapsable
  const SeccionDesplegable = ({ titulo, icono, children, colorTexto, bgClass="bg-[#0b132b]", borderClass="border-slate-800", abiertoPorDefecto = false }) => {
    const [abierto, setAbierto] = useState(abiertoPorDefecto);
    return (
      <div className={`${bgClass} border ${borderClass} rounded-xl shadow-sm overflow-hidden transition-all duration-300`}>
        <button
          onClick={() => setAbierto(!abierto)}
          className={`w-full p-4 flex justify-between items-center transition-colors outline-none active:bg-slate-800/50 ${abierto ? `border-b ${borderClass}` : ''}`}
        >
          <h3 className={`${colorTexto} font-black text-[11px] uppercase tracking-widest flex items-center gap-2`}>
            {icono} {titulo}
          </h3>
          {abierto ? <ChevronUp className={`w-4 h-4 ${colorTexto}`} /> : <ChevronDown className={`w-4 h-4 text-slate-500`} />}
        </button>
        {abierto && (
          <div className="p-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-[#050814] h-full overflow-hidden flex flex-col relative">
      
      <style>{`
        header, nav { display: none !important; }
        main, #root > div { padding-top: 0 !important; margin-top: 0 !important; }
      `}</style>

      {/* BARRA SUPERIOR NATIVA */}
      <div className="bg-[#0b132b] border-b border-slate-800 p-4 flex justify-between items-center shrink-0 shadow-md relative z-20">
        <h1 className="text-slate-100 font-black text-lg tracking-widest flex items-center gap-2">
          MT<span className="text-indigo-500">_MANAGER</span>
        </h1>
        
        <button 
          onClick={cerrarSesion} 
          className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 active:bg-slate-700 active:scale-95 transition-all shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" /> Salir
        </button>
      </div>

      {/* VISTA 1: BUSCADOR */}
      <div className={`flex flex-col h-full w-full max-w-md mx-auto p-4 transition-transform duration-300 ${puertoActivo ? '-translate-x-full absolute opacity-0' : 'translate-x-0'}`}>
        <div className="mb-6 mt-2 text-center shrink-0">
          <div className="flex justify-center mb-2">
            <span className="bg-blue-900/40 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> MODO SOLO LECTURA
            </span>
          </div>
          <h2 className="text-xl font-black text-indigo-400">Trabajo en Campo</h2>
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
            <div key={p.ID} className="bg-[#0b132b] border border-slate-700 p-4 rounded-xl shadow-lg cursor-pointer active:scale-95 transition-transform" onClick={() => abrirDetalle(p)}>
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

      {/* VISTA 2: FICHA TÉCNICA EN ACORDEÓN */}
      <div className={`flex flex-col h-full w-full max-w-md mx-auto bg-[#050814] transition-transform duration-300 ${puertoActivo ? 'translate-x-0' : 'translate-x-full absolute opacity-0'}`}>
        {puertoActivo && (
          <>
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

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-10">
              
              {/* Bloque Identificación (Siempre visible, no es acordeón) */}
              <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-white font-black text-lg truncate mb-1">{puertoActivo.SERVICIO || 'Sin Cliente'}</h3>
                <p className="text-indigo-400 font-mono text-xs font-bold">Chasis: {puertoActivo.EQUIPO_HOTEL_ID || '-'} <span className="text-slate-500 mx-1">|</span> Puerto: {puertoActivo.PUERTO || '-'}</p>
              </div>

              {/* SECCIÓN: ESTADO OPERATIVO (Abierto por defecto) */}
              <SeccionDesplegable 
                titulo="Estado Operativo y Potencias" 
                icono={<Zap className="w-4 h-4"/>} 
                colorTexto="text-amber-500" 
                bgClass="bg-amber-950/20" 
                borderClass="border-amber-900/30"
                abiertoPorDefecto={true}
              >
                <InfoRow label="Estatus Físico" value={puertoActivo.ESTATUS} />
                <InfoRow label="Potencia HUB" value={puertoActivo.POTENCIA_HUB ? `${puertoActivo.POTENCIA_HUB} dBm` : '-'} />
                <InfoRow label="Potencia CPE" value={puertoActivo.POTENCIA_CPE ? `${puertoActivo.POTENCIA_CPE} dBm` : '-'} />
              </SeccionDesplegable>

              {/* SECCIÓN: LÓGICA Y ENRUTAMIENTO */}
              <SeccionDesplegable 
                titulo="Lógica y Enrutamiento" 
                icono={<Server className="w-4 h-4"/>} 
                colorTexto="text-blue-400"
              >
                <InfoRow label="IP Gestión" value={puertoActivo.IP_GESTION} />
                <InfoRow label="IP Cliente" value={puertoActivo.IP_CLIENTE} />
                <InfoRow label="BDI / VLAN" value={puertoActivo.BDI} />
              </SeccionDesplegable>

              {/* SECCIÓN: PLANTA EXTERNA */}
              <SeccionDesplegable 
                titulo="Planta Externa" 
                icono={<Activity className="w-4 h-4"/>} 
                colorTexto="text-emerald-400"
              >
                <InfoRow label="Ruta OSP" value={puertoActivo.RUTA} />
                <InfoRow label="Distancia" value={puertoActivo.DISTANCIA_CLIENTE} />
                <InfoRow label="Lambdas" value={puertoActivo.LAMBDAS} />
                <InfoRow label="Buffer" value={puertoActivo.BUFFER} />
                <InfoRow label="Hilos" value={puertoActivo.HILOS} />
              </SeccionDesplegable>

              {/* SECCIÓN: UBICACIÓN Y CONTACTO */}
              <SeccionDesplegable 
                titulo="Contacto y Sitio" 
                icono={<Users className="w-4 h-4"/>} 
                colorTexto="text-pink-400"
              >
                <InfoRow label="Nombre Contacto" value={puertoActivo.CONTACTO_NOMBRE} />
                <InfoRow label="Teléfono" value={puertoActivo.CONTACTO_TELEFONO} isPhone={true} />
                
                {puertoActivo.COORDENADAS ? (
                  <div className="mt-3 pt-3 border-t border-slate-800/50">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Coordenadas GPS</p>
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(puertoActivo.COORDENADAS)}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"
                    >
                      <Navigation className="w-4 h-4 text-emerald-400"/> Abrir en Google Maps
                    </a>
                  </div>
                ) : (
                  <InfoRow label="Coordenadas" value="No registradas" />
                )}
              </SeccionDesplegable>
              
              <div className="text-center pt-2">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Edición de datos restringida a la plataforma de escritorio.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}