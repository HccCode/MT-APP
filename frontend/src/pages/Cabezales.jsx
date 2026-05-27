import { useState } from 'react';
import { Search, Activity } from 'lucide-react';
import ModalAlineacion from '../components/modals/ModalAlineacion';

export default function Cabezales({ token, handleLogout }) {
  const [busqueda, setBusqueda] = useState('');
  const [alineacionActiva, setAlineacionActiva] = useState(null);
  const [cabezalIdSeleccionado, setCabezalIdSeleccionado] = useState('');

  // DATOS MOCK DE PRUEBA (Deberás reemplazarlos con tu llamada a la API `fetch`)
  const datosMock = [
    {
      id: 'CBZ-MXL-001',
      ciudad: 'Mexicali', // En el futuro esto se llenará automáticamente por el ID
      servicio: 'Video Digital HD',
      gestion_qam: '10.20.30.40',
      marca: 'Harmonic',
      modelo: 'ProQAM',
      serie: 'SN-99887766',
      alineacion: [
        { portadora: '453.00', formato: 'QAM256', canal: '101', nombre_servicio: 'Fox Sports HD', mcast_ip: '239.1.1.1', source_ip: '10.0.0.5', udp: '5000', sid: '1' },
        { portadora: '453.00', formato: 'QAM256', canal: '102', nombre_servicio: 'ESPN HD', mcast_ip: '239.1.1.2', source_ip: '10.0.0.5', udp: '5000', sid: '2' }
      ]
    }
  ];

  const abrirModalAlineacion = (cabezal) => {
    setCabezalIdSeleccionado(cabezal.id);
    setAlineacionActiva(cabezal.alineacion || []);
  };

  const cerrarModal = () => {
    setAlineacionActiva(null);
    setCabezalIdSeleccionado('');
  };

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden relative">
      
      {/* BARRA DE HERRAMIENTAS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
        <h2 className="text-xl font-bold text-slate-100">Gestión de Cabezales</h2>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Buscar por ID, Ciudad, Marca..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#050814] border border-slate-700 text-sm py-2 pl-9 pr-3 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE CABEZALES */}
      <div className="flex-1 bg-[#0b132b]/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="bg-[#1c2541] sticky top-0 z-10 border-b border-slate-700 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Ciudad</th>
                <th className="p-3">Servicio</th>
                <th className="p-3 text-center">Alineación</th>
                <th className="p-3">Gestión QAM</th>
                <th className="p-3">Marca</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Serie</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800/50">
              {datosMock.map((cabezal, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                  <td className="p-3 font-bold text-white">{cabezal.id}</td>
                  <td className="p-3">{cabezal.ciudad}</td>
                  <td className="p-3">{cabezal.servicio}</td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => abrirModalAlineacion(cabezal)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded shadow cursor-pointer transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      VER DETALLES
                    </button>
                  </td>
                  <td className="p-3 font-mono text-amber-400">{cabezal.gestion_qam}</td>
                  <td className="p-3">{cabezal.marca}</td>
                  <td className="p-3 text-slate-400">{cabezal.modelo}</td>
                  <td className="p-3 font-mono text-slate-400">{cabezal.serie}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENDERIZADO DEL MODAL */}
      {alineacionActiva && (
        <ModalAlineacion 
          alineacionData={alineacionActiva} 
          cabezalId={cabezalIdSeleccionado}
          cerrarModal={cerrarModal} 
        />
      )}
    </main>
  );
}