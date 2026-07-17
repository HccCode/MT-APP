import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Map, ShieldAlert, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function Geografia({ token, estructuraGeografica, cargarGeographyDB, handleLogout, esAdmin }) {
  const [filtroBusquedaRegion, setFiltroBusquedaRegion] = useState('');
  const [filtroBusquedaCiudad, setFiltroBusquedaCiudad] = useState('');
  const [filtroBusquedaHub, setFiltroBusquedaHub] = useState('');
  const [filtroBusquedaHubCiudad, setFiltroBusquedaHubCiudad] = useState('');

  const [idRegionEditando, setIdRegionEditando] = useState(null);
  const [idCiudadEditando, setIdCiudadEditando] = useState(null);
  const [idHubEditando, setIdHubEditando] = useState(null); 
  
  const [regName, setRegName] = useState('');
  const [citCode, setCitCode] = useState(''); 
  const [citName, setCitName] = useState('');
  const [citRegId, setCitRegId] = useState('');
  
  const [hubName, setHubName] = useState('');
  const [hubCitId, setHubCitId] = useState('');
  const [hubDireccion, setHubDireccion] = useState('');
  const [hubCoordenadas, setHubCoordenadas] = useState('');

  // ESTADO PARA NOTIFICACIONES
  const [msgGeo, setMsgGeo] = useState({ text: '', type: '' });

  // ESTADOS DE NAVEGACIÓN (Para explorar las listas haciendo clic)
  const [regionVista, setRegionVista] = useState(null); 
  const [ciudadVista, setCiudadVista] = useState(null); 

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // EFECTO PARA DESAPARECER LA NOTIFICACIÓN DESPUÉS DE 4 SEGUNDOS
  useEffect(() => {
    if (msgGeo.text) {
      const timer = setTimeout(() => {
        setMsgGeo({ text: '', type: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [msgGeo]);

  // ==================== 1. REGIONES ====================
  const handleCancelarEdicionRegion = () => { 
    setIdRegionEditando(null); 
    setRegName(''); 
  };

  const procesarRegion = async (e) => {
    e.preventDefault();
    setMsgGeo({ text: '', type: '' });
    
    const url = idRegionEditando 
      ? `${API_URL}/api/geography/regions/${idRegionEditando}` 
      : `${API_URL}/api/geography/regions`;
    const method = idRegionEditando ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, credentials: 'include',
        body: JSON.stringify({ nombre: regName.trim() }) 
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsgGeo({ text: data.detail || 'Fallo al procesar la región.', type: 'error' });
        if (res.status === 401) handleLogout();
        return;
      }
      
      setRegName(''); 
      setIdRegionEditando(null); 
      setMsgGeo({ text: idRegionEditando ? "Región actualizada correctamente." : "Región creada con éxito.", type: 'success' }); 
      await cargarGeographyDB(); 
    } catch { 
      setMsgGeo({ text: "Error de comunicación con el servidor.", type: 'error' }); 
    }
  };

  const handleActivarModoEdicionRegion = (rId, rNombre) => { 
    setIdRegionEditando(rId); 
    setRegName(rNombre); 
  };

  const handleEliminarRegion = async (id, nombre) => {
    if (!window.confirm(`ATENCIÓN: ¿Borrar la región '${nombre}' y todo su contenido permanentemente?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/geography/regions/${id}`, { 
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } ,credentials: 'include',
        });
        if (res.status === 401) { handleLogout(); return; }
        if (res.ok) {
        if (regionVista === nombre) { setRegionVista(null); setCiudadVista(null); }
        setMsgGeo({ text: "Región eliminada permanentemente.", type: 'success' });
        await cargarGeographyDB();
        } else {
            setMsgGeo({ text: "Error al eliminar la región.", type: 'error' });
        }
    } catch {
        setMsgGeo({ text: "Error de conexión al eliminar.", type: 'error' });
    }
  };

  // ==================== 2. CIUDADES ====================
  const handleCancelarEdicionCiudad = () => { 
    setIdCiudadEditando(null); 
    setCitCode(''); 
    setCitName(''); 
  };

  const crearCiudad = async (e) => {
    e.preventDefault();
    setMsgGeo({ text: '', type: '' });
    
    if (!citCode) { setMsgGeo({ text: "Especifica un ID para la ciudad.", type: 'error' }); return; }
    
    try {
      const method = idCiudadEditando ? 'PUT' : 'POST';
      const url = idCiudadEditando 
        ? `${API_URL}/api/geography/cities/${idCiudadEditando}` 
        : `${API_URL}/api/geography/cities`;
        
      const payload = { 
        id: citCode.trim().toUpperCase(), 
        nombre: citName.trim(), 
        region_id: parseInt(citRegId) 
      };
        
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, credentials: 'include',
        body: JSON.stringify(payload) 
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsgGeo({ text: data.detail || 'Fallo al registrar la ciudad. Verifica que el identificador no esté duplicado.', type: 'error' });
        if (res.status === 401) handleLogout();
        return;
      }
      
      setCitCode(''); 
      setCitName(''); 
      setIdCiudadEditando(null); 
      
      const regionDelSelect = Object.keys(estructuraGeografica).find(r => estructuraGeografica[r].id === parseInt(citRegId));
      if (regionDelSelect) setRegionVista(regionDelSelect);
      
      setMsgGeo({ text: "Ciudad guardada con éxito.", type: 'success' }); 
      await cargarGeographyDB(); 
    } catch { 
        setMsgGeo({ text: "Error de comunicación con el servidor.", type: 'error' }); 
    }
  };

  const handleEliminarCiudad = async (id, nombre) => {
    if (!window.confirm(`¿Borrar la ciudad '${nombre}'?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/geography/cities/${id}`, { 
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } ,credentials: 'include',
        });
        if (res.status === 401) { handleLogout(); return; }
        if (res.ok) {
        if (ciudadVista?.id === id) setCiudadVista(null);
        setMsgGeo({ text: "Ciudad eliminada correctamente.", type: 'success' });
        await cargarGeographyDB();
        } else {
            setMsgGeo({ text: "Error al eliminar la ciudad.", type: 'error' });
        }
    } catch {
        setMsgGeo({ text: "Error de red al eliminar la ciudad.", type: 'error' });
    }
  };

  // ==================== 3. HUBS ====================
  const handleCancelarEdicionHub = () => { 
    setIdHubEditando(null); 
    setHubName(''); 
    setHubDireccion(''); 
    setHubCoordenadas(''); 
  };

  const asignarHub = async (e) => {
    e.preventDefault();
    setMsgGeo({ text: '', type: '' });
    
    if (!hubCitId) { setMsgGeo({ text: "Selecciona una Ciudad destino.", type: 'error' }); return; }
    
    const nombreLimpio = hubName.trim().replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
    const idParaGuardar = idHubEditando 
      ? idHubEditando 
      : `${hubCitId.trim().toUpperCase()}_${nombreLimpio}_${Math.floor(Math.random() * 1000)}`;
      
    try {
      const res = await fetch(`${API_URL}/api/geography/hubs`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, credentials: 'include',
        body: JSON.stringify({ 
          id: idParaGuardar, nombre: hubName.trim(), ciudad_id: hubCitId, 
          direccion: hubDireccion.trim(), coordenadas: hubCoordenadas.trim() 
        }) 
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsgGeo({ text: data.detail || 'Fallo al intentar registrar el HUB.', type: 'error' });
        if (res.status === 401) handleLogout();
        return;
      }
      
      setHubName(''); 
      setHubDireccion(''); 
      setHubCoordenadas(''); 
      setIdHubEditando(null);
      setMsgGeo({ text: "HUB configurado exitosamente.", type: 'success' }); 
      await cargarGeographyDB(); 
    } catch { 
        setMsgGeo({ text: "Error de comunicación con el servidor.", type: 'error' }); 
    }
  };

  const handleActivarModoEdicionHub = (h, ciudadId) => { 
    setIdHubEditando(h.id); 
    setHubName(h.nombre); 
    setHubCitId(String(ciudadId)); 
    setHubDireccion(h.direccion || ''); 
    setHubCoordenadas(h.coordenadas || ''); 
  };

  const handleEliminarHub = async (id, nombre) => {
    if (!window.confirm(`¿Borrar el Hub '${nombre}'?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/geography/hubs/${id}`, { 
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } ,credentials: 'include'
        });
        if (res.status === 401) { handleLogout(); return; }
        if (res.ok) {
            setMsgGeo({ text: "HUB eliminado correctamente.", type: 'success' });
            await cargarGeographyDB();
        } else {
            setMsgGeo({ text: "Error al eliminar el HUB.", type: 'error' });
        }
    } catch {
        setMsgGeo({ text: "Error de red al eliminar el HUB.", type: 'error' });
    }
  };

  let todosLosHubsGlobal = [];
  Object.keys(estructuraGeografica).forEach(r => { 
    Object.keys(estructuraGeografica[r]?.ciudades || {}).forEach(c => { 
      const cityData = estructuraGeografica[r].ciudades[c]; 
      (cityData.hubs || []).forEach(h => { 
        todosLosHubsGlobal.push({ ...h, nombreCiudad: c, idCiudad: cityData.id, nombreRegion: r }); 
      }); 
    }); 
  });

  return (
    <main className="flex-1 p-6 space-y-6 overflow-hidden flex flex-col h-full bg-[#070b19] relative">
      
      {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
      {msgGeo.text && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${msgGeo.type === 'error' ? 'bg-red-950/95 border-red-500/50 text-red-400' : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-400'}`}>
          {msgGeo.type === 'error' ? <AlertTriangle className="w-6 h-6 shrink-0" /> : <CheckCircle className="w-6 h-6 shrink-0" />}
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest">{msgGeo.type === 'error' ? 'Error de Operación' : 'Operación Exitosa'}</h4>
            <p className="text-xs text-white mt-0.5 font-medium">{msgGeo.text}</p>
          </div>
          <button onClick={() => setMsgGeo({ text: '', type: '' })} className="ml-4 p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="border-b border-slate-800 pb-2 shrink-0">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Map className="w-5 h-5 text-indigo-400" /> Configuración de Red Geográfica
        </h2>
        <p className="text-xs text-slate-500 mt-1">Explora haciendo clic en las regiones y ciudades de las listas.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        
        {/* COLUMNA 1: REGIONES */}
        <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden shadow-lg h-full">
          {esAdmin ? (
            <form onSubmit={procesarRegion} className="space-y-3 shrink-0">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                {idRegionEditando ? '✏️ Editar Región' : '1. Alta Región'}
              </h3>
              <input type="text" placeholder="Nombre Región" value={regName} onChange={e=>setRegName(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white outline-none focus:border-indigo-500" />
              {idRegionEditando ? (
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Actualizar</button>
                  <button type="button" onClick={handleCancelarEdicionRegion} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Cancelar</button>
                </div>
              ) : (
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Añadir Región</button>
              )}
            </form>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded p-3 text-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Solo Lectura</p>
            </div>
          )}

          <div className="relative mt-4 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1.5" />
            <input type="text" placeholder="Buscar región..." value={filtroBusquedaRegion} onChange={e=>setFiltroBusquedaRegion(e.target.value)} className="w-full bg-[#050814] border border-slate-800 text-xs py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 border-t border-slate-800 pt-3 mt-3 custom-scrollbar">
            {Object.keys(estructuraGeografica).length === 0 ? (
              <p className="text-center text-xs text-slate-500 italic py-4">No hay regiones disponibles para este usuario.</p>
            ) : (
              Object.keys(estructuraGeografica)
                .filter(r => r.toLowerCase().includes(filtroBusquedaRegion.toLowerCase()))
                .map(r => {
                  const isActive = regionVista === r;
                  return (
                    <div 
                      key={estructuraGeografica[r].id} 
                      onClick={() => { setRegionVista(r); setCiudadVista(null); }}
                      className={`flex justify-between items-center p-2 rounded text-[11px] group cursor-pointer transition-colors border ${isActive ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-950/60 border-transparent hover:bg-slate-800/40 hover:border-indigo-500/30'}`}
                    >
                      <span className={`font-bold truncate pr-2 ${isActive ? 'text-indigo-300' : 'text-white'}`}>{r}</span>
                      {esAdmin && (
                        <div className="flex gap-1.5 shrink-0">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleActivarModoEdicionRegion(estructuraGeografica[r].id, r); }} className="text-blue-400 hover:bg-blue-500/20 p-1.5 rounded transition-colors" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleEliminarRegion(estructuraGeografica[r].id, r); }} className="text-red-400 hover:bg-red-500/20 p-1.5 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        </div>
        
        {/* COLUMNA 2: CIUDADES */}
        <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden shadow-lg h-full">
          {esAdmin ? (
            <form onSubmit={crearCiudad} className="space-y-3 shrink-0">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {idCiudadEditando ? '✏️ Editar Ciudad' : '2. Alta Ciudad'}
              </h3>
              
              <select value={citRegId} onChange={e=>setCitRegId(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-slate-200 outline-none focus:border-emerald-500">
                <option value="">-- Elige Región Destino --</option>
                {Object.keys(estructuraGeografica).map(r => (
                  <option key={estructuraGeografica[r].id} value={estructuraGeografica[r].id}>{r}</option>
                ))}
              </select>
              
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Clave Identificadora" value={citCode} onChange={e=>setCitCode(e.target.value)} required disabled={!!idCiudadEditando} className="bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white uppercase disabled:opacity-50 outline-none focus:border-emerald-500" />
                <input type="text" placeholder="Nombre" value={citName} onChange={e=>setCitName(e.target.value)} required className="bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white outline-none focus:border-emerald-500" />
              </div>
              
              <div className="flex gap-2">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">{idCiudadEditando ? 'Guardar Cambios' : 'Inyectar Ciudad'}</button>
                {idCiudadEditando && (<button type="button" onClick={handleCancelarEdicionCiudad} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Cancelar</button>)}
              </div>
            </form>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded p-3 text-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Solo Lectura</p>
            </div>
          )}

          <div className="flex-1 flex flex-col mt-4 border-t border-slate-800 pt-3 overflow-hidden">
            <div className="relative shrink-0 mb-3">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1.5" />
              <input type="text" placeholder="Buscar ciudad..." value={filtroBusquedaCiudad} onChange={e=>setFiltroBusquedaCiudad(e.target.value)} className="w-full bg-[#050814] border border-slate-800 text-xs py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
              {!regionVista ? (
                <p className="text-center text-xs text-slate-500 italic py-4 border border-dashed border-slate-800 rounded p-4">Haz clic en una región de la columna izquierda para ver sus ciudades.</p>
              ) : Object.keys(estructuraGeografica[regionVista]?.ciudades || {}).length === 0 ? (
                <p className="text-center text-xs text-slate-500 italic py-4">No hay ciudades en {regionVista}.</p>
              ) : (
                Object.keys(estructuraGeografica[regionVista].ciudades)
                  .filter(c => c.toLowerCase().includes(filtroBusquedaCiudad.toLowerCase()))
                  .map(c => {
                    const cityData = estructuraGeografica[regionVista].ciudades[c]; 
                    const isActive = ciudadVista?.id === cityData.id;
                    return (
                      <div 
                        key={cityData.id} 
                        onClick={() => setCiudadVista({id: cityData.id, nombre: c})}
                        className={`flex justify-between items-center p-2 rounded text-[11px] group cursor-pointer transition-colors border ${isActive ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-slate-950/60 border-transparent hover:bg-slate-800/40 hover:border-emerald-500/30'}`}
                      >
                        {/* ID OCULTO DE ACUERDO A LA REGLA DE SEGURIDAD */}
                        <span className={`font-bold truncate pr-2 ${isActive ? 'text-emerald-400' : 'text-white'}`}>{c}</span>
                        {esAdmin && (
                          <div className="flex gap-1.5 shrink-0">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setIdCiudadEditando(cityData.id); setCitCode(cityData.id); setCitName(c); setCitRegId(estructuraGeografica[regionVista].id.toString()); }} className="text-blue-400 hover:bg-blue-500/20 p-1.5 rounded transition-colors" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleEliminarCiudad(cityData.id, c); }} className="text-red-400 hover:bg-red-500/20 p-1.5 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>
        
        {/* COLUMNA 3: HUBS */}
        <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden shadow-lg h-full">
          <form onSubmit={asignarHub} className="space-y-2 shrink-0">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {idHubEditando ? '✏️ Editar HUB' : '3. Instalar HUB'}
            </h3>
            
            <select value={hubCitId} onChange={e=>setHubCitId(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-slate-200 outline-none focus:border-amber-500">
              <option value="">-- Ciudad Destino --</option>
              {Object.keys(estructuraGeografica).map(r => Object.keys(estructuraGeografica[r]?.ciudades || {}).map(c => (
                <option key={estructuraGeografica[r].ciudades[c].id} value={estructuraGeografica[r].ciudades[c].id}>{r} ➔ {c}</option>
              )))}
            </select>
            
            <input type="text" placeholder="Nombre del HUB / Hotel" value={hubName} onChange={e=>setHubName(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white outline-none focus:border-amber-500" />
            <input type="text" placeholder="Dirección" value={hubDireccion} onChange={e=>setHubDireccion(e.target.value)} className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white outline-none focus:border-amber-500" />
            <input type="text" placeholder="GPS" value={hubCoordenadas} onChange={e=>setHubCoordenadas(e.target.value)} className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-amber-500 font-mono outline-none focus:border-amber-500" />
            
            <div className="flex gap-2 pt-1">
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">
                {idHubEditando ? 'Guardar Cambios' : 'Guardar HUB'}
              </button>
              {idHubEditando && (<button type="button" onClick={handleCancelarEdicionHub} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Cancelar</button>)}
            </div>
          </form>

          <div className="border-t border-slate-800 pt-3 mt-3 flex-1 flex flex-col overflow-hidden">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 shrink-0 flex justify-between items-center">
              <span>{ciudadVista ? `HUBs en ${ciudadVista.nombre}` : 'Directorio Global de HUBs'}</span>
              {ciudadVista && <button onClick={() => setCiudadVista(null)} className="text-amber-400 hover:underline cursor-pointer">Ver Todos</button>}
            </h4>
            
            <div className="space-y-2 mb-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1.5" />
                <input type="text" placeholder="Filtrar por nombre..." value={filtroBusquedaHub} onChange={e=>setFiltroBusquedaHub(e.target.value)} className="w-full bg-[#050814] border border-slate-800 text-xs py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {todosLosHubsGlobal.length === 0 ? (
                <p className="text-center text-xs text-slate-500 italic py-4">No hay HUBs instalados.</p>
              ) : (
                todosLosHubsGlobal
                  .filter(h => ciudadVista ? h.idCiudad === ciudadVista.id : true)
                  .filter(h => (filtroBusquedaHubCiudad === '' || h.nombreCiudad.toLowerCase().includes(filtroBusquedaHubCiudad.toLowerCase())) && (filtroBusquedaHub === '' || h.nombre.toLowerCase().includes(filtroBusquedaHub.toLowerCase())))
                  .map(h => (
                    <div key={h.id} className="bg-slate-950/60 p-2 rounded text-[11px] flex justify-between items-center group border border-slate-800/50 hover:border-amber-900/50 hover:bg-slate-800/40 transition-colors">
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-bold text-amber-400 truncate">{h.nombre}</span>
                        <span className="text-[9px] text-slate-500 font-mono truncate">{h.nombreCiudad}</span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button type="button" onClick={() => handleActivarModoEdicionHub(h, h.idCiudad)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded cursor-pointer transition-colors" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleEliminarHub(h.id, h.nombre)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded cursor-pointer transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}