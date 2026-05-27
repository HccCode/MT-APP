import { useState, useEffect } from 'react';
import { Server, LogOut } from 'lucide-react';

import Login from './pages/Login';
import Inventario from './pages/Inventario';
import Resumen from './pages/Resumen';
import Geografia from './pages/Geografia';
import CargaExcel from './pages/CargaExcel';
import Usuarios from './pages/Usuarios';
import Cabezales from './pages/Cabezales';

function App() {
  const [token, setToken] = useState(localStorage.getItem('mcm_token') || null);
  const [usuario, setUsuario] = useState(JSON.parse(localStorage.getItem('mcm_user')) || null);
  
  const [estructuraGeografica, setEstructuraGeografica] = useState({});
  const [tabActiva, setTabActiva] = useState('inventario'); 

  const roleStr = String(usuario?.role).trim().toUpperCase();
  const userStr = String(usuario?.username).trim().toLowerCase();
  
  const esAdmin = userStr === 'admin' || roleStr === 'ADMIN';
  const esMcmNoc = roleStr === 'MCM NOC';
  const esMcmIng = roleStr === 'MCM INGENIERIA';
  const esRnoc = roleStr === 'RNOC';

  const puedeEditar = esAdmin || esMcmNoc || esMcmIng;
  const puedeCargar = esAdmin || esMcmIng;

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
      const res = await fetch('https://mt-backend-2ox8.onrender.com/api/geography', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { handleLogout(); return; }
      if (!res.ok) return;
      const data = await res.json(); 
      setEstructuraGeografica(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    if (token) cargarGeographyDB(); 
  }, [token]);

  if (!token) {
    return <Login setToken={setToken} setUsuario={setUsuario} setTabActiva={setTabActiva} />;
  }

  return (
    <div className="h-screen w-screen bg-[#070b19] text-slate-100 font-sans flex flex-col overflow-hidden">
      
      {/* NAVBAR GLOBAL */}
      <header className="bg-[#0b132b] border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">MT Manager</h1>
            <p className="text-[10px] text-slate-500 font-mono">{usuario?.username}</p>
            <p className="text-[10px] text-slate-500 font-mono">{usuario?.nombre_completo || 'Operador'}</p>
          </div>
        </div>

        {/* NAVEGACIÓN - ORDEN REQUERIDO */}
        <div className="flex bg-[#050814] p-1 rounded-xl border border-slate-800 flex-wrap justify-center gap-2.5">
          <button 
            onClick={() => setTabActiva('inventario')} 
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${tabActiva === 'inventario' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            📋 Servicios Dedicados
          </button>
          
          {!esRnoc && (
            <button 
              onClick={() => setTabActiva('resumen')} 
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${tabActiva === 'resumen' ? 'bg-[#d97706] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              📊 Disponibilidad de Puertos
            </button>
          )}

          {/* TERCERA POSICIÓN ASIGNADA A CABEZALES */}
          <button 
            onClick={() => setTabActiva('cabezales')} 
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${tabActiva === 'cabezales' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            📡 Cabezales
          </button>
          
          {esAdmin && (
            <button 
              onClick={() => setTabActiva('geografia')} 
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${tabActiva === 'geografia' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              🌐 Configuración Red
            </button>
          )}
          
          {puedeCargar && (
            <button 
              onClick={() => setTabActiva('carga_excel')} 
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${tabActiva === 'carga_excel' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              📤 Carga Masiva
            </button>
          )}

          {esAdmin && (
            <button 
              onClick={() => setTabActiva('usuarios')} 
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${tabActiva === 'usuarios' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              👥 Usuarios
            </button>
          )}
        </div>

        <button 
          onClick={handleLogout} 
          className="p-2 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 hover:bg-red-900/50 cursor-pointer transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tabActiva === 'inventario' && (
          <Inventario token={token} usuario={usuario} puedeEditar={puedeEditar} esRnoc={esRnoc} esMcmNoc={esMcmNoc} esAdmin={esAdmin} estructuraGeografica={estructuraGeografica} handleLogout={handleLogout} />
        )}

        {tabActiva === 'cabezales' && (
          <Cabezales token={token} handleLogout={handleLogout} puedeCargar={puedeCargar} />
        )}

        {tabActiva === 'resumen' && !esRnoc && (
          <Resumen estructuraGeografica={estructuraGeografica} />
        )}

        {tabActiva === 'geografia' && esAdmin && (
          <Geografia token={token} estructuraGeografica={estructuraGeografica} cargarGeographyDB={cargarGeographyDB} handleLogout={handleLogout} />
        )}

        {tabActiva === 'carga_excel' && puedeCargar && (
          <CargaExcel token={token} estructuraGeografica={estructuraGeografica} handleLogout={handleLogout} />
        )}

        {tabActiva === 'usuarios' && esAdmin && (
          <Usuarios token={token} usuario={usuario} esAdmin={esAdmin} estructuraGeografica={estructuraGeografica} handleLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

export default App;