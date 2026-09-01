import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, X, Activity, Server, Navigation, Users, ShieldAlert, Zap, 
  LogOut, ChevronDown, ChevronUp, Clock, Smartphone, Calculator, Wifi, 
  MapPin, Map, Scissors, Layers 
} from 'lucide-react';

export default function Cuadrilla({ token, handleLogout, estructuraGeografica = {} }) {
  // ================= ESTADO DE SEGURIDAD =================
  const [esMovil, setEsMovil] = useState(true);

  // ================= ESTADOS DE BÚSQUEDA Y FLUJO =================
  const [pestanaActiva, setPestanaActiva] = useState('FO'); 
  const [criterioBusqueda, setCriterioBusqueda] = useState('CLIENTE'); // 'CLIENTE' o 'RUTA'
  const [busqueda, setBusqueda] = useState('');
  
  const [resultadosFO, setResultadosFO] = useState([]);
  const [resultadosMW, setResultadosMW] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [puertoActivo, setPuertoActivo] = useState(null);

  const [busquedasRecientes, setBusquedasRecientes] = useState(() => {
    const guardadas = localStorage.getItem('mt_busquedas_recientes');
    return guardadas ? JSON.parse(guardadas) : [];
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // ================= NORMALIZADOR DE TEXTO =================
  const normalizarTexto = (texto) => {
    return String(texto || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // ================= EXTRACCIÓN DE HUBS GLOBALES =================
  const hubsDisponibles = useMemo(() => {
    const hubs = [];
    if (!estructuraGeografica) return hubs;
    Object.entries(estructuraGeografica).forEach(([region, dataReg]) => {
      if (dataReg.ciudades) {
        Object.entries(dataReg.ciudades).forEach(([ciudad, dataCd]) => {
          if (dataCd.hubs && Array.isArray(dataCd.hubs)) {
            dataCd.hubs.forEach(hub => hubs.push({ ...hub, ciudad, region }));
          }
        });
      }
    });
    return hubs;
  }, [estructuraGeografica]);

  // ================= HELPER: CÓDIGO DE COLORES TIA-598-C =================
  const obtenerColorFibra = (valor) => {
    if (!valor || valor === '-') return 'bg-slate-800 text-slate-400 border-slate-700';
    const str = String(valor).toUpperCase().trim();
    if (str.includes('AZUL') || str.includes('BLUE')) return 'bg-blue-600 text-white';
    if (str.includes('NARANJA') || str.includes('ORANGE')) return 'bg-orange-500 text-white';
    if (str.includes('VERDE') || str.includes('GREEN')) return 'bg-emerald-600 text-white';
    if (str.includes('CAFE') || str.includes('BROWN') || str.includes('CAFÉ')) return 'bg-amber-800 text-white';
    if (str.includes('GRIS') || str.includes('GREY') || str.includes('GRAY')) return 'bg-slate-500 text-white';
    if (str.includes('BLANCO') || str.includes('WHITE')) return 'bg-white text-slate-900 border border-slate-300 font-bold';
    if (str.includes('ROJO') || str.includes('RED')) return 'bg-red-600 text-white';
    if (str.includes('NEGRO') || str.includes('BLACK')) return 'bg-slate-900 text-white border border-slate-700';
    if (str.includes('AMARILLO') || str.includes('YELLOW')) return 'bg-yellow-400 text-slate-950 font-bold';
    if (str.includes('VIOLETA') || str.includes('PURPLE') || str.includes('MORADO')) return 'bg-purple-600 text-white';
    if (str.includes('ROSA') || str.includes('PINK')) return 'bg-pink-500 text-white';
    if (str.includes('AQUA') || str.includes('CYAN')) return 'bg-cyan-500 text-slate-950 font-bold';
    return 'bg-indigo-950 text-indigo-300 border border-indigo-700/50';
  };

  // ================= EFECTO: FINGERPRINT DE DISPOSITIVO =================
  useEffect(() => {
    const verificarDispositivo = () => {
      const anchoFisico = window.innerWidth < 1024;
      const agenteCelular = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setEsMovil(!(!anchoFisico && !agenteCelular));
    };
    verificarDispositivo();
    window.addEventListener('resize', verificarDispositivo);
    return () => window.removeEventListener('resize', verificarDispositivo);
  }, []);

  const calcularSubred = (cidr) => {
    if (!cidr || typeof cidr !== 'string' || !cidr.includes('/')) return null;
    try {
      const [ip, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
      const ipParts = ip.split('.').map(Number);
      if (ipParts.length !== 4 || ipParts.some(isNaN)) return null;

      const ipInt = ((ipParts[0] << 24) >>> 0) + ((ipParts[1] << 16) >>> 0) + ((ipParts[2] << 8) >>> 0) + ipParts[3];
      const maskInt = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      const networkInt = (ipInt & maskInt) >>> 0;
      const invertedMask = (~maskInt) >>> 0;
      const broadcastInt = (networkInt | invertedMask) >>> 0;
      const intToIp = (int) => [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');

      let firstUsable = networkInt, lastUsable = broadcastInt, hosts = 0;
      if (prefix < 31) {
        firstUsable = networkInt + 1; lastUsable = broadcastInt - 1; hosts = (lastUsable - firstUsable) + 1;
      } else if (prefix === 31) { hosts = 2; } else if (prefix === 32) { hosts = 1; }

      return { mask: intToIp(maskInt), rango: `${intToIp(firstUsable)} - ${intToIp(lastUsable)}`, hosts: hosts };
    } catch (e) { return null; }
  };

  // ================= BÚSQUEDA Y FILTRADO INTELIGENTE =================
  const ejecutarBusqueda = async (termino, criterioActivo) => {
    if (!termino || termino.length < 3) return alert("Ingresa un término válido para buscar (mínimo 3 letras)");
    
    setCargando(true);
    setPuertoActivo(null);
    setResultadosFO([]);
    setResultadosMW([]);
    
    try {
      let resultsFO = [];
      let resultsMW = [];
      const termNorm = normalizarTexto(termino);

      if (criterioActivo === 'RUTA') {
          // 🚨 El backend NO indexa RUTA globalmente. Recorremos los HUBs de forma invisible para la cuadrilla.
          if (hubsDisponibles.length === 0) {
              alert("Aún no se han sincronizado los HUBs. Por favor recarga o contacta al administrador.");
              setCargando(false);
              return;
          }

          const promesasHubs = hubsDisponibles.map(h => 
              fetch(`${API_URL}/api/hubs?id_hub=${h.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          );
          
          const respuestasHubs = await Promise.all(promesasHubs);
          let puertosGlobales = [];
          
          respuestasHubs.forEach(hubData => {
              if (hubData && hubData.puertos) {
                  puertosGlobales = [...puertosGlobales, ...hubData.puertos];
              }
          });

          // Filtro estricto de ruta en memoria RAM
          resultsFO = puertosGlobales
              .filter(p => normalizarTexto(p.RUTA || p.ruta).includes(termNorm))
              .map(item => ({ ...item, _tipo: 'FO' }));

      } else {
          // Búsqueda Clásica (Cliente / ID / IP) soportada por Backend
          const [resFO, resMW] = await Promise.all([
            fetch(`${API_URL}/api/ports/search?q=${encodeURIComponent(termino)}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
            fetch(`${API_URL}/api/microondas?q=${encodeURIComponent(termino)}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
          ]);

          if (resFO?.ok) {
              const dataFO = await resFO.json();
              let rawFO = (dataFO.data || []).map(item => ({ ...item, _tipo: 'FO' }));

              resultsFO = rawFO.filter(p => 
                  normalizarTexto(p.SERVICIO).includes(termNorm) || 
                  normalizarTexto(p.PUERTO).includes(termNorm) || 
                  normalizarTexto(p.IP_GESTION).includes(termNorm)
              );
          }

          if (resMW?.ok) {
              const dataMW = await resMW.json();
              const rawMW = Array.isArray(dataMW.data) ? dataMW.data : (Array.isArray(dataMW) ? dataMW : []);
              resultsMW = rawMW.map(item => ({ ...item, _tipo: 'MW' }));
          }
      }

      setResultadosFO(resultsFO);
      setResultadosMW(resultsMW);

      // Auto-seleccionar la pestaña pertinente
      if (resultsFO.length > 0 && resultsMW.length === 0) setPestanaActiva('FO');
      if (resultsMW.length > 0 && resultsFO.length === 0) setPestanaActiva('MW');

      const terminoLimpio = termino.trim();
      const nuevaLista = [terminoLimpio, ...busquedasRecientes.filter(b => b.toLowerCase() !== terminoLimpio.toLowerCase())].slice(0, 5);
      setBusquedasRecientes(nuevaLista);
      localStorage.setItem('mt_busquedas_recientes', JSON.stringify(nuevaLista));

    } catch (err) {
      alert("Error de conexión al consultar la base de datos.");
    } finally {
      setCargando(false);
    }
  };

  const abrirDetalle = (puerto) => setPuertoActivo(puerto);
  const cerrarSesion = () => {
    if (handleLogout) handleLogout();
    else { localStorage.clear(); window.location.href = '/'; }
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
        <div className="flex justify-between items-center cursor-pointer active:bg-slate-800/50 rounded -mx-1 px-1 transition-colors" onClick={() => setAbierto(!abierto)}>
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">{label} <Calculator className="w-3 h-3 text-indigo-400" /></span>
          <span className="text-[11px] text-blue-400 font-mono font-black text-right border-b border-dashed border-blue-400/50 pb-0.5">
            <a style={{color: 'inherit', textDecoration: 'none', cursor: 'pointer'}}>{value}</a>
          </span>
        </div>
        {abierto && (
          <div className="mt-3 bg-[#1c2541]/40 rounded-lg p-3 border border-indigo-500/20 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 shadow-inner">
            <div><p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Máscara</p><p className="text-[11px] text-slate-200 font-mono font-bold">{detallesSubred.mask}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Hosts Útiles</p><p className="text-[11px] text-slate-200 font-mono font-bold">{detallesSubred.hosts} IPs</p></div>
            <div className="col-span-2 pt-1 mt-1 border-t border-slate-800"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Rango Asignable</p><p className="text-[11px] text-emerald-400 font-mono font-black">{detallesSubred.rango}</p></div>
          </div>
        )}
      </div>
    );
  };

  const SeccionDesplegable = ({ titulo, icono, children, colorTexto, bgClass="bg-[#0b132b]", borderClass="border-slate-800", abiertoPorDefecto = false }) => {
    const [abierto, setAbierto] = useState(abiertoPorDefecto);
    return (
      <div className={`${bgClass} border ${borderClass} rounded-xl shadow-sm overflow-hidden transition-all duration-300`}>
        <button onClick={() => setAbierto(!abierto)} className={`w-full p-4 flex justify-between items-center transition-colors outline-none active:bg-slate-800/50 ${abierto ? `border-b ${borderClass}` : ''}`}>
          <h3 className={`${colorTexto} font-black text-[11px] uppercase tracking-widest flex items-center gap-2`}>{icono} {titulo}</h3>
          {abierto ? <ChevronUp className={`w-4 h-4 ${colorTexto}`} /> : <ChevronDown className={`w-4 h-4 text-slate-500`} />}
        </button>
        {abierto && <div className="p-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>}
      </div>
    );
  };

  const resultadosActuales = pestanaActiva === 'FO' ? resultadosFO : resultadosMW;

  // ================= PANTALLA DE BLOQUEO (DESKTOP) =================
  if (!esMovil) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#050814] text-white p-6 text-center">
        <div className="bg-red-900/20 p-6 rounded-full mb-6 border border-red-500/30 animate-pulse"><Smartphone className="w-16 h-16 text-red-500" /></div>
        <h1 className="text-3xl font-black text-slate-100 mb-3 tracking-tight">Acceso Restringido</h1>
        <p className="text-slate-400 mb-8 max-w-md text-sm leading-relaxed">El <strong>Modo Cuadrilla</strong> es una herramienta táctica de uso exclusivo en campo. Su visualización se encuentra bloqueada en computadoras de escritorio.</p>
        <button onClick={() => window.location.href = '/'} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] py-3.5 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95">Volver a la Plataforma Web</button>
      </div>
    );
  }

  // ================= PANTALLA PRINCIPAL (MÓVIL) =================
  return (
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[9999] bg-[#050814] flex flex-col overflow-hidden">
      
      <style>{`header, nav, aside { display: none !important; } body { overflow: hidden !important; }`}</style>

      {/* BARRA SUPERIOR MÍNIMA */}
      <div className="bg-[#0b132b] border-b border-slate-800 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex justify-between items-start shrink-0 shadow-md relative z-20">
        <div className="flex flex-col gap-1.5">
            <h1 className="text-slate-100 font-black text-lg tracking-widest flex items-center gap-2 leading-none">MT<span className="text-indigo-500">_MANAGER</span></h1>
            <span className="bg-blue-900/40 text-blue-400 text-[9px] font-black px-2.5 py-0.5 rounded-full border border-blue-800 flex items-center gap-1 w-max"><ShieldAlert className="w-3 h-3" /> SOLO LECTURA</span>
        </div>
        <button onClick={cerrarSesion} className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 active:bg-slate-700 active:scale-95 transition-all shadow-sm mt-0.5"><LogOut className="w-3.5 h-3.5 text-red-400" /> Salir</button>
      </div>

      <div className={`flex flex-col h-full w-full max-w-md mx-auto p-4 transition-transform duration-300 ${puertoActivo ? '-translate-x-full absolute opacity-0' : 'translate-x-0'}`}>
        
        {/* ENCABEZADO Y TÍTULO */}
        <div className="mb-6 mt-2 text-center shrink-0">
          <h2 className="text-2xl font-black text-indigo-400 mb-1">Trabajo en Campo</h2>
          <p className="text-slate-400 text-sm">Busca el cliente, puerto o enlace</p>
        </div>

        {/* 1. SELECCIÓN DE TECNOLOGÍA */}
        <div className="flex gap-3 mb-6 shrink-0">
            <button
              onClick={() => { setPestanaActiva('FO'); setBusqueda(''); setResultadosFO([]); setResultadosMW([]); }}
              className={`flex-1 py-3.5 px-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${pestanaActiva === 'FO' ? 'bg-[#4f46e5] text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-[#1c2541] text-slate-400 border border-slate-800'}`}
            >
              <Server className="w-4 h-4" /> F. Óptica
            </button>
            <button
              onClick={() => { setPestanaActiva('MW'); setBusqueda(''); setResultadosFO([]); setResultadosMW([]); }}
              className={`flex-1 py-3.5 px-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${pestanaActiva === 'MW' ? 'bg-[#4f46e5] text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-[#1c2541] text-slate-400 border border-slate-800'}`}
            >
              <Wifi className="w-4 h-4" /> Microondas
            </button>
        </div>

        {/* 2. BUSCADOR GLOBAL */}
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 shrink-0">
          
          {/* TABS DE CRITERIO */}
          <div className="flex gap-2 mb-4 bg-[#050814] p-1.5 rounded-xl border border-slate-800 shrink-0">
            <button onClick={() => { setCriterioBusqueda('CLIENTE'); setBusqueda(''); }} className={`flex-1 text-[11px] font-black uppercase py-3 rounded-lg transition-colors ${criterioBusqueda === 'CLIENTE' ? 'bg-[#4f46e5] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Cliente / ID</button>
            <button onClick={() => { setCriterioBusqueda('RUTA'); setBusqueda(''); }} className={`flex-1 text-[11px] font-black uppercase py-3 rounded-lg transition-colors ${criterioBusqueda === 'RUTA' ? 'bg-[#4f46e5] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Ruta FO</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ejecutarBusqueda(busqueda, criterioBusqueda); }} className="relative mb-6">
            <input 
              type="text" 
              placeholder={criterioBusqueda === 'RUTA' ? "Ej. RT20, RUTA-NORTE-04..." : "Ej. Banamex, Nodo Centro..."} 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#0b132b] text-white text-lg p-4 pl-12 rounded-2xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none focus:border-indigo-400 transition-colors"
            />
            
            <Search className="absolute left-4 top-[18px] w-6 h-6 text-indigo-400 pointer-events-none" />
            
            {busqueda.length > 0 && (
              <button type="button" onClick={() => { setBusqueda(''); setResultadosFO([]); setResultadosMW([]); }} className="absolute right-4 top-[18px] text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            )}
            <button type="submit" className="hidden">Buscar</button>
          </form>
        </div>

        {/* HISTORIAL RECIENTE */}
        {!cargando && resultadosFO.length === 0 && resultadosMW.length === 0 && busquedasRecientes.length > 0 && busqueda.length === 0 && (
          <div className="mb-6 animate-in fade-in shrink-0">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Búsquedas Recientes</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {busquedasRecientes.map((termino, idx) => (
                <button
                  key={idx}
                  onClick={() => { setBusqueda(termino); ejecutarBusqueda(termino, criterioBusqueda); }}
                  className="bg-[#1c2541] hover:bg-slate-700 text-indigo-300 font-bold text-[11px] px-4 py-2 rounded-full border border-slate-700 transition-colors active:scale-95 shadow-sm"
                >
                  {termino}
                </button>
              ))}
            </div>
          </div>
        )}

        {cargando && <p className="text-center text-indigo-400 animate-pulse font-bold flex justify-center items-center gap-2 mt-4"><Activity className="w-5 h-5"/> Consultando Base de Datos...</p>}

        {/* LISTADO DE RESULTADOS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-10">
          
          {resultadosActuales.length === 0 && !cargando && busqueda.length > 2 && (resultadosFO.length > 0 || resultadosMW.length > 0) && (
             <p className="text-center text-slate-500 text-sm italic mt-4">No hay resultados con los filtros actuales.</p>
          )}

          {resultadosFO.length === 0 && resultadosMW.length === 0 && !cargando && busqueda.length > 2 && (
            <p className="text-center text-slate-500 text-sm italic mt-4">No se encontraron coincidencias.</p>
          )}
          
          {resultadosActuales.map((p, idx) => {
            const estatusStr = String(p.ESTATUS || p.estatus || '').toUpperCase();
            const rutaNombre = p.RUTA || p.ruta;
            const bufferVal = p.BUFFER || p.buffer;
            const hiloVal = p.HILOS || p.hilos || p.hilo;
            
            return (
              <div 
                key={p.ID || p.id || idx} 
                className="bg-[#0b132b] border border-slate-700 p-4 rounded-xl shadow-lg cursor-pointer active:scale-95 transition-transform relative overflow-hidden animate-in fade-in slide-in-from-bottom-2" 
                onClick={() => abrirDetalle(p)}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-black text-slate-100 text-lg">{p._tipo === 'FO' ? (p.PUERTO || '-') : (p.cliente || 'Enlace MW')}</h3>
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black border uppercase ${estatusStr.includes('ACTIVO') ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : estatusStr.includes('DISPONIBLE') ? 'bg-slate-800 text-slate-400 border-slate-600' : estatusStr.includes('SUSPENDIDO') ? 'bg-red-900/30 text-red-400 border-red-500/50' : 'bg-amber-900/30 text-amber-400 border-amber-500/50'}`}>
                    {estatusStr || 'DESCONOCIDO'}
                  </span>
                </div>
                
                <p className="text-[13px] text-indigo-300 font-bold mb-2 truncate">
                  {p._tipo === 'FO' ? (p.SERVICIO || 'Sin cliente asignado') : (p.sitio_base || 'Sitio Desconocido')}
                </p>

                {/* VISTA RÁPIDA DE EMPALME */}
                {p._tipo === 'FO' && (rutaNombre || bufferVal || hiloVal) && (
                  <div className="mb-3 p-2 bg-[#050814]/80 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                    {rutaNombre && (
                      <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1">
                        <Map className="w-3 h-3 text-emerald-500 shrink-0" /> {rutaNombre}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      {bufferVal && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm flex items-center gap-1 ${obtenerColorFibra(bufferVal)}`}>
                          <Layers className="w-2.5 h-2.5 opacity-70" /> {bufferVal}
                        </span>
                      )}
                      {hiloVal && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm flex items-center gap-1 ${obtenerColorFibra(hiloVal)}`}>
                          <Scissors className="w-2.5 h-2.5 opacity-70" /> {hiloVal}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    {p._tipo === 'FO' ? <Server className="w-3 h-3 text-slate-500" /> : <Wifi className="w-3 h-3 text-slate-500" />}
                    {p._tipo === 'FO' ? 'F. Óptica' : 'Microondas'}
                  </span>
                  {(p.IP_GESTION || p.ip_gestion_st || p.ip_gestion_ap) && (
                    <span className="text-emerald-400 bg-emerald-900/20 px-1.5 rounded">
                      {p.IP_GESTION || p.ip_gestion_st || p.ip_gestion_ap}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FICHA TÉCNICA DINÁMICA LATERAL/MODAL */}
      <div className={`flex flex-col h-full w-full max-w-md mx-auto bg-[#050814] transition-transform duration-300 ${puertoActivo ? 'translate-x-0' : 'translate-x-full absolute opacity-0'}`}>
        {puertoActivo && (
          <>
            <div className="bg-[#0b132b] p-4 flex justify-between items-center border-b border-slate-800 shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <button onClick={() => setPuertoActivo(null)} className="p-2 bg-slate-800 rounded-full text-slate-300 active:bg-slate-700 transition-colors"><X className="w-5 h-5" /></button>
                <div>
                  <h2 className={`font-black text-sm uppercase tracking-widest leading-none ${puertoActivo._tipo === 'FO' ? 'text-indigo-400' : 'text-blue-400'}`}>Ficha Técnica {puertoActivo._tipo}</h2>
                  <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{puertoActivo._tipo === 'FO' ? (puertoActivo.SERVICIO || puertoActivo.PUERTO) : (puertoActivo.cliente || puertoActivo.sitio_base)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-10">
              
              {/* === VISTA DETALLE FIBRA ÓPTICA === */}
              {puertoActivo._tipo === 'FO' && (
                <>
                  <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                    <h3 className="text-white font-black text-lg truncate mb-1">{puertoActivo.SERVICIO || 'Sin Cliente'}</h3>
                    <p className="text-indigo-400 font-mono text-xs font-bold flex items-center gap-1.5"><Server className="w-3.5 h-3.5"/> Puerto Físico: {puertoActivo.PUERTO || '-'}</p>
                  </div>

                  <SeccionDesplegable titulo="Estado Operativo y Potencias" icono={<Zap className="w-4 h-4"/>} colorTexto="text-amber-500" bgClass="bg-amber-950/20" borderClass="border-amber-900/30" abiertoPorDefecto={true}>
                    <InfoRow label="Estatus Físico" value={puertoActivo.ESTATUS} />
                    <InfoRow label="Potencia HUB" value={puertoActivo.POTENCIA_HUB ? `${puertoActivo.POTENCIA_HUB} dBm` : '-'} />
                    <InfoRow label="Potencia CPE" value={puertoActivo.POTENCIA_CPE ? `${puertoActivo.POTENCIA_CPE} dBm` : '-'} />
                  </SeccionDesplegable>

                  <SeccionDesplegable titulo="Lógica y Enrutamiento" icono={<Server className="w-4 h-4"/>} colorTexto="text-blue-400">
                    <InfoRowIP label="IP Gestión" value={puertoActivo.IP_GESTION} />
                    <InfoRowIP label="IP Cliente" value={puertoActivo.IP_CLIENTE} />
                    <InfoRow label="BDI / VLAN" value={puertoActivo.BDI} />
                  </SeccionDesplegable>

                  <SeccionDesplegable titulo="Planta Externa y Empalme" icono={<Activity className="w-4 h-4"/>} colorTexto="text-emerald-400" abiertoPorDefecto={true}>
                    <InfoRow label="Ruta OSP" value={puertoActivo.RUTA} />
                    <InfoRow label="Distancia" value={puertoActivo.DISTANCIA_CLIENTE} />
                    <InfoRow label="Lambdas" value={puertoActivo.LAMBDAS} />
                    
                    <div className="flex justify-between items-center py-2.5 border-b border-slate-800/50">
                      <span className="text-[11px] text-slate-400 font-medium">Buffer (Tubo)</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${obtenerColorFibra(puertoActivo.BUFFER)}`}>{puertoActivo.BUFFER || '-'}</span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 border-b border-slate-800/50">
                      <span className="text-[11px] text-slate-400 font-medium">Hilo (Fibra)</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${obtenerColorFibra(puertoActivo.HILOS)}`}><Scissors className="w-3 h-3" /> {puertoActivo.HILOS || '-'}</span>
                    </div>
                  </SeccionDesplegable>

                  <SeccionDesplegable titulo="Contacto y Sitio" icono={<Users className="w-4 h-4"/>} colorTexto="text-pink-400">
                    <InfoRow label="Nombre Contacto" value={puertoActivo.CONTACTO_NOMBRE} />
                    <InfoRow label="Teléfono" value={puertoActivo.CONTACTO_TELEFONO} isPhone={true} />
                    {puertoActivo.COORDENADAS ? (
                      <div className="mt-3 pt-3 border-t border-slate-800/50">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Coordenadas GPS</p>
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(puertoActivo.COORDENADAS)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"><Navigation className="w-4 h-4 text-emerald-400"/> Abrir en Google Maps</a>
                      </div>
                    ) : (<InfoRow label="Coordenadas" value="No registradas" />)}
                  </SeccionDesplegable>
                </>
              )}

              {/* === VISTA DETALLE MICROONDAS === */}
              {puertoActivo._tipo === 'MW' && (
                <>
                  <div className="bg-[#0b132b] border border-slate-800 rounded-xl p-4 shadow-sm">
                    <h3 className="text-white font-black text-lg truncate mb-1">{puertoActivo.cliente || 'Sin Cliente'}</h3>
                    <p className="text-blue-400 font-mono text-xs font-bold flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5"/> Sitio Base: {puertoActivo.sitio_base || '-'}</p>
                  </div>

                  <SeccionDesplegable titulo="Radiofrecuencia e Interfaz" icono={<Activity className="w-4 h-4"/>} colorTexto="text-amber-500" bgClass="bg-amber-950/20" borderClass="border-amber-900/30" abiertoPorDefecto={true}>
                    <InfoRow label="Estatus Enlace" value={puertoActivo.estatus} />
                    <InfoRow label="Frecuencia AP" value={puertoActivo.frecuencia ? `${puertoActivo.frecuencia} MHz` : '-'} />
                    <InfoRow label="SSID Torre" value={puertoActivo.ssid} />
                    <InfoRow label="Señal RX (Torre)" value={puertoActivo.senal_rx_ap ? `${puertoActivo.senal_rx_ap} dBm` : '-'} />
                    <InfoRow label="Señal RX (Cliente)" value={puertoActivo.senal_rx_st ? `${puertoActivo.senal_rx_st} dBm` : '-'} />
                  </SeccionDesplegable>

                  <SeccionDesplegable titulo="Lógica y Equipamiento" icono={<Server className="w-4 h-4"/>} colorTexto="text-blue-400">
                    <InfoRowIP label="IP Gestión (AP)" value={puertoActivo.ip_gestion_ap} />
                    <InfoRowIP label="IP Gestión (CPE)" value={puertoActivo.ip_gestion_st} />
                    <InfoRow label="Modelo CPE" value={puertoActivo.modelo_st} />
                    <InfoRow label="MAC CPE" value={puertoActivo.mac_st} />
                  </SeccionDesplegable>

                  <SeccionDesplegable titulo="Ubicación y Sitio" icono={<MapPin className="w-4 h-4"/>} colorTexto="text-emerald-400">
                    <InfoRow label="Dirección" value={puertoActivo.direccion} />
                    <InfoRow label="Distancia Torre" value={puertoActivo.distancia_km ? `${puertoActivo.distancia_km} km` : '-'} />
                    
                    {puertoActivo.coordenadas ? (
                      <div className="mt-3 pt-3 border-t border-slate-800/50">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Coordenadas GPS</p>
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(puertoActivo.coordenadas)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"><Navigation className="w-4 h-4 text-emerald-400"/> Abrir en Google Maps</a>
                      </div>
                    ) : (<InfoRow label="Coordenadas" value="No registradas" />)}
                  </SeccionDesplegable>
                </>
              )}

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