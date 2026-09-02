import React from 'react';
import { Server, LogOut, FileText, Activity, Globe, Inbox, Users } from 'lucide-react';

export default function Navbar({ usuario, tabActiva, setTabActiva, handleLogout, esAdmin, esRnoc, puedeCargar }) {
  return (
    // CLASES CLAVE: 'sticky top-0 z-[9999]' forzan a que la barra se quede anclada arriba
    <header className="sticky top-0 z-[9999] w-full bg-[#050814] border-b border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)] shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5 overflow-x-auto custom-scrollbar">
        
        {/* =========================================
            SECCIÓN IZQUIERDA: LOGO Y USUARIO
            ========================================= */}
        <div className="flex items-center gap-4 shrink-0 pr-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-900/30 border border-blue-800/50 p-2 rounded-xl">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-white font-black text-lg leading-none tracking-wide">MT Manager</h1>
              <span className="text-slate-500 text-[10px] font-bold mt-0.5 tracking-wider uppercase">
                {usuario?.nombre_completo || usuario?.username || 'Cargando...'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            title="Cerrar Sesión" 
            className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 p-2 rounded-xl transition-colors cursor-pointer group ml-2"
          >
            <LogOut className="w-4 h-4 text-red-500 group-hover:text-red-400 transition-colors" />
          </button>
        </div>

        {/* =========================================
            SECCIÓN DERECHA/CENTRO: PESTAÑAS (TABS)
            ========================================= */}
        <div className="flex items-center bg-[#070b19] border border-slate-800/60 p-1.5 rounded-2xl shrink-0">
          
          {/* Servicios Dedicados (FO) */}
          <button
            onClick={() => setTabActiva('inventario')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
              tabActiva === 'inventario' 
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${tabActiva === 'inventario' ? 'text-white' : 'text-slate-500'}`} />
            Servicios Dedicados (FO)
          </button>

          {/* Disponibilidad */}
          {!esRnoc && (
            <button
              onClick={() => setTabActiva('resumen')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                tabActiva === 'resumen' 
                  ? 'bg-[#e87a00] text-white shadow-[0_0_10px_rgba(232,122,0,0.3)]' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${tabActiva === 'resumen' ? 'text-white' : 'text-slate-500'}`} />
              Disponibilidad
            </button>
          )}

          {/* Red Geográfica */}
          {esAdmin && (
            <button
              onClick={() => setTabActiva('geografia')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                tabActiva === 'geografia' 
                  ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.3)]' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${tabActiva === 'geografia' ? 'text-white' : 'text-slate-500'}`} />
              Red Geográfica
            </button>
          )}

          {/* Aprovisionamiento (Carga Masiva) */}
          {puedeCargar && (
            <button
              onClick={() => setTabActiva('carga_excel')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                tabActiva === 'carga_excel' 
                  ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.3)]' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Inbox className={`w-3.5 h-3.5 ${tabActiva === 'carga_excel' ? 'text-white' : 'text-slate-500'}`} />
              Aprovisionamiento
            </button>
          )}

          {/* Usuarios */}
          {esAdmin && (
            <button
              onClick={() => setTabActiva('usuarios')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                tabActiva === 'usuarios' 
                  ? 'bg-[#9333ea] text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${tabActiva === 'usuarios' ? 'text-white' : 'text-slate-500'}`} />
              Usuarios
            </button>
          )}

        </div>
      </div>
    </header>
  );
}