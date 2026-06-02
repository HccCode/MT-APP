import React, { useState, useEffect } from 'react';
import { Terminal, X, Activity, AlertCircle } from 'lucide-react';

export default function TerminalPing({ ipTarget, token, onClose }) {
  const [salida, setSalida] = useState('');
  const [ejecutando, setEjecutando] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const lanzarPing = async () => {
      try {
        const res = await fetch(`${API_URL}/api/diagnostico/ping?ip=${encodeURIComponent(ipTarget)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (res.ok && json.status === 'success') {
          setSalida(json.output);
        } else {
          setError(json.detail || "Fallo en la ejecución del comando.");
        }
      } catch (err) {
        setError("Error de red. No se pudo contactar al servidor.");
      } finally {
        setEjecutando(false);
      }
    };

    if (ipTarget) lanzarPing();
  }, [ipTarget, token, API_URL]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0b132b] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* CABECERA DE LA TERMINAL */}
        <div className="bg-[#050814] border-b border-slate-800 p-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold text-slate-300 tracking-wider">
              root@mt-manager:~# ping {ipTarget}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DE LA TERMINAL (SALIDA DE TEXTO) */}
        <div className="p-4 bg-[#02040a] font-mono text-sm h-80 overflow-y-auto">
          <div className="text-slate-400 mb-2">Iniciando diagnóstico ICMP hacia {ipTarget}...</div>
          
          {ejecutando && (
            <div className="flex items-center gap-2 text-emerald-500 mt-4 animate-pulse">
              <Activity className="w-4 h-4" /> Esperando respuesta del servidor...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 mt-2 bg-red-950/30 p-2 rounded border border-red-900/50">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {salida && (
            <pre className="text-emerald-400 whitespace-pre-wrap mt-2 leading-relaxed">
              {salida}
            </pre>
          )}

          {!ejecutando && !error && (
            <div className="text-slate-500 mt-4 flex items-center gap-2">
              <span className="w-2 h-4 bg-slate-500 animate-pulse inline-block"></span> Ejecución finalizada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}