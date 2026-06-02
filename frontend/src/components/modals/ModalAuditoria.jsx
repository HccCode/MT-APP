import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Search, Clock, User, FileText } from 'lucide-react';

export default function ModalAuditoria({ token, cerrarModal }) {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auditoria?limit=200`, {
          headers: { 'Authorization': `Bearer ${token}` }
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-[#0b132b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col h-[80vh] overflow-hidden">
        
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#050814] shrink-0">
          <div>
            <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> CENTRO DE AUDITORÍA Y TRAZABILIDAD
            </h2>
            <p className="text-xs text-slate-500 mt-1">Historial inmutable de los últimos 200 movimientos en la base de datos.</p>
          </div>
          <button onClick={cerrarModal} className="text-slate-500 hover:text-white p-1 rounded hover:bg-red-600 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 bg-[#090f24] border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 bg-[#050814] border border-slate-700 rounded-lg px-4 py-2 focus-within:border-emerald-500 transition-colors">
                <Search className="w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Filtrar por usuario, acción, IP o puerto modificado..." 
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full"
                />
            </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-[#070b19]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b132b] text-slate-400 sticky top-0 z-10 shadow-md">
              <tr>
                <th className="p-4 border-b border-slate-700 w-40"><div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> FECHA / HORA</div></th>
                <th className="p-4 border-b border-slate-700 w-32"><div className="flex items-center gap-2"><User className="w-3.5 h-3.5"/> USUARIO</div></th>
                <th className="p-4 border-b border-slate-700 w-48">ACCIÓN</th>
                <th className="p-4 border-b border-slate-700"><div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> REGISTRO TÉCNICO (PAYLOAD)</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {cargando ? (
                <tr><td colSpan="4" className="p-12 text-center text-slate-500 font-mono">Extrayendo registros de seguridad...</td></tr>
              ) : logsFiltrados.length === 0 ? (
                <tr><td colSpan="4" className="p-12 text-center text-slate-500 italic">No se encontraron movimientos.</td></tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">{log.fecha}</td>
                    <td className="p-4">
                        <span className="bg-slate-800 text-slate-200 px-2 py-1 rounded border border-slate-700 font-bold">{log.usuario}</span>
                    </td>
                    <td className="p-4 font-bold text-emerald-400 text-[10px] uppercase tracking-wider">{log.accion}</td>
                    <td className="p-4 text-[11px] font-mono text-slate-400 break-words max-w-lg leading-relaxed">
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