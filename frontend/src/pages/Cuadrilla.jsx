import React, { useState, useEffect } from 'react';
import { Search, X, Activity, Server, Navigation, Users, ShieldAlert, Zap, LogOut, ChevronDown, ChevronUp, Clock, Smartphone, Calculator } from 'lucide-react';

export default function Cuadrilla({ token, handleLogout }) {
  // ================= ESTADO DE SEGURIDAD =================
  const [esMovil, setEsMovil] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [puertoActivo, setPuertoActivo] = useState(null);

  const [busquedasRecientes, setBusquedasRecientes] = useState(() => {
    const guardadas = localStorage.getItem('mt_busquedas_recientes');
    return guardadas ? JSON.parse(guardadas) : [];
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // ================= EFECTO: FINGERPRINT DE DISPOSITIVO =================
  useEffect(() => {
    const verificarDispositivo = () => {
      const anchoFisico = window.innerWidth < 1024;
      const agenteCelular = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (!anchoFisico && !agenteCelular) {
        setEsMovil(false);
      } else {
        setEsMovil(true);
      }
    };

    verificarDispositivo();
    window.addEventListener('resize', verificarDispositivo);
    return () => window.removeEventListener('resize', verificarDispositivo);
  }, []);

  // ================= LÓGICA DE SUBREDES (CIDR) =================
  const calcularSubred = (cidr) => {
    if (!cidr || typeof cidr !== 'string' || !cidr.includes('/')) return null;
    try {
      const [ip, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;

      const ipParts = ip.split('.').map(Number);
      if (ipParts.length !== 4 || ipParts.some(isNaN)) return null;

      // Operaciones seguras a 32-bits sin signo
      const ipInt = ((ipParts[0] << 24) >>> 0) + ((ipParts[1] << 16) >>> 0) + ((ipParts[2] << 8) >>> 0) + ipParts[3];
      const maskInt = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      const networkInt = (ipInt & maskInt) >>> 0;
      const invertedMask = (~maskInt) >>> 0;
      const broadcastInt = (networkInt | invertedMask) >>> 0;

      const intToIp = (int) => [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');

      let firstUsable = networkInt;
      let lastUsable = broadcastInt;
      let hosts = 0;

      if (prefix < 31) {
        firstUsable = networkInt + 1;
        lastUsable = broadcastInt - 1;
        hosts = (lastUsable - firstUsable) + 1;
      } else if (prefix === 31) {
        hosts = 2; // Punto a punto
      } else if (prefix === 32) {
        hosts = 1; // Un solo host
      }

      return {
        mask: intToIp(maskInt),
        rango: `${intToIp(firstUsable)} - ${intToIp(lastUsable)}`,
        hosts: hosts
      };
    } catch (e) {
      return null;
    }
  };

  // ================= FUNCIONES DE LÓGICA =================
  const ejecutarBusqueda = async (termino) => {
    if (!termino || termino.length < 3) return alert("Escribe al menos 3 letras para buscar");
    
    setCargando(true);
    setPuertoActivo(null);
    
    try {
      const res = await fetch(`${API_URL}/api/ports/search?q=${encodeURIComponent(termino)}`, {
        headers: { 'Authorization': `Bearer ${token}` },credentials: 'include'
      });
      const json = await res.json();
      
      if (json.status === 'success') {
        setResultados(json.data);
        const terminoLimpio = termino.trim();
        const nuevaLista = [terminoLimpio, ...busquedasRecientes.filter(b => b.toLowerCase() !== terminoLimpio.toLowerCase())].slice(0, 5);
        setBusquedasRecientes(nuevaLista);
        localStorage.setItem('mt_busquedas_recientes', JSON.stringify(nuevaLista));
      } else {
        alert("Fallo interno del servidor: " + json.detail);
      }
    } catch (err) {
      alert("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const abrirDetalle = (puerto) => setPuertoActivo(puerto);

  const cerrarSesion = () => {
    if (handleLogout) handleLogout();
    else {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  // ================= COMPONENTES VISUALES =================
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
        <span className="text-[11px] text-slate-100 font-mono font-bold text-right w-1/2 truncate">
          {/* El tag <a> vacío bloquea el Data Detector de iOS/Android para que no convierta números en links */}
          <a style={{color: 'inherit', textDecoration: 'none', cursor: 'text'}}>{value || '-'}</a>
        </span>
      )}
    </div>
  );

  const InfoRowIP = ({ label, value }) => {
    const [abierto, setAbierto] = useState(false);
    const detallesSubred = calcularSubred(value);

    if (!value || value === '-') return <InfoRow label={label} value="-" />;
    if (!detallesSubred) return <InfoRow label={label} value={value} />;

    return (
      <div className="py-2.5 border-b border-slate-800/50 last:border-0 flex flex-col">
        <div 
          className="flex justify-between items-center cursor-pointer active:bg-slate-800/50 rounded -mx-1 px-1 transition-colors"
          onClick={() => setAbierto(!abierto)}
        >
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            {label} <Calculator className="w-3 h-3 text-indigo-400" />
          </span>
          <span className="text-[11px] text-blue-400 font-mono font-black text-right border-b border-dashed border-blue-400/50 pb-0.5">
            <a style={{color: 'inherit', textDecoration: 'none', cursor: 'pointer'}}>{value}</a>
          </span>
        </div>
        {abierto && (
          <div className="mt-3 bg-[#1c2541]/40 rounded-lg p-3 border border-indigo-500/20 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 shadow-inner">
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Máscara</p>
              <p className="text-[11px] text-slate-200 font-mono font-bold">{detallesSubred.mask}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Hosts Útiles</p>
              <p className="text-[11px] text-slate-200 font-mono font-bold">{detallesSubred.hosts} IPs</p>
            </div>
            <div className="col-span-2 pt-1 mt-1 border-t border-slate-800">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Rango Asignable (Gateway Recomendado)</p>
              <p className="text-[11px] text-emerald-400 font-mono font-black">{detallesSubred.rango}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

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

  // ================= PANTALLA DE BLOQUEO (DESKTOP) =================
  if (!esMovil) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#050814] text-white p-6 text-center">
        <div className="bg-red-900/20 p-6 rounded-full mb-6 border border-red-500/30 animate-pulse">
          <Smartphone className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-100 mb-3 tracking-tight">Acceso Restringido</h1>
        <p className="text-slate-400 mb-8 max-w-md text-sm leading-relaxed">
          El <strong>Modo Cuadrilla</strong> es una herramienta táctica de uso exclusivo en campo. 
          Su visualización se encuentra bloqueada en computadoras de escritorio.
        </p>
        <button 
          onClick={() => window.location.href = '/'} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] py-3.5 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95"
        >
          Volver a la Plataforma Web
        </button>
      </div>
    );
  }

  // ================= PANTALLA PRINCIPAL (MÓVIL) =================
  return (
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[9999] bg-[#050814] flex flex-col overflow-hidden">
      
      <style>{`
        header, nav, aside { display: none !important; }
        body { overflow: hidden !important; }
      `}</style>

      {/* BARRA SUPERIOR */}
      <div className="bg-[#0b132b] border-b border-slate-800 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex justify-between items-center shrink-0 shadow-md relative z-20">
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

      {/* BUSCADOR */}
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

        <form onSubmit={(e) => { e.preventDefault(); ejecutarBusqueda(busqueda); }} className="relative mb-6 shrink-0">
          <input 
            type="text" 
            placeholder="Ej. Banamex, Nodo Centro..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#0b132b] text-white text-lg p-4 pl-12 rounded-2xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none focus:border-indigo-400 transition-colors"
          />
          <Search className="absolute left-4 top-4.5 w-6 h-6 text-indigo-400" />
          
          {busqueda.length > 0 && (
            <button type="button" onClick={() => { setBusqueda(''); setResultados([]); }} className="absolute right-4 top-4.5 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-6 h-6" />
            </button>
          )}
          <button type="submit" className="hidden">Buscar</button>
        </form>

        {/* HISTORIAL */}
        {!cargando && resultados.length === 0 && busquedasRecientes.length > 0 && busqueda.length === 0 && (
          <div className="mb-6 animate-in fade-in shrink-0">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Búsquedas Recientes</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {busquedasRecientes.map((termino, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setBusqueda(termino);
                    ejecutarBusqueda(termino);
                  }}
                  className="bg-[#1c2541] hover:bg-slate-700 text-indigo-300 font-bold text-[11px] px-4 py-2 rounded-full border border-slate-700 transition-colors active:scale-95 shadow-sm"
                >
                  {termino}
                </button>
              ))}
            </div>
          </div>
        )}

        {cargando && <p className="text-center text-indigo-400 animate-pulse font-bold flex justify-center items-center gap-2"><Activity className="w-5 h-5"/> Consultando MT_DB...</p>}

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
                {/* ID DE EQUIPO ELIMINADO POR REGLA DE SEGURIDAD */}
                <span className="flex items-center gap-1"><Server className="w-3 h-3 text-slate-500" /> Equipo Óptico</span>
                {p.IP_GESTION && <span className="text-emerald-400 bg-emerald-900/20 px-1.5 rounded">{p.IP_GESTION}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FICHA TÉCNICA */}
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
              
              <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-white font-black text-lg truncate mb-1">{puertoActivo.SERVICIO || 'Sin Cliente'}</h3>
                {/* ID DE EQUIPO ELIMINADO POR REGLA DE SEGURIDAD */}
                <p className="text-indigo-400 font-mono text-xs font-bold">Puerto Físico: {puertoActivo.PUERTO || '-'}</p>
              </div>

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

              <SeccionDesplegable 
                titulo="Lógica y Enrutamiento" 
                icono={<Server className="w-4 h-4"/>} 
                colorTexto="text-blue-400"
              >
                <InfoRowIP label="IP Gestión" value={puertoActivo.IP_GESTION} />
                <InfoRowIP label="IP Cliente" value={puertoActivo.IP_CLIENTE} />
                <InfoRow label="BDI / VLAN" value={puertoActivo.BDI} />
              </SeccionDesplegable>

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
                      href={`https://maps.google.com/?q=$${encodeURIComponent(puertoActivo.COORDENADAS)}`} 
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