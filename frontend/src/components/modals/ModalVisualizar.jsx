import { Eye, X } from 'lucide-react';

export default function ModalVisualizar({ puertoDetalle, cerrarModal }) {
  if (!puertoDetalle) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-[#0b132b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-xl shrink-0">
          <h2 className="text-lg font-black text-blue-400 flex items-center gap-2">
            <Eye className="w-5 h-5" /> INFORMACIÓN DE PUERTO: {puertoDetalle.EQUIPO_HOTEL_ID} - {puertoDetalle.PUERTO}
          </h2>
          <button onClick={cerrarModal} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-3 bg-[#050814] p-4 rounded-lg border border-slate-800/60 shadow-inner">
              <h4 className="text-blue-500 font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider">General</h4>
              <div><span className="text-slate-500 text-[10px] block font-bold">ESTATUS</span><span className="text-slate-200 font-mono font-bold">{puertoDetalle.ESTATUS || '-'}</span></div>
              <div><span className="text-slate-500 text-[10px] block font-bold">EQUIPO ID</span><span className="text-slate-200 font-mono">{puertoDetalle.EQUIPO_HOTEL_ID || '-'}</span></div>
              <div><span className="text-slate-500 text-[10px] block font-bold">CLIENTE / SERVICIO</span><span className="text-slate-200">{puertoDetalle.SERVICIO || '-'}</span></div>
            </div>

            <div className="space-y-3 bg-[#050814] p-4 rounded-lg border border-slate-800/60 shadow-inner">
              <h4 className="text-blue-500 font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider">Red Lógica</h4>
              <div><span className="text-slate-500 text-[10px] block font-bold">IP HUB / GESTIÓN / CLIENTE</span><span className="text-slate-200 font-mono text-xs">{puertoDetalle.IP_HUB || '-'} / {puertoDetalle.IP_GESTION || '-'} / {puertoDetalle.IP_CLIENTE || '-'}</span></div>
              <div><span className="text-slate-500 text-[10px] block font-bold">ANCHO BANDA</span><span className="text-slate-200 font-mono">{puertoDetalle.MBPS || '0'} Mbps</span></div>
              <div><span className="text-slate-500 text-[10px] block font-bold">BDI</span><span className="text-slate-200 font-mono">{puertoDetalle.BDI || '-'}</span></div>
            </div>

            <div className="space-y-3 bg-[#050814] p-4 rounded-lg border border-slate-800/60 shadow-inner">
              <h4 className="text-blue-500 font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider">Planta Externa / Óptica</h4>
              {/* 🚀 NUEVO: CAMPO DE RUTA OSP AÑADIDO AQUÍ */}
              <div><span className="text-slate-500 text-[10px] block font-bold">RUTA OSP</span><span className="text-emerald-400 font-mono font-bold tracking-wide">{puertoDetalle.RUTA || '-'}</span></div>
              <div><span className="text-slate-500 text-[10px] block font-bold">POTENCIA HUB / CPE</span><span className="text-amber-400 font-mono">{puertoDetalle.POTENCIA_HUB || '-'} / {puertoDetalle.POTENCIA_CPE || '-'}</span></div>
              <div><span className="text-slate-500 text-[10px] block font-bold">HILOS / LAMBDAS</span><span className="text-slate-200 font-mono">{puertoDetalle.HILOS || '-'} / {puertoDetalle.LAMBDAS || '-'}</span></div>
              <div><span className="text-slate-500 text-[10px] block font-bold">DISTANCIA CLIENTE</span><span className="text-slate-200 font-mono">{puertoDetalle.DISTANCIA_CLIENTE || '-'}</span></div>
            </div>

            <div className="space-y-3 bg-[#050814] p-4 rounded-lg border border-slate-800/60 shadow-inner md:col-span-2 lg:col-span-3">
              <h4 className="text-blue-500 font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider">Ubicación y Equipamiento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><span className="text-slate-500 text-[10px] block font-bold">DIRECCIÓN</span><span className="text-slate-200">{puertoDetalle.DIRECCION || '-'}</span></div>
                <div><span className="text-slate-500 text-[10px] block font-bold">COORDENADAS</span><span className="text-amber-500 font-mono">{puertoDetalle.COORDENADAS || '-'}</span></div>
                <div><span className="text-slate-500 text-[10px] block font-bold">EQUIPO CPE (MARCA/MODELO/SERIE)</span><span className="text-slate-200 font-mono">{puertoDetalle.MARCA_CPE || '-'} / {puertoDetalle.MODELO_CPE || '-'} / {puertoDetalle.SERIE_CPE || '-'}</span></div>
                
                {/* --- CAMPOS DE CONTACTO SEPARADOS --- */}
                <div><span className="text-slate-500 text-[10px] block font-bold">NOMBRE CONTACTO</span><span className="text-slate-200">{puertoDetalle.CONTACTO_NOMBRE || '-'}</span></div>
                <div><span className="text-slate-500 text-[10px] block font-bold">TELÉFONO CONTACTO</span><span className="text-slate-200 font-mono">{puertoDetalle.CONTACTO_TELEFONO || '-'}</span></div>
              </div>
            </div>
            
            <div className="space-y-3 bg-[#050814] p-4 rounded-lg border border-slate-800/60 shadow-inner md:col-span-2 lg:col-span-3">
              <h4 className="text-blue-500 font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider">Comentarios Operativos</h4>
              <p className="text-slate-300 italic">{puertoDetalle.COMENTARIOS || 'Sin comentarios registrados.'}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex justify-end shrink-0">
          <button onClick={cerrarModal} className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white transition-colors cursor-pointer">CERRAR</button>
        </div>
      </div>
    </div>
  );
}