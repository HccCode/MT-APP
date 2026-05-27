import { useState, useEffect } from 'react';
import { Search, Activity, UploadCloud } from 'lucide-react';
import ModalAlineacion from '../components/modals/ModalAlineacion';

export default function Cabezales({ token, handleLogout, puedeCargar }) {
  const [busqueda, setBusqueda] = useState('');
  const [alineacionActiva, setAlineacionActiva] = useState(null);
  const [cabezalIdSeleccionado, setCabezalIdSeleccionado] = useState('');
  
  const [subiendoExcel, setSubiendoExcel] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [cabezalesDB, setCabezalesDB] = useState([]);

  // URL de la API
  const API_URL = import.meta.env.VITE_API_URL || 'https://mt-backend-2ox8.onrender.com';

  // ==========================================
  // CARGAR DATOS DESDE FASTAPI
  // ==========================================
  const cargarCabezales = async () => {
    setCargandoDatos(true);
    try {
      const res = await fetch(`${API_URL}/api/cabezales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      if (data.status === 'success') {
        setCabezalesDB(data.data);
      }
    } catch (error) {
      console.error("Error al cargar cabezales desde DB", error);
    } finally {
      setCargandoDatos(false);
    }
  };

  // Se ejecuta al montar el componente
  useEffect(() => {
    cargarCabezales();
  }, []);

  // ==========================================
  // LÓGICA DE SUBIDA DE EXCEL
  // ==========================================
  const handleSubirExcelCabezales = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    
    const continuar = window.confirm(`¿Estás seguro de cargar el archivo "${file.name}" para los Cabezales?\n\nAsegúrate de que contenga la columna ID.`);
    if (!continuar) { e.target.value = ''; return; }

    setSubiendoExcel(true); 
    const formData = new FormData(); 
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/cabezales/upload-excel`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` }, 
        body: formData 
      });
      
      if (res.status === 401) { handleLogout(); return; }
      
      const data = await res.json(); 
      if (data.status === 'success') {
        alert("Archivo de cabezales cargado exitosamente."); 
        cargarCabezales(); // Refrescar la tabla automáticamente después de cargar el archivo
      } else {
        alert(`Error: ${data.detail}`);
      }
      
    } catch (error) { 
      console.error(error);
      alert("Hubo un problema de conexión al cargar el Excel."); 
    } finally { 
      setSubiendoExcel(false); 
      e.target.value = ''; 
    }
  };

  // ==========================================
  // MODALES Y FILTROS
  // ==========================================
  const abrirModalAlineacion = (cabezal) => {
    setCabezalIdSeleccionado(cabezal.id);
    setAlineacionActiva(cabezal.alineacion || []);
  };

  const cerrarModal = () => {
    setAlineacionActiva(null);
    setCabezalIdSeleccionado('');
  };

  const datosFiltrados = cabezalesDB.filter(c => 
    c.id?.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.ciudad?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.marca?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
        <h2 className="text-xl font-bold text-slate-100">Gestión de Cabezales</h2>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
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

          {puedeCargar && (
            <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${subiendoExcel ? 'bg-emerald-600/50 text-emerald-300 pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'}`}>
              <UploadCloud className={`w-4 h-4 ${subiendoExcel ? 'animate-bounce' : ''}`} />
              {subiendoExcel ? 'PROCESANDO...' : 'CARGAR EXCEL'}
              <input type="file" accept=".xlsx, .xls" disabled={subiendoExcel} onChange={handleSubirExcelCabezales} className="hidden" />
            </label>
          )}
        </div>
      </div>

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
              {cargandoDatos ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-400">Cargando base de datos de cabezales...</td></tr>
              ) : datosFiltrados.length === 0 ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-500">No se encontraron cabezales. Sube un archivo Excel.</td></tr>
              ) : (
                datosFiltrados.map((cabezal, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                    <td className="p-3 font-bold text-white">{cabezal.id}</td>
                    <td className="p-3">{cabezal.ciudad}</td>
                    <td className="p-3">{cabezal.servicio}</td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => abrirModalAlineacion(cabezal)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded shadow cursor-pointer transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5" /> VER {cabezal.alineacion?.length || 0} CANALES
                      </button>
                    </td>
                    <td className="p-3 font-mono text-amber-400">{cabezal.gestion_qam}</td>
                    <td className="p-3">{cabezal.marca}</td>
                    <td className="p-3 text-slate-400">{cabezal.modelo}</td>
                    <td className="p-3 font-mono text-slate-400">{cabezal.serie}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {alineacionActiva && (
        <ModalAlineacion alineacionData={alineacionActiva} cabezalId={cabezalIdSeleccionado} cerrarModal={cerrarModal} />
      )}
    </main>
  );
}