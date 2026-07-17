import React, { useState, useEffect } from 'react';
import { Search, X, Activity, Server, Navigation, Users, ShieldAlert, Zap, LogOut, ChevronDown, ChevronUp, Clock, Smartphone, Calculator, Wifi, MapPin } from 'lucide-react';

export default function Cuadrilla({ token, handleLogout }) {
  // ================= ESTADO DE SEGURIDAD =================
  const [esMovil, setEsMovil] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  
  // ================= ESTADOS PARA MULTI-TECNOLOGÍA =================
  const [resultadosFO, setResultadosFO] = useState([]);
  const [resultadosMW, setResultadosMW] = useState([]);
  const [pestanaActiva, setPestanaActiva] = useState('FO'); // 'FO' o 'MW'
  
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
        hosts = 2; 
      } else if (prefix === 32) {
        hosts = 1; 
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
    setResultadosFO([]);
    setResultadosMW([]);
    
    try {
      // Realizamos ambas peticiones en paralelo
      const [resFO, resMW] = await Promise.all([
        fetch(`${API_URL}/api/ports/search?q=${encodeURIComponent(termino)}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/api/microondas?q=${encodeURIComponent(termino)}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
      ]);

      let dataFO = { status: 'error', data: [] };
      let dataMW = { data: [] };

      if (resFO && resFO.ok) dataFO = await resFO.json();
      if (resMW && resMW.ok) dataMW = await resMW.json();
      
      // Mapear resultados agregando el "tipo" para distinguir la ficha técnica
      let resultsFO = [];
      let resultsMW = [];

      if (dataFO.status === 'success' || Array.isArray(dataFO.data)) {
        resultsFO = (dataFO.data || []).map(item => ({ ...item, _tipo: 'FO' }));
      }
      if (Array.isArray(dataMW.data)) {
        resultsMW = (dataMW.data || []).map(item => ({ ...item, _tipo: 'MW' }));
      } else if (Array.isArray(dataMW)) {
        resultsMW = dataMW.map(item => ({ ...item, _tipo: 'MW' }));
      }

      setResultadosFO(resultsFO);
      setResultadosMW(resultsMW);

      // Auto-seleccionar la pestaña que tenga resultados si la actual está vacía
      if (resultsFO.length > 0 && resultsMW.length === 0) setPestanaActiva('FO');
      if (resultsMW.length > 0 && resultsFO.length === 0) setPestanaActiva('MW');

      const terminoLimpio = termino.trim();
      const nuevaLista = [terminoLimpio, ...busquedasRecientes.filter(b => b.toLowerCase() !== terminoLimpio.toLowerCase())].slice(0, 5);
      setBusquedasRecientes(nuevaLista);
      localStorage.setItem('mt_busquedas_recientes', JSON.stringify(nuevaLista));

    } catch (err) {
      alert("Error de conexión al consultar el espectro.");
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

  const resultadosActuales = pestanaActiva === 'FO' ? resultadosFO : resultadosMW;

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

      {/* PANEL DE BÚSQUEDA */}
      <div className={`flex flex-col h-full w-full max-w-md mx-auto p-4 transition-transform duration-300 ${puertoActivo ? '-translate-x-full absolute opacity-0' : 'translate-x-0'}`}>
        <div className="mb-4 mt-2 text-center shrink-0">
          <div className="flex justify-center mb-2">
            <span className="bg-blue-900/40 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> MODO SOLO LECTURA
            </span>
          </div>
          <h2 className="text-xl font-black text-indigo-400">Trabajo en Campo</h2>
          <p className="text-slate-500 text-xs mt-1">Busca el cliente, puerto o enlace</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ejecutarBusqueda(busqueda); }} className="relative mb-4 shrink-0">
          <input 
            type="text" 
            placeholder="Ej. Banamex, Nodo Centro..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#0b132b] text-white text-lg p-4 pl-12 rounded-2xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none focus:border-indigo-400 transition-colors"
          />
          <Search className="absolute left-4 top-4.5 w-6 h-6 text-indigo-400" />
          
          {busqueda.length > 0 && (
            <button type="button" onClick={() => { setBusqueda(''); setResultadosFO([]); setResultadosMW([]); }} className="absolute right-4 top-4.5 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-6 h-6" />
            </button>
          )}
          <button type="submit" className="hidden">Buscar</button>
        </form>

        {/* PESTAÑAS (TABS) DINÁMICAS */}
        {(!cargando && (resultadosFO.length > 0 || resultadosMW.length > 0)) && (
          <div className="flex bg-[#1c2541]/80 rounded-xl p-1.5 mb-4 shrink-0 border border-slate-700/50 shadow-inner">
            <button
              onClick={() => setPestanaActiva('FO')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex justify-center items-center gap-2 ${pestanaActiva === 'FO' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Server className="w-3 h-3" /> F. Óptica ({resultadosFO.length})
            </button>
            <button
              onClick={() => setPestanaActiva('MW')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex justify-center items-center gap-2 ${pestanaActiva === 'MW' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Wifi className="w-3 h-3" /> Microondas ({resultadosMW.length})
            </button>
          </div>
        )}

        {/* HISTORIAL */}
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

        {cargando && <p className="text-center text-indigo-400 animate-pulse font-bold flex justify-center items-center gap-2"><Activity className="w-5 h-5"/> Sincronizando MT_DB...</p>}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-10">
          
          {resultadosActuales.length === 0 && !cargando && busqueda.length > 2 && (resultadosFO.length > 0 || resultadosMW.length > 0) && (
             <p className="text-center text-slate-500 text-sm italic mt-4">No hay resultados en esta pestaña.</p>
          )}

          {resultadosFO.length === 0 && resultadosMW.length === 0 && !cargando && busqueda.length > 2 && (
            <p className="text-center text-slate-500 text-sm italic mt-4">No se encontraron coincidencias en ninguna red.</p>
          )}
          
          {resultadosActuales.map((p, idx) => {
            const estatusStr = String(p.ESTATUS || p.estatus || '').toUpperCase();
            
            return (
              <div key={p.ID || p.id || idx} className="bg-[#0b132b] border border-slate-700 p-4 rounded-xl shadow-lg cursor-pointer active:scale-95 transition-transform" onClick={() => abrirDetalle(p)}>
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-black text-slate-100 text-lg">{p._tipo === 'FO' ? (p.PUERTO || '-') : (p.cliente || 'Enlace MW')}</h3>
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black border uppercase ${estatusStr.includes('ACTIVO') ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : estatusStr.includes('DISPONIBLE') ? 'bg-slate-800 text-slate-400 border-slate-600' : estatusStr.includes('SUSPENDIDO') ? 'bg-red-900/30 text-red-400 border-red-500/50' : 'bg-amber-900/30 text-amber-400 border-amber-500/50'}`}>
                    {estatusStr || 'DESCONOCIDO'}
                  </span>
                </div>
                
                <p className="text-[13px] text-indigo-300 font-bold mb-2 truncate">
                  {p._tipo === 'FO' ? (p.SERVICIO || 'Sin cliente asignado') : (p.sitio_base || 'Sitio Desconocido')}
                </p>
                
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

      {/* FICHA TÉCNICA DINÁMICA */}
      <div className={`flex flex-col h-full w-full max-w-md mx-auto bg-[#050814] transition-transform duration-300 ${puertoActivo ? 'translate-x-0' : 'translate-x-full absolute opacity-0'}`}>
        {puertoActivo && (
          <>
            <div className="bg-[#0b132b] p-4 flex justify-between items-center border-b border-slate-800 shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <button onClick={() => setPuertoActivo(null)} className="p-2 bg-slate-800 rounded-full text-slate-300 active:bg-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h2 className={`font-black text-sm uppercase tracking-widest leading-none ${puertoActivo._tipo === 'FO' ? 'text-indigo-400' : 'text-blue-400'}`}>
                    Ficha Técnica {puertoActivo._tipo}
                  </h2>
                  <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                    {puertoActivo._tipo === 'FO' ? (puertoActivo.SERVICIO || puertoActivo.PUERTO) : (puertoActivo.cliente || puertoActivo.sitio_base)}
                  </p>
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

                  <SeccionDesplegable titulo="Planta Externa" icono={<Activity className="w-4 h-4"/>} colorTexto="text-emerald-400">
                    <InfoRow label="Ruta OSP" value={puertoActivo.RUTA} />
                    <InfoRow label="Distancia" value={puertoActivo.DISTANCIA_CLIENTE} />
                    <InfoRow label="Lambdas" value={puertoActivo.LAMBDAS} />
                    <InfoRow label="Buffer" value={puertoActivo.BUFFER} />
                    <InfoRow label="Hilos" value={puertoActivo.HILOS} />
                  </SeccionDesplegable>

                  <SeccionDesplegable titulo="Contacto y Sitio" icono={<Users className="w-4 h-4"/>} colorTexto="text-pink-400">
                    <InfoRow label="Nombre Contacto" value={puertoActivo.CONTACTO_NOMBRE} />
                    <InfoRow label="Teléfono" value={puertoActivo.CONTACTO_TELEFONO} isPhone={true} />
                    {puertoActivo.COORDENADAS ? (
                      <div className="mt-3 pt-3 border-t border-slate-800/50">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Coordenadas GPS</p>
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(puertoActivo.COORDENADAS)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm">
                          <Navigation className="w-4 h-4 text-emerald-400"/> Abrir en Google Maps
                        </a>
                      </div>
                    ) : (
                      <InfoRow label="Coordenadas" value="No registradas" />
                    )}
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
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(puertoActivo.coordenadas)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm">
                          <Navigation className="w-4 h-4 text-emerald-400"/> Abrir en Google Maps
                        </a>
                      </div>
                    ) : (
                      <InfoRow label="Coordenadas" value="No registradas" />
                    )}
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