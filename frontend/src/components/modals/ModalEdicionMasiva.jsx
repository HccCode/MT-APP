import React, { useState } from 'react';
import { X, AlertTriangle, Eraser, CheckSquare, Zap } from 'lucide-react';

export default function ModalEdicionMasiva({ puertosIds, token, cerrarModal, recargarDatos }) {
  const [guardando, setGuardando] = useState(false);
  const [nuevoEstatus, setNuevoEstatus] = useState('DISPONIBLE GI');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const ejecutarActualizacion = async (updates) => {
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/ports/bulk-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ port_ids: puertosIds, updates })
      });
      if (res.ok) {
        alert(`✅ ${puertosIds.length} puertos actualizados exitosamente.`);
        recargarDatos();
        cerrarModal();
      } else {
        alert("Error del servidor al intentar actualizar masivamente.");
      }
    } catch (e) {
      alert("Error de comunicación con la base de datos.");
    } finally {
      setGuardando(false);
    }
  };

  const handleLiberarPuertos = () => {
    if(!window.confirm(`⚠️ ESTÁS A PUNTO DE BORRAR DATOS\n\n¿Estás seguro de liberar ${puertosIds.length} puertos?\nSe cambiarán a DISPONIBLE GI y se borrarán las IPs, cliente y telemetría de todos ellos.`)) return;
    
    ejecutarActualizacion({
      ESTATUS: 'DISPONIBLE GI',
      SERVICIO: '',
      IP_GESTION: '',
      IP_CLIENTE: '',
      MBPS: '',
      BDI: '',
      TIPO_SERVICIO: '',
      CONTACTO_NOMBRE: '',
      CONTACTO_TELEFONO: '',
      FECHA_DE_ENTREGA: '',
      COMENTARIOS: 'Puerto liberado mediante limpieza masiva.'
    });
  };

  const handleCambiarEstatusSolo = () => {
    if(!window.confirm(`¿Aplicar estatus "${nuevoEstatus}" a los ${puertosIds.length} puertos seleccionados?`)) return;
    ejecutarActualizacion({ ESTATUS: nuevoEstatus });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-[#0b132b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#050814]">
          <h2 className="text-lg font-black text-amber-400 flex items-center gap-2">
            <CheckSquare className="w-5 h-5" /> EDICIÓN MASIVA ({puertosIds.length} Puertos)
          </h2>
          <button onClick={cerrarModal} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 bg-[#090f24]">
          
          <div className="bg-[#0b132b] p-5 rounded-lg border border-slate-700 shadow-inner">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400" /> Cambio de Estatus Rápido</h3>
            <p className="text-xs text-slate-400 mb-4">Modifica únicamente el estado de los puertos seleccionados, conservando intactos todos sus demás datos.</p>
            <div className="flex gap-3">
              <select value={nuevoEstatus} onChange={e=>setNuevoEstatus(e.target.value)} className="flex-1 bg-[#1c2541] border border-slate-600 rounded p-2 text-white text-xs font-bold outline-none focus:border-blue-500 cursor-pointer">
                <option value="DISPONIBLE GI">DISPONIBLE GI</option>
                <option value="DISPONIBLE TE">DISPONIBLE TE</option>
                <option value="DISPONIBLE 25">DISPONIBLE 25</option>
                <option value="DISPONIBLE 100">DISPONIBLE 100</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="SUSPENDIDO">SUSPENDIDO</option>
                <option value="TRONCAL TE">TRONCAL TE</option>
                <option value="TRONCAL GI">TRONCAL GI</option>
                <option value="TRONCAL 25">TRONCAL 25</option>
                <option value="TRONCAL 100">TRONCAL 100</option>
              </select>
              <button onClick={handleCambiarEstatusSolo} disabled={guardando} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white text-xs font-bold transition shadow-lg disabled:opacity-50 cursor-pointer">
                Aplicar
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800"></div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">O también</span>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>

          <div className="bg-red-950/20 p-5 rounded-lg border border-red-900/50 shadow-inner">
            <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2"><Eraser className="w-4 h-4" /> Limpieza y Liberación Completa</h3>
            <p className="text-xs text-slate-400 mb-4">Esta opción pasará los puertos a <span className="text-white font-bold">DISPONIBLE GI</span> y eliminará las IPs, servicios y contacto del cliente de forma permanente.</p>
            
            <button onClick={handleLiberarPuertos} disabled={guardando} className="w-full bg-red-600/90 hover:bg-red-500 border border-red-500 px-4 py-3 rounded text-white text-xs font-black transition shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer">
              <AlertTriangle className="w-4 h-4" /> LIBERAR {puertosIds.length} PUERTOS AHORA
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}