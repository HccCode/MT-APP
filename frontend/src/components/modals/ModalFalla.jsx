import { useState, useEffect } from 'react';
import { AlertTriangle, X, Copy } from 'lucide-react';

export default function ModalFalla({ puertoDetalle, usuario, cerrarModal }) {
  const [fallaOperador, setFallaOperador] = useState('');
  const [fallaTT, setFallaTT] = useState('');
  const [fallaOT, setFallaOT] = useState('');
  const [fallaInfo, setFallaInfo] = useState('');
  const [fallaEnergizado, setFallaEnergizado] = useState('SI');
  const [fallaAlarmasEq, setFallaAlarmasEq] = useState('NO');
  const [fallaConexiones, setFallaConexiones] = useState('SI');
  const [fallaStatusPuerto, setFallaStatusPuerto] = useState('UP');
  const [fallaPing, setFallaPing] = useState('NO');
  const [fallaAccesosSel, setFallaAccesosSel] = useState('NO');

  useEffect(() => {
    if (usuario) {
      const nombreParaMostrar = usuario.nombre_completo || usuario.username;
      setFallaOperador(nombreParaMostrar.toUpperCase());
    }
  }, [usuario]);

  const generarTextoFalla = () => {
    if (!puertoDetalle) return '';
    const op = fallaOperador || 'OPERADOR';
    const tt = fallaTT || '_____';
    const ot = fallaOT || '_____';
    const infoF = fallaInfo || '...';
    
    const sucursal = puertoDetalle.SERVICIO || 'N/A';
    const parcheo = puertoDetalle.PARCHEO || 'N/A';
    const dist = puertoDetalle.DISTANCIA_CLIENTE || 'N/A';
    const ruta = puertoDetalle.RUTA || 'N/A';
    const hilos = puertoDetalle.HILOS || 'N/A';
    const lambdas = puertoDetalle.LAMBDAS || 'N/A';
    const potCPE = puertoDetalle.POTENCIA_CPE || 'N/A';
    const potHub = puertoDetalle.POTENCIA_HUB || 'N/A';
    const coords = puertoDetalle.COORDENADAS || 'N/A';
    const dir = puertoDetalle.DIRECCION || 'N/A';
    const contactoNombre = puertoDetalle.CONTACTO_NOMBRE || 'SIN REGISTRO';
    const contactoTel = puertoDetalle.CONTACTO_TELEFONO || 'SIN REGISTRO';

    return `RNOC ${op} INFORMA INICIO DE FALLA MCA\n \nTT - ${tt}\nOT - ${ot}\n\nSERVICIO:\n${sucursal}\n \nCOMENTARIO ADICIONAL:\n${infoF}\n \nVALIDACIONES INICIALES:\n- Equipo Energizado: ${fallaEnergizado}\n- Alarmas en Equipos: ${fallaAlarmasEq}\n- Conexiones Correctas: ${fallaConexiones}\n- Status Puerto: ${fallaStatusPuerto}\n- Ping exitoso a CPE: ${fallaPing}\n- Falla Accesos: ${fallaAccesosSel}\n\nCONTACTO EN SITIO: ${contactoNombre} \nTELEFONO: ${contactoTel}\n\nPARCHEO:\n${parcheo}\nDistancias:\n${dist}\nRuta:\n${ruta}\nHilos fibra:\n${hilos}\nEtiquetas lambdas:\n${lambdas}\nPOTENCIA ANTERIOR CLIENTE:\n${potCPE}\nPOTENCIA ANTERIOR HUB:\n${potHub}\nUBICACION:\n${coords}\n${dir}\n\nAL MOMENTO DE LOCALIZAR AFECTACION, DE SU APOYO CON MEDICION EN AMBOS SENTIDOS PARA DESCARTAR SEGUNDOS DAÑOS*\n\n\nDE SU APOYO PARA ATENCION Y SEGUIMIENTO`;
  };

  const handleCopiarFalla = () => {
    navigator.clipboard.writeText(generarTextoFalla()).then(() => {
      alert("¡Formato de Despliegue de Falla copiado exitosamente!");
      cerrarModal();
    }).catch(() => {
      alert("Error al copiar automáticamente. Por favor, selecciona el texto y cópialo.");
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-sans text-slate-100">
       <div className="bg-[#0b132b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-xl shrink-0">
             <h2 className="text-lg font-black text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> DESPLIEGUE DE FALLA (RNOC)</h2>
             <button onClick={cerrarModal} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
             <div className="w-full md:w-1/2 p-5 overflow-y-auto space-y-4 border-r border-slate-800 custom-scrollbar">
                <div className="space-y-4">
                   <h3 className="text-[11px] font-bold text-red-300 uppercase tracking-widest border-b border-red-900/30 pb-2">Captura Manual</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">OPERADOR RNOC</label>
                        <input type="text" value={fallaOperador} onChange={e=>setFallaOperador(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-red-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">TT (Ticket)</label>
                        <input type="text" value={fallaTT} onChange={e=>setFallaTT(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:border-red-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">OT</label>
                        <input type="text" value={fallaOT} onChange={e=>setFallaOT(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:border-red-500 outline-none" />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Equipo Energizado</label>
                        <select value={fallaEnergizado} onChange={e=>setFallaEnergizado(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-red-500">
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Alarmas en Equipos</label>
                        <select value={fallaAlarmasEq} onChange={e=>setFallaAlarmasEq(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-red-500">
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Conexiones Correctas</label>
                        <select value={fallaConexiones} onChange={e=>setFallaConexiones(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-red-500">
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Status Puerto</label>
                        <select value={fallaStatusPuerto} onChange={e=>setFallaStatusPuerto(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-red-500">
                          <option value="UP">UP</option>
                          <option value="DOWN">DOWN</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Ping a CPE</label>
                        <select value={fallaPing} onChange={e=>setFallaPing(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-red-500">
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Accesos</label>
                        <select value={fallaAccesosSel} onChange={e=>setFallaAccesosSel(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-red-500">
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>                          
                   </div>
                   <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">INFORMACIÓN ADICIONAL</label>
                      <textarea rows="2" value={fallaInfo} onChange={e=>setFallaInfo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:border-red-500 outline-none resize-none" />
                   </div>
                </div>
             </div>
             <div className="w-full md:w-1/2 p-5 bg-[#050814] overflow-y-auto custom-scrollbar flex flex-col relative">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3 shrink-0 flex justify-between">
                  <span>Vista Previa del Reporte</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Auto-Calculado</span>
                </h3>
                <pre className="text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap flex-1 bg-transparent">{generarTextoFalla()}</pre>
             </div>
          </div>
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex justify-end gap-3 shrink-0">
             <button onClick={cerrarModal} className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer">CANCELAR</button>
             <button onClick={handleCopiarFalla} className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors flex items-center gap-2 shadow-lg shadow-red-900/20 cursor-pointer"><Copy className="w-4 h-4" /> COPIAR TEXTO</button>
          </div>
       </div>
    </div>
  );
}