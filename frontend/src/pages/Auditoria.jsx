import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Clock, User, FileText } from 'lucide-react';

export default function Auditoria({ token }) {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auditoria?limit=200`, {
          headers: { 'Authorization': `Bearer ${token}`,credentials: 'include' },
          credentials: 'include'
        });
        const data = await res.json();
        if (data.status === 'success') setLogs(data.data);
      } catch (e) {
        console.error("Error cargando auditoría");
      } finally {
        setCargando(false);
      }
    };
    fetchLogs();
  }, [token, API_URL]);

  const logsFiltrados = logs.filter(l => 
    l.usuario.toLowerCase().includes(filtro.toLowerCase()) || 
    l.detalle.toLowerCase().includes(filtro.toLowerCase()) ||
    l.accion.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b19] overflow-hidden">
      
      {/* CABECERA SUPERIOR Y FILTRO */}
      <div className="bg-[#090f24] border-b border-slate-800/60 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm z-10">
        <div>
          <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
            <ShieldCheck className="w-5 h-5" /> Historial de registros
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Historial inmutable de los últimos 200 movimientos tácticos en MT_DB.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-[#050814] border border-slate-700 rounded-lg px-4 py-2 focus-within:border-emerald-500 transition-colors w-full md:w-96 shadow-inner">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input 
            type="text" 
            placeholder="Buscar usuario, IP, puerto o acción..." 
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white w-full"
          />
        </div>
      </div>

      {/* TABLA DE REGISTROS */}
      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        <div className="bg-[#0b132b]/40 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs text-slate-300 table-fixed">
            <thead className="bg-[#1c2541] text-slate-400 sticky top-0 z-10 shadow-sm border-b border-slate-700 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-r border-slate-800 w-48"><div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> FECHA / HORA</div></th>
                <th className="p-4 border-r border-slate-800 w-40"><div className="flex items-center gap-2"><User className="w-3.5 h-3.5"/> USUARIO</div></th>
                <th className="p-4 border-r border-slate-800 w-48 text-emerald-400">ACCIÓN</th>
                <th className="p-4"><div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> PAYLOAD (DATOS MODIFICADOS)</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {cargando ? (
                <tr><td colSpan="4" className="p-16 text-center text-emerald-500 font-mono animate-pulse">Extrayendo registros de seguridad de MT_DB...</td></tr>
              ) : logsFiltrados.length === 0 ? (
                <tr><td colSpan="4" className="p-16 text-center text-slate-500 italic">No se encontraron movimientos que coincidan con la búsqueda.</td></tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap border-r border-slate-800/50">{log.fecha}</td>
                    <td className="p-4 border-r border-slate-800/50">
                        <span className="bg-[#050814] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 font-bold shadow-sm">{log.usuario}</span>
                    </td>
                    <td className="p-4 font-black text-emerald-400 text-[10px] uppercase tracking-widest border-r border-slate-800/50">{log.accion}</td>
                    <td className="p-4 text-[11px] font-mono text-slate-400 break-words leading-relaxed">
                        {log.detalle}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}