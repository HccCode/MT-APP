import { useState } from 'react';
import { Search, Edit, Trash2 } from 'lucide-react';

export default function Geografia({ token, estructuraGeografica, cargarGeographyDB, handleLogout }) {
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

  // URL Dinámica
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const handleCancelarEdicionRegion = () => { 
    setIdRegionEditando(null); 
    setRegName(''); 
  };

  const procesarRegion = async (e) => {
    e.preventDefault();
    const url = idRegionEditando 
      ? `${API_URL}/api/geography/regions/${idRegionEditando}` 
      : `${API_URL}/api/geography/regions`;
    const method = idRegionEditando ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        }, 
        body: JSON.stringify({ nombre: regName.trim() }) 
      });
      
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { 
        setRegName(''); 
        setIdRegionEditando(null); 
        alert(idRegionEditando ? "Región actualizada." : "Región creada."); 
        await cargarGeographyDB(); 
      }
    } catch { 
      alert("Error de comunicación."); 
    }
  };

  const handleActivarModoEdicionRegion = (rId, rNombre) => { 
    setIdRegionEditando(rId); 
    setRegName(rNombre); 
  };

  const handleEliminarRegion = async (id, nombre) => {
    if (!window.confirm(`¿Borrar la región '${nombre}'?`)) return;
    const res = await fetch(`${API_URL}/api/geography/regions/${id}`, { 
      method: 'DELETE', 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    if (res.status === 401) { handleLogout(); return; }
    if (res.ok) await cargarGeographyDB(true);
  };

  const handleCancelarEdicionCiudad = () => { 
    setIdCiudadEditando(null); 
    setCitCode(''); 
    setCitName(''); 
    setCitRegId(''); 
  };

  const crearCiudad = async (e) => {
    e.preventDefault();
    if (!citCode) { alert("Especifica un ID."); return; }
    
    try {
      const method = idCiudadEditando ? 'PUT' : 'POST';
      const url = idCiudadEditando 
        ? `${API_URL}/api/geography/cities/${idCiudadEditando}` 
        : `${API_URL}/api/geography/cities`;
        
      const payload = idCiudadEditando 
        ? { nombre: citName.trim(), region_id: parseInt(citRegId) } 
        : { id: citCode.trim().toUpperCase(), nombre: citName.trim(), region_id: parseInt(citRegId) };
        
      const res = await fetch(url, { 
        method, 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        }, 
        body: JSON.stringify(payload) 
      });
      
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { 
        setCitCode(''); 
        setCitName(''); 
        setCitRegId(''); 
        setIdCiudadEditando(null); 
        alert("Ciudad guardada."); 
        await cargarGeographyDB(); 
      } 
    } catch { 
      alert("Error de comunicación."); 
    }
  };

  const handleEliminarCiudad = async (id, nombre) => {
    if (!window.confirm(`¿Borrar la ciudad '${nombre}'?`)) return;
    const res = await fetch(`${API_URL}/api/geography/cities/${id}`, { 
      method: 'DELETE', 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    if (res.status === 401) { handleLogout(); return; }
    if (res.ok) await cargarGeographyDB(true);
  };

  const handleCancelarEdicionHub = () => { 
    setIdHubEditando(null); 
    setHubName(''); 
    setHubCitId(''); 
    setHubDireccion(''); 
    setHubCoordenadas(''); 
  };

  const asignarHub = async (e) => {
    e.preventDefault();
    if (!hubCitId) { alert("Selecciona Ciudad."); return; }
    
    const nombreLimpio = hubName.trim().replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
    const idParaGuardar = idHubEditando 
      ? idHubEditando 
      : `${hubCitId.trim().toUpperCase()}_${nombreLimpio}_${Math.floor(Math.random() * 1000)}`;
      
    try {
      const res = await fetch(`${API_URL}/api/geography/hubs`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        }, 
        body: JSON.stringify({ 
          id: idParaGuardar, 
          nombre: hubName.trim(), 
          ciudad_id: hubCitId, 
          direccion: hubDireccion.trim(), 
          coordenadas: hubCoordenadas.trim() 
        }) 
      });
      
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { 
        const ciudadGuardada = hubCitId; 
        handleCancelarEdicionHub(); 
        alert("HUB guardado."); 
        await cargarGeographyDB(); 
        setHubCitId(ciudadGuardada); 
      }
    } catch { 
      alert("Error de comunicación."); 
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
    if (!window.confirm(`¿Borrar '${nombre}'?`)) return;
    const res = await fetch(`${API_URL}/api/geography/hubs/${id}`, { 
      method: 'DELETE', 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    if (res.status === 401) { handleLogout(); return; }
    if (res.ok) await cargarGeographyDB(true);
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
  
  const regionFiltroCiudad = Object.keys(estructuraGeografica).find(r => estructuraGeografica[r].id === parseInt(citRegId));

  return (
    <main className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BLOQUE DE REGIONES */}
        <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <form onSubmit={procesarRegion} className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {idRegionEditando ? '✏️ Editar Región' : '1. Alta Región'}
            </h3>
            
            <input 
              type="text" 
              placeholder="Nombre Región" 
              value={regName} 
              onChange={e=>setRegName(e.target.value)} 
              required 
              className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white" 
            />
            
            {idRegionEditando ? (
              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Actualizar</button>
                <button type="button" onClick={handleCancelarEdicionRegion} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Cancelar</button>
              </div>
            ) : (
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Añadir</button>
            )}
          </form>

          <div className="relative mt-4">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1.5" />
            <input 
              type="text" 
              placeholder="Buscar región..." 
              value={filtroBusquedaRegion} 
              onChange={e=>setFiltroBusquedaRegion(e.target.value)} 
              className="w-full bg-[#050814] border border-slate-800 text-xs py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors" 
            />
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 border-t border-slate-800 pt-3 mt-3 custom-scrollbar">
            {Object.keys(estructuraGeografica)
              .filter(r => r.toLowerCase().includes(filtroBusquedaRegion.toLowerCase()))
              .map(r => (
                <div key={estructuraGeografica[r].id} className="flex justify-between items-center bg-slate-950/60 p-2 rounded text-[11px] group">
                  <span className="font-bold text-white truncate pr-2">{r}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={() => handleActivarModoEdicionRegion(estructuraGeografica[r].id, r)} title="Editar Región" className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors cursor-pointer">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleEliminarRegion(estructuraGeografica[r].id, r)} title="Eliminar Región" className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
        
        {/* BLOQUE DE CIUDADES */}
        <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <form onSubmit={crearCiudad} className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {idCiudadEditando ? '✏️ Editar Ciudad' : '2. Alta Ciudad'}
            </h3>
            
            <select value={citRegId} onChange={e=>setCitRegId(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-slate-200">
              <option value="">-- Elige Región --</option>
              {Object.keys(estructuraGeografica).map(r => (
                <option key={estructuraGeografica[r].id} value={estructuraGeografica[r].id}>{r}</option>
              ))}
            </select>
            
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" 
                placeholder="ID (MXL)" 
                value={citCode} 
                onChange={e=>setCitCode(e.target.value)} 
                required 
                disabled={!!idCiudadEditando} 
                className="bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed" 
              />
              <input 
                type="text" 
                placeholder="Nombre" 
                value={citName} 
                onChange={e=>setCitName(e.target.value)} 
                required 
                className="bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white" 
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">
                {idCiudadEditando ? 'Guardar Cambios' : 'Inyectar'}
              </button>
              {idCiudadEditando && (
                <button type="button" onClick={handleCancelarEdicionCiudad} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {regionFiltroCiudad && (
            <>
              <div className="relative mt-4">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1.5" />
                <input 
                  type="text" 
                  placeholder="Buscar ciudad..." 
                  value={filtroBusquedaCiudad} 
                  onChange={e=>setFiltroBusquedaCiudad(e.target.value)} 
                  className="w-full bg-[#050814] border border-slate-800 text-xs py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors" 
                />
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border-t border-slate-800 pt-3 mt-3 custom-scrollbar">
                {Object.keys(estructuraGeografica[regionFiltroCiudad]?.ciudades || {})
                  .filter(c => c.toLowerCase().includes(filtroBusquedaCiudad.toLowerCase()) || estructuraGeografica[regionFiltroCiudad].ciudades[c].id.toLowerCase().includes(filtroBusquedaCiudad.toLowerCase()))
                  .map(c => {
                    const cityData = estructuraGeografica[regionFiltroCiudad].ciudades[c]; 
                    return (
                      <div key={cityData.id} className="flex justify-between items-center bg-slate-950/60 p-2 rounded text-[11px] group">
                        <span className="font-bold text-white truncate pr-2">{c}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <button 
                            type="button" 
                            onClick={() => { setIdCiudadEditando(cityData.id); setCitCode(cityData.id); setCitName(c); setCitRegId(estructuraGeografica[regionFiltroCiudad].id.toString()); }} 
                            className="text-blue-400 hover:bg-blue-500/20 p-2 rounded cursor-pointer transition-colors" title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleEliminarCiudad(cityData.id, c)} 
                            className="text-red-400 hover:bg-red-500/20 p-2 rounded cursor-pointer transition-colors" title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          )}
        </div>
        
        {/* BLOQUE DE HUBS */}
        <div className="bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 space-y-2 flex flex-col max-h-full overflow-hidden">
          <form onSubmit={asignarHub} className="space-y-2 shrink-0">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {idHubEditando ? '✏️ Editar HUB' : '3. Instalar HUB'}
            </h3>
            
            <select value={hubCitId} onChange={e=>setHubCitId(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-slate-200">
              <option value="">-- Ciudad Destino --</option>
              {Object.keys(estructuraGeografica).map(r => Object.keys(estructuraGeografica[r]?.ciudades || {}).map(c => (
                <option key={estructuraGeografica[r].ciudades[c].id} value={estructuraGeografica[r].ciudades[c].id}>{r} ➔ {c}</option>
              )))}
            </select>
            
            <input type="text" placeholder="Nombre del HUB / Hotel" value={hubName} onChange={e=>setHubName(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white" />
            <input type="text" placeholder="Dirección" value={hubDireccion} onChange={e=>setHubDireccion(e.target.value)} className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white" />
            <input type="text" placeholder="GPS" value={hubCoordenadas} onChange={e=>setHubCoordenadas(e.target.value)} className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-amber-500 font-mono" />
            
            <div className="flex gap-2">
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">
                {idHubEditando ? 'Guardar Cambios' : 'Guardar HUB'}
              </button>
              {idHubEditando && (
                <button type="button" onClick={handleCancelarEdicionHub} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="border-t border-slate-800 pt-3 mt-3 flex-1 flex flex-col min-h-[200px] overflow-hidden">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 shrink-0">Directorio de HUBs</h4>
            
            <div className="space-y-2 mb-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1.5" />
                <input 
                  type="text" 
                  placeholder="Buscar por ciudad..." 
                  value={filtroBusquedaHubCiudad} 
                  onChange={e=>setFiltroBusquedaHubCiudad(e.target.value)} 
                  className="w-full bg-[#050814] border border-slate-800 text-xs py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-amber-500 transition-colors" 
                />
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1.5" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre de HUB..." 
                  value={filtroBusquedaHub} 
                  onChange={e=>setFiltroBusquedaHub(e.target.value)} 
                  className="w-full bg-[#050814] border border-slate-800 text-xs py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-amber-500 transition-colors" 
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {todosLosHubsGlobal
                .filter(h => 
                  (filtroBusquedaHubCiudad === '' || h.nombreCiudad.toLowerCase().includes(filtroBusquedaHubCiudad.toLowerCase())) && 
                  (filtroBusquedaHub === '' || h.nombre.toLowerCase().includes(filtroBusquedaHub.toLowerCase()) || h.id.toLowerCase().includes(filtroBusquedaHub.toLowerCase()))
                )
                .map(h => (
                  <div key={h.id} className="bg-slate-950/60 p-2 rounded text-[11px] flex justify-between items-center group border border-slate-800/50 hover:border-amber-900/50 transition-colors">
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-bold text-amber-400 truncate">{h.nombre}</span>
                      <span className="text-[9px] text-slate-500 font-mono truncate">{h.nombreCiudad}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => handleActivarModoEdicionHub(h, h.idCiudad)} title="Editar HUB" className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors cursor-pointer">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleEliminarHub(h.id, h.nombre)} title="Eliminar HUB" className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              {todosLosHubsGlobal.length > 0 && todosLosHubsGlobal.filter(h => (filtroBusquedaHubCiudad === '' || h.nombreCiudad.toLowerCase().includes(filtroBusquedaHubCiudad.toLowerCase())) && (filtroBusquedaHub === '' || h.nombre.toLowerCase().includes(filtroBusquedaHub.toLowerCase()) || h.id.toLowerCase().includes(filtroBusquedaHub.toLowerCase()))).length === 0 && (
                <div className="text-center text-slate-600 text-xs italic py-4">No hay resultados que coincidan.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}