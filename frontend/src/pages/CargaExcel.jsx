import { useState } from 'react';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';

export default function CargaExcel({ token, estructuraGeografica, handleLogout }) {
  const [cargaReg, setCargaReg] = useState('');
  const [cargaCd, setCargaCd] = useState('');
  const [cargaHub, setCargaHub] = useState('');
  const [subiendoExcel, setSubiendoExcel] = useState(false);

  // URL Dinámica
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({
        id: estructuraGeografica[region].ciudades[nombre].id,
        nombre: nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const handleSubirExcel = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    
    const hubObj = estructuraGeografica[cargaReg]?.ciudades?.[cargaCd]?.hubs.find(h => h.id === cargaHub);
    const nombreHubVisual = hubObj?.nombre || cargaHub;
    
    const continuar = window.confirm(`⚠️ ALERTA DE REESCRITURA DE DATOS ⚠️\n\n¿Estás seguro de cargar el archivo "${file.name}"?\n\nEsta acción ELIMINARÁ el inventario actual del HUB [${nombreHubVisual}].`);
    if (!continuar) { e.target.value = ''; return; }

    setSubiendoExcel(true); 
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/hubs/upload-excel?id_hub=${cargaHub}`, { 
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData 
      });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json(); 
      alert(data.detail); 
    } catch { alert("Error inyectando inventario."); } finally { setSubiendoExcel(false); e.target.value = ''; }
  };

  return (
    <main className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="border-b border-slate-800 pb-2"><h2 className="text-base font-bold text-white flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Aprovisionamiento Masivo de Inventario Óptico</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">1. Nodo Central Destino</h3>
          <div className="space-y-3">
            <div><label className="text-[10px] text-slate-500 flex items-center mb-1">Región {!cargaReg && <span className="text-red-400 font-bold ml-1.5">(⚠️ REQUERIDO)</span>}</label><select value={cargaReg} onChange={(e) => { setCargaReg(e.target.value); setCargaCd(''); setCargaHub(''); }} className={`w-full bg-[#1c2541] border text-xs p-2 rounded text-slate-200 transition-colors ${!cargaReg ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-700'}`}><option value="">-- SELECCIONE UNA REGIÓN --</option>{Object.keys(estructuraGeografica).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div><label className="text-[10px] text-slate-500 flex items-center mb-1">Ciudad {!cargaCd && <span className="text-red-400 font-bold ml-1.5">(⚠️ REQUERIDO)</span>}</label><select value={cargaCd} onChange={(e) => { setCargaCd(e.target.value); setCargaHub(''); }} disabled={!cargaReg} className={`w-full bg-[#1c2541] border text-xs p-2 rounded text-slate-200 transition-colors ${!cargaCd ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-700'} disabled:opacity-50`}><option value="">-- SELECCIONE UNA CIUDAD --</option>{cargaReg && obtenerCiudadesOrdenadas(cargaReg).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
            <div><label className="text-[10px] text-slate-500 flex items-center mb-1">HUB Activo {!cargaHub && <span className="text-red-400 font-bold ml-1.5">(⚠️ REQUERIDO)</span>}</label><select value={cargaHub} onChange={(e) => setCargaHub(e.target.value)} disabled={!cargaCd} className={`w-full bg-[#1c2541] border text-xs p-2 rounded font-bold font-mono transition-colors ${!cargaHub ? 'border-red-500/80 text-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-700 text-blue-400'} disabled:opacity-50`}><option value="">-- SELECCIONE UN HUB --</option>{(estructuraGeografica[cargaReg]?.ciudades?.[cargaCd]?.hubs || []).map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}</select></div>
          </div>
        </div>
        <div className="md:col-span-2 bg-[#0b132b]/20 border border-slate-800 rounded-xl p-8 flex flex-col justify-center items-center text-center">
          {cargaReg && cargaCd && cargaHub ? (
            <div className="max-w-md space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto shadow-lg"><UploadCloud className={`w-8 h-8 ${subiendoExcel ? 'animate-bounce' : ''}`} /></div>
              <div><h3 className="text-base font-bold text-white">Subir archivo de Excel al HUB <span className="font-bold text-emerald-400">[{estructuraGeografica[cargaReg]?.ciudades?.[cargaCd]?.hubs.find(h => h.id === cargaHub)?.nombre || cargaHub}]</span></h3><p className="text-xs text-slate-400 mt-2">El motor inyectará todas las columnas y preservará la metadata de ingeniería en MT_DB.</p></div>
              <label className={`w-full flex flex-col items-center justify-center px-4 py-6 border border-dashed rounded-xl cursor-pointer transition-all ${subiendoExcel ? 'bg-amber-500/5 border-amber-500/40 text-amber-400 pointer-events-none' : 'bg-slate-950 border-slate-800 hover:bg-slate-900/60 text-slate-300'}`}><span className="text-xs font-bold uppercase tracking-wider">{subiendoExcel ? '⚙️ Inyectando filas en MT_DB...' : '📁 Seleccionar Archivo .xlsx / .xls'}</span><input type="file" accept=".xlsx, .xls" disabled={subiendoExcel} onChange={handleSubirExcel} className="hidden" /></label>
            </div>
          ) : (
            <div className="text-xs text-red-400/80 italic flex flex-col items-center gap-2"><span className="text-2xl">⚠️</span>{(!cargaReg || !cargaCd) ? "Selecciona la Región y Ciudad para comenzar." : "Selecciona un HUB específico en el panel izquierdo para habilitar la carga masiva."}</div>
          )}
        </div>
      </div>
    </main>
  );
}