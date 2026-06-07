import { useState, useEffect } from 'react';
import { Server, LogOut } from 'lucide-react';

import Login from './pages/Login';
import Inventario from './pages/Inventario';
import Resumen from './pages/Resumen';
import Geografia from './pages/Geografia';
import CargaExcel from './pages/CargaExcel';
import Usuarios from './pages/Usuarios';
import Cabezales from './pages/Cabezales';
import Cuadrilla from './pages/Cuadrilla';
import Auditoria from './pages/Auditoria'; 

function App() {
  const [token, setToken] = useState(localStorage.getItem('mcm_token') || null);
  const [usuario, setUsuario] = useState(JSON.parse(localStorage.getItem('mcm_user')) || null);
  
  const [estructuraGeografica, setEstructuraGeografica] = useState({});
  const [tabActiva, setTabActiva] = useState('inventario'); 

  // ================= SISTEMA DE PERMISOS GRANULARES =================
  const roleStr = String(usuario?.role || '').trim().toUpperCase();
  const userStr = String(usuario?.username || '').trim().toLowerCase();
  const permisos = roleStr.split(',').map(p => p.trim());
  
  const esAdmin = userStr === 'admin' || roleStr === 'ADMIN' || permisos.includes('ADMIN');
  const puedeEditar = esAdmin || roleStr === 'MCM NOC' || roleStr === 'MCM INGENIERIA' || permisos.includes('ESCRITURA');
  const puedeCargar = esAdmin || roleStr === 'MCM INGENIERIA' || permisos.includes('CARGA');
  const esMcmNoc = roleStr === 'MCM NOC' || permisos.includes('MCM NOC'); 
  const esRnoc = roleStr === 'RNOC' || permisos.includes('RNOC'); 

  const pestanasStr = String(usuario?.pestanas || '*');
  const arrayPestanas = pestanasStr.split(',').map(p => p.trim());

  const puedeVerTab = (tabId, checkLegacyFallback) => {
    if (esRnoc) return tabId === 'inventario';
    if (esAdmin || pestanasStr === '*') return true;
    if (pestanasStr && pestanasStr !== '') return arrayPestanas.includes(tabId);
    return checkLegacyFallback;
  };

  const mostrarInventario = puedeVerTab('inventario', true);
  const mostrarResumen = puedeVerTab('resumen', true);
  const mostrarCabezales = puedeVerTab('cabezales', true);
  const mostrarCuadrilla = puedeVerTab('cuadrilla', true);
  const mostrarGeografia = puedeVerTab('geografia', esAdmin);
  const mostrarCarga = puedeVerTab('carga_excel', puedeCargar);
  const mostrarUsuarios = puedeVerTab('usuarios', esAdmin);
  
  // 1. RESTRICCIÓN ESTRICTA: Solo será true si la variable esAdmin es verdadera
  const mostrarAuditoria = esAdmin; 

  const handleLogout = () => {
    localStorage.clear(); 
    setToken(null); 
    setUsuario(null); 
    setTabActiva('inventario');
    setEstructuraGeografica({});
  };

  const cargarGeographyDB = async () => {
    if (!token) return; 
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/geography?t=${new Date().getTime()}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,credentials: 'include',
          'Cache-Control': 'no-cache'
        }
      });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) {
        const data = await res.json(); 
        setEstructuraGeografica(data);
      }
    } catch (e) { 
      console.error("Error descargando geografía:", e); 
    }
  };

  useEffect(() => { 
    if (token) cargarGeographyDB(); 
  }, [token]);

  useEffect(() => {
    if (token) {
      if (window.innerWidth < 768) {
        setTabActiva('cuadrilla');
      } else if (tabActiva === 'cuadrilla') {
        setTabActiva('inventario'); 
      }
    }
  }, [token]);

  if (!token) {
    return <Login setToken={setToken} setUsuario={setUsuario} setTabActiva={setTabActiva} />;
  }

  return (
    <div className="h-screen w-screen bg-[#070b19] text-slate-100 font-sans flex flex-col overflow-hidden">
      
      <header className="bg-[#0b132b] border-b border-slate-800 shrink-0">
        <div className="px-4 py-3 sm:px-6 sm:py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
          
          <div className="flex justify-between items-center w-full xl:w-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                <Server className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight">MT Manager</h1>
                <p className="text-[10px] text-slate-500 font-mono leading-tight truncate max-w-[150px]">{usuario?.nombre_completo || 'Operador'}</p>
              </div>
            </div>

            <button 
              onClick={handleLogout} 
              className="xl:hidden p-2 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 hover:bg-red-900/50 cursor-pointer transition-colors flex shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full xl:w-auto overflow-hidden">
            <div className="flex bg-[#050814] p-1.5 rounded-xl border border-slate-800 overflow-x-auto gap-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
              
              {mostrarInventario && (
                <button 
                  onClick={() => setTabActiva('inventario')} 
                  className={`hidden md:flex shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'inventario' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">📋</span> Servicios Dedicados
                </button>
              )}

              {mostrarCuadrilla && (
                <button 
                  onClick={() => setTabActiva('cuadrilla')} 
                  className={`flex md:hidden shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'cuadrilla' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">📱</span> Modo Cuadrilla
                </button>
              )}
              
              {mostrarResumen && (
                <button 
                  onClick={() => setTabActiva('resumen')} 
                  className={`hidden md:flex shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'resumen' ? 'bg-[#d97706] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">📊</span> Disponibilidad
                </button>
              )}

              {mostrarCabezales && (
                <button 
                  onClick={() => setTabActiva('cabezales')} 
                  className={`hidden md:flex shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'cabezales' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">📡</span> Cabezales
                </button>
              )}
              
              {mostrarGeografia && (
                <button 
                  onClick={() => setTabActiva('geografia')} 
                  className={`hidden md:flex shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'geografia' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">🌐</span> Red Geografica
                </button>
              )}
              
              {mostrarCarga && (
                <button 
                  onClick={() => setTabActiva('carga_excel')} 
                  className={`hidden md:flex shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'carga_excel' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">📤</span> Aprovisionamiento
                </button>
              )}

              {mostrarUsuarios && (
                <button 
                  onClick={() => setTabActiva('usuarios')} 
                  className={`hidden md:flex shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'usuarios' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">👥</span> Usuarios
                </button>
              )}

              {mostrarAuditoria && (
                <button 
                  onClick={() => setTabActiva('auditoria')} 
                  className={`hidden md:flex shrink-0 snap-start px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap items-center gap-1.5 ${tabActiva === 'auditoria' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span className="text-[13px]">🛡️</span> Logs
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            className="hidden xl:flex p-2 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 hover:bg-red-900/50 cursor-pointer transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tabActiva === 'inventario' && (
          <Inventario token={token} usuario={usuario} puedeEditar={puedeEditar} esRnoc={esRnoc} esMcmNoc={esMcmNoc} esAdmin={esAdmin} estructuraGeografica={estructuraGeografica} handleLogout={handleLogout} />
        )}
        {tabActiva === 'cabezales' && (
          <Cabezales token={token} handleLogout={handleLogout} puedeCargar={puedeCargar} estructuraGeografica={estructuraGeografica}/>
        )}
        {tabActiva === 'resumen' && (
          <Resumen token={token} estructuraGeografica={estructuraGeografica} puedeEditar={puedeEditar} esAdmin={esAdmin}/>
        )}
        {tabActiva === 'cuadrilla' && (
          <Cuadrilla token={token} />
        )}
        {tabActiva === 'geografia' && (
          <Geografia token={token} estructuraGeografica={estructuraGeografica} cargarGeographyDB={cargarGeographyDB} handleLogout={handleLogout} esAdmin={esAdmin} />
        )}
        {tabActiva === 'carga_excel' && (
          <CargaExcel token={token} estructuraGeografica={estructuraGeografica} handleLogout={handleLogout} puedeCargar={puedeCargar} />
        )}
        {tabActiva === 'usuarios' && (
          <Usuarios token={token} usuario={usuario} esAdmin={esAdmin} estructuraGeografica={estructuraGeografica} handleLogout={handleLogout} />
        )}
        
        {/* 2. RESTRICCIÓN ESTRICTA DE RENDERIZADO */}
        {tabActiva === 'auditoria' && esAdmin && (
          <Auditoria token={token} />
        )}
      </div>
    </div>
  );
}

export default App;