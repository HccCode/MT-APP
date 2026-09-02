import React from 'react';
import { Server, LogOut, FileText, Activity, Cpu, Radio, Globe, Inbox, Users, ShieldAlert } from 'lucide-react';

export default function Navbar({ usuario, pestanaActiva, setPestanaActiva, handleLogout, pestanasPermitidas = ['*'] }) {
  
  // Helper para verificar si el usuario tiene permiso de ver esta pestaña
  const puedeVer = (tabId) => {
    if (pestanasPermitidas.includes('*')) return true;
    return pestanasPermitidas.includes(tabId);
  };

  // Configuración centralizada de las pestañas y sus colores de estado activo
  const tabsConfig = [
    { id: 'inventario', label: 'Servicios Dedicados (FO)', icon: FileText, activeColor: 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' },
    { id: 'resumen', label: 'Disponibilidad', icon: Activity, activeColor: 'bg-[#e87a00] text-white shadow-[0_0_10px_rgba(232,122,0,0.3)]' },
    { id: 'cabezales', label: 'Cabezales', icon: Cpu, activeColor: 'bg-slate-700 text-white' },
    { id: 'microondas', label: 'Enlaces MW', icon: Radio, activeColor: 'bg-slate-700 text-white' },
    { id: 'geografia', label: 'Red Geografica', icon: Globe, activeColor: 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.3)]' },
    { id: 'carga_excel', label: 'Aprovisionamiento', icon: Inbox, activeColor: 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.3)]' },
    { id: 'usuarios', label: 'Usuarios', icon: Users, activeColor: 'bg-[#9333ea] text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]' },
    { id: 'logs', label: 'Logs', icon: ShieldAlert, activeColor: 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]' }
  ];

  return (
    // LA CLAVE ESTÁ AQUÍ: sticky top-0 z-[9999] ancla la barra en la parte superior siempre
    <nav className="sticky top-0 z-[9999] w-full bg-[#050814] border-b border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
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
              <span className="text-slate-500 text-[10px] font-bold mt-0.5 tracking-wider">
                {usuario?.nombre_completo || usuario?.username || 'Cargando usuario...'}
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
          {tabsConfig.map(tab => {
            // Evaluamos si el usuario tiene permiso para ver este botón
            if (!puedeVer(tab.id)) return null;
            
            const isActiva = pestanaActiva === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setPestanaActiva(tab.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  isActiva 
                    ? tab.activeColor 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${isActiva ? 'text-white' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
}