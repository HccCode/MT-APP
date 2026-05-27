import { Activity, X } from 'lucide-react';

export default function ModalAlineacion({ alineacionData, cabezalId, cerrarModal }) {
  if (!alineacionData) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-[#0b132b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
        
        {/* HEADER DEL MODAL */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-xl shrink-0">
          <h2 className="text-lg font-black text-cyan-400 flex items-center gap-2">
            <Activity className="w-5 h-5" /> ALINEACIÓN - CABEZAL ID: {cabezalId}
          </h2>
          <button onClick={cerrarModal} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL (TABLA DE ALINEACIÓN) */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-sm">
          <div className="bg-[#050814] rounded-lg border border-slate-800/60 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1c2541] border-b border-slate-700 text-[10px] uppercase tracking-wider text-slate-300">
                <tr>
                  <th className="p-3">Portadora</th>
                  <th className="p-3">Formato</th>
                  <th className="p-3"># Canal</th>
                  <th className="p-3">Nombre de Servicio</th>
                  <th className="p-3">Mcast IP</th>
                  <th className="p-3">Source IP</th>
                  <th className="p-3">UDP</th>
                  <th className="p-3">SID</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-300 divide-y divide-slate-800/50">
                {alineacionData.length > 0 ? (
                  alineacionData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-amber-400">{item.portadora || '-'}</td>
                      <td className="p-3">{item.formato || '-'}</td>
                      <td className="p-3 text-center">{item.canal || '-'}</td>
                      <td className="p-3 text-slate-100 font-semibold">{item.nombre_servicio || '-'}</td>
                      <td className="p-3 font-mono text-blue-400">{item.mcast_ip || '-'}</td>
                      <td className="p-3 font-mono">{item.source_ip || '-'}</td>
                      <td className="p-3 font-mono text-center">{item.udp || '-'}</td>
                      <td className="p-3 font-mono text-purple-400 text-center">{item.sid || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-slate-500 italic">No hay datos de alineación registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex justify-end shrink-0">
          <button onClick={cerrarModal} className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white transition-colors cursor-pointer">
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
}