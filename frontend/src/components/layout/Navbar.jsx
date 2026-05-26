// src/components/layout/Navbar.jsx
import { Server, LogOut } from 'lucide-react';

export default function Navbar({ usuario, tabActiva, setTabActiva, handleLogout, esAdmin, esRnoc, puedeCargar }) {
  return (
    <header className="bg-[#0b132b] border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
      <div className="flex items-center gap-3">
        {/* Tu logo e información del usuario */}
      </div>

      <div className="flex bg-[#050814] p-1 rounded-xl border border-slate-800 flex-wrap justify-center gap-2.5">
        <button onClick={() => setTabActiva('inventario')} className={`... ${tabActiva === 'inventario' ? 'bg-blue-600 text-white' : ''}`}>📋 Servicios Dedicados</button>
        {!esRnoc && <button onClick={() => setTabActiva('resumen')} className="...">📊 Disponibilidad</button>}
        {esAdmin && <button onClick={() => setTabActiva('geografia')} className="...">🌐 Configuración Red</button>}
        {puedeCargar && <button onClick={() => setTabActiva('carga_excel')} className="...">📤 Carga Masiva</button>}
        {esAdmin && <button onClick={() => setTabActiva('usuarios')} className="...">👥 Usuarios</button>}
      </div>
      
      <button onClick={handleLogout} className="p-2 bg-red-950/30 text-red-400 hover:bg-red-900/50 rounded-lg"><LogOut className="w-4 h-4" /></button>
    </header>
  );
}