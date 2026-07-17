import { useState, useEffect } from 'react';
import { Search, Radio, Wifi, Save, Plus, Trash2, MapPin, Router, Link } from 'lucide-react';

export default function Microondas({ token, puedeEditar, handleLogout, estructuraGeografica = {} }) {
  // --- FILTROS MAESTROS SUPERIORES (CASCADA) ---
  const [mwReg, setMwReg] = useState(() => localStorage.getItem('mcm_mw_reg') || '');
  const [mwCd, setMwCd] = useState(() => localStorage.getItem('mcm_mw_cd') || '');
  const [mwRb, setMwRb] = useState(() => localStorage.getItem('mcm_mw_rb') || 'TODOS');

  // --- CONTROL DE SUB-PESTAÑAS INTERNAS ---
  const [subTab, setSubTab] = useState('enlaces'); 
  
  // --- ESTADOS DE DATOS CRUD ---
  const [enlaces, setEnlaces] = useState([]);
  const [radioBases, setRadioBases] = useState([]);
  const [accessPoints, setAccessPoints] = useState([]);
  
  const [filtroTexto, setFiltroTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [itemDetalle, setItemDetalle] = useState(null);
  const [editCampos, setEditCampos] = useState({});
  const [creandoNuevo, setCreandoNuevo] = useState(false);

  const [formRbId, setFormRbId] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => { localStorage.setItem('mcm_mw_reg', mwReg); }, [mwReg]);
  useEffect(() => { localStorage.setItem('mcm_mw_cd', mwCd); }, [mwCd]);
  useEffect(() => { localStorage.setItem('mcm_mw_rb', mwRb); }, [mwRb]);

  useEffect(() => {
    if (!mwReg && estructuraGeografica && Object.keys(estructuraGeografica).length > 0) {
      setMwReg(Object.keys(estructuraGeografica)[0]);
    }
  }, [estructuraGeografica, mwReg]);

  const cargarDatosSistemas = async () => {
    setCargando(true);
    try {
      const [resEnl, resRb, resAp] = await Promise.all([
        fetch(`${API_URL}/api/microondas?q=${filtroTexto}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/microondas/radiobases`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/microondas/accesspoints`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (resEnl.status === 401) { handleLogout(); return; }
      
      if (resEnl.ok) setEnlaces((await resEnl.json()).data);
      if (resRb.ok) setRadioBases((await resRb.json()).data);
      if (resAp.ok) setAccessPoints((await resAp.json()).data);
    } catch (e) { console.error(e); } finally { setCargando(false); }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => cargarDatosSistemas(), 300);
    return () => clearTimeout(timeoutId);
  }, [filtroTexto, token]);

  const obtenerCiudadesOrdenadas = (region) => {
    if (!region || !estructuraGeografica[region]?.ciudades) return [];
    return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({
        id: estructuraGeografica[region].ciudades[nombre].id,
        nombre: nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const seleccionarItem = (item) => {
    setCreandoNuevo(false);
    setItemDetalle(item);
    
    let nuevosCampos = { ...item };
    
    if (subTab === 'enlaces' && item.ap_id) {
        const ap = accessPoints.find(a => a.id === item.ap_id);
        if (ap) {
            setFormRbId(ap.radio_base_id);
            nuevosCampos.frecuencia = ap.frecuencia || nuevosCampos.frecuencia || '';
            nuevosCampos.ssid = ap.ssid || nuevosCampos.ssid || '';
        }
    } else {
        setFormRbId('');
    }
    
    setEditCampos(nuevosCampos);
  };

  const prepararNuevo = () => {
    setItemDetalle(null);
    setCreandoNuevo(true);
    setFormRbId('');
    
    if (subTab === 'enlaces') {
      setEditCampos({ 
        estatus: 'ACTIVO', cliente: '', ap_id: '', direccion: '', coordenadas: '',
        ciudad: mwCd, sitio_base: mwRb !== 'TODOS' ? (radioBases.find(r=>String(r.id)===String(mwRb))?.nombre || '') : ''
      });
      if(mwRb !== 'TODOS') setFormRbId(mwRb);
    } 
    else if (subTab === 'radiobases') {
      setEditCampos({ nombre: '', ciudad: mwCd, coordenadas: '', altura_torre: '' });
    } 
    else if (subTab === 'aps') {
      setEditCampos({ radio_base_id: mwRb !== 'TODOS' ? parseInt(mwRb) : '', nombre_ap: '', estatus: 'ACTIVO', frecuencia: '', ssid: '' });
    }
  };

  const guardarItem = async () => {
    const payload = { ...editCampos };

    if (subTab === 'aps') {
        if (!payload.radio_base_id || isNaN(parseInt(payload.radio_base_id))) {
            alert("Error: Debes seleccionar una Radio Base Padre válida para este AP.");
            return;
        }
        if (!payload.nombre_ap || String(payload.nombre_ap).trim() === '') {
            alert("Error: El Nombre del AP es obligatorio.");
            return;
        }
        payload.radio_base_id = parseInt(payload.radio_base_id);
    } 
    else if (subTab === 'radiobases') {
        if (!payload.nombre || String(payload.nombre).trim() === '') {
            alert("Error: El Nombre de la Radio Base es obligatorio.");
            return;
        }
    } 
    else if (subTab === 'enlaces') {
        if (!payload.cliente || String(payload.cliente).trim() === '') {
            alert("Error: El nombre del Cliente / Servicio es obligatorio.");
            return;
        }
        if (payload.ap_id) {
            payload.ap_id = parseInt(payload.ap_id);
        } else {
            payload.ap_id = null; 
        }
    }

    try {
      const isUpdate = !creandoNuevo && itemDetalle?.id;
      let endpoint = '/api/microondas';
      if (subTab === 'radiobases') endpoint = '/api/microondas/radiobases';
      if (subTab === 'aps') endpoint = '/api/microondas/accesspoints';

      const url = isUpdate ? `${API_URL}${endpoint}/${itemDetalle.id}` : `${API_URL}${endpoint}`;
      
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Guardado correctamente en el inventario.");
        setCreandoNuevo(false);
        setItemDetalle(null);
        cargarDatosSistemas();
      } else {
        const errorData = await res.json();
        console.error("Detalle del Error Backend:", errorData);
        alert("Error de validación. Revisa que todos los parámetros sean correctos.");
      }
    } catch (e) { console.error("Error de Red:", e); }
  };

  const eliminarItem = async () => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro de la base de datos?")) return;
    try {
      let endpoint = '/api/microondas';
      if (subTab === 'radiobases') endpoint = '/api/microondas/radiobases';
      if (subTab === 'aps') endpoint = '/api/microondas/accesspoints';

      await fetch(`${API_URL}${endpoint}/${itemDetalle.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setItemDetalle(null);
      cargarDatosSistemas();
    } catch (e) { console.error(e); }
  };

  const manejarCambioAP = (ap_id) => {
      const idStr = String(ap_id);
      if (!idStr) {
          setEditCampos({ ...editCampos, ap_id: null });
          return;
      }
      
      const ap = accessPoints.find(a => String(a.id) === idStr);
      if (ap) {
          const rb = radioBases.find(r => r.id === ap.radio_base_id);
          setEditCampos({
              ...editCampos,
              ap_id: ap.id,
              sitio_base: rb?.nombre || '',
              ciudad: rb?.ciudad || '',
              modelo_ap: ap.modelo || '',
              ip_gestion_ap: ap.ip_gestion || '',
              mac_ap: ap.mac || '',
              frecuencia: ap.frecuencia || '', 
              ancho_canal: ap.ancho_canal || '', 
              ssid: ap.ssid || '' 
          });
      }
  };

  const generarUrlMaps = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  const radioBasesFiltradas = radioBases.filter(rb => !mwCd || String(rb.ciudad).toUpperCase() === String(mwCd).toUpperCase());
  const rbIdsDeCiudad = radioBasesFiltradas.map(r => r.id);
  
  const apsFiltrados = accessPoints.filter(ap => {
      const cumpleCiudad = rbIdsDeCiudad.includes(ap.radio_base_id);
      const cumpleRb = mwRb === 'TODOS' || String(ap.radio_base_id) === String(mwRb);
      return cumpleCiudad && cumpleRb;
  });

  const enlacesFiltrados = enlaces.filter(e => {
      const cumpleCiudad = !mwCd || String(e.ciudad).toUpperCase() === String(mwCd).toUpperCase();
      let cumpleRb = true;
      if (mwRb !== 'TODOS') {
          const nombreRbFiltro = radioBases.find(r => String(r.id) === String(mwRb))?.nombre || '';
          cumpleRb = String(e.sitio_base).toUpperCase() === nombreRbFiltro.toUpperCase();
      }
      return cumpleCiudad && cumpleRb;
  });

  const apSeleccionado = accessPoints.find(a => String(a.id) === String(editCampos.ap_id));
  const frecuenciaMostrar = apSeleccionado?.frecuencia || editCampos.frecuencia || '';
  const ssidMostrar = apSeleccionado?.ssid || editCampos.ssid || '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070b19]">
      
      {/* 1. FILTROS MAESTROS SUPERIORES */}
      <div className="bg-[#090f24] border-b border-slate-800/60 px-6 py-3 flex flex-col lg:flex-row justify-between items-center gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="px-3 py-1 rounded-md text-indigo-400 border border-indigo-500/30 shadow-sm uppercase tracking-wider font-bold">ZONA RF</span>
          
          <select value={mwReg} onChange={(e) => { setMwReg(e.target.value); setMwCd(''); setMwRb('TODOS'); setItemDetalle(null); }} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
            <option value="">-- REGIÓN --</option>
            {Object.keys(estructuraGeografica).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          
          <span className="text-indigo-500/80 text-[10px]">➔</span>
          
          <select value={mwCd} onChange={(e) => { setMwCd(e.target.value); setMwRb('TODOS'); setItemDetalle(null); }} disabled={!mwReg} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 disabled:opacity-50 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
            <option value="">-- CIUDAD --</option>
            {mwReg && obtenerCiudadesOrdenadas(mwReg).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
          
          <span className="text-indigo-500/80 text-[10px]">➔</span>
          
          <select value={mwRb} onChange={(e) => { setMwRb(e.target.value); setItemDetalle(null); }} disabled={!mwCd} className="bg-[#0b132b] border border-slate-600 px-3 py-1.5 rounded-md text-blue-400 font-bold w-52 disabled:opacity-50 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
            <option value="TODOS">-- TODAS LAS RADIO BASES --</option>
            {radioBasesFiltradas.map(rb => (
              <option key={rb.id} value={rb.id}>{rb.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. MENÚ DE SUB-PESTAÑAS INTERNAS */}
      <div className="bg-[#0b132b]/60 border-b border-slate-800/80 p-4 flex gap-2 shrink-0">
          <button onClick={() => { setSubTab('enlaces'); setItemDetalle(null); setCreandoNuevo(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${subTab==='enlaces' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#050814] text-slate-400 border border-slate-800'}`}>
             <Link className="w-4 h-4"/> Enlaces (Clientes) [{enlacesFiltrados.length}]
          </button>
          <button onClick={() => { setSubTab('aps'); setItemDetalle(null); setCreandoNuevo(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${subTab==='aps' ? 'bg-purple-600 text-white shadow-lg' : 'bg-[#050814] text-slate-400 border border-slate-800'}`}>
             <Router className="w-4 h-4"/> Access Points [{apsFiltrados.length}]
          </button>
          <button onClick={() => { setSubTab('radiobases'); setItemDetalle(null); setCreandoNuevo(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${subTab==='radiobases' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-[#050814] text-slate-400 border border-slate-800'}`}>
             <MapPin className="w-4 h-4"/> Radio Bases [{radioBasesFiltradas.length}]
          </button>
      </div>

      {/* ÁREA DE TRABAJO PRINCIPAL: Se añade min-h-0 para que Flexbox no rompa el contenedor en pantallas pequeñas */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 p-6 overflow-hidden min-h-0">
        
        {/* TABLA CENTRAL: min-h-0 asegura que el overflow de la tabla funcione */}
        <div className="xl:flex-[2] flex-1 flex flex-col bg-[#0b132b]/30 border border-slate-800 rounded-xl overflow-hidden shadow-lg min-h-0">
          <div className="p-4 bg-[#0b132b]/80 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 w-full max-w-md relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3" />
              <input type="text" placeholder="Filtro de texto rápido..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="bg-[#050814] border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 w-full rounded pl-9 py-2" />
            </div>
            {puedeEditar && (
              <button disabled={!mwCd} onClick={prepararNuevo} className={`text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all ${subTab==='enlaces'?'bg-blue-600 hover:bg-blue-500':subTab==='aps'?'bg-purple-600 hover:bg-purple-500':'bg-emerald-600 hover:bg-emerald-500'}`}>
                <Plus className="w-4 h-4" /> Nuevo
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-xs text-slate-300 text-left whitespace-nowrap">
              <thead className="bg-[#0f172a] text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-md">
                {subTab === 'enlaces' && (
                  <tr><th className="p-3">Estatus</th><th className="p-3">Cliente / Servicio</th><th className="p-3">Sitio Base</th><th className="p-3">IP AP</th><th className="p-3">IP Cliente</th><th className="p-3">SSID</th></tr>
                )}
                {subTab === 'aps' && (
                  <tr><th className="p-3">Estatus</th><th className="p-3">Nombre AP</th><th className="p-3">Radio Base</th><th className="p-3">Frecuencia</th><th className="p-3">Ancho Canal</th><th className="p-3">IP Gestión</th><th className="p-3">SSID</th></tr>
                )}
                {subTab === 'radiobases' && (
                  <tr><th className="p-3">Nombre Radio Base</th><th className="p-3">Ciudad</th><th className="p-3">Coordenadas</th><th className="p-3">Altura Torre</th></tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-800/40">
                {cargando && <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-mono">Sincronizando espectro de red...</td></tr>}
                
                {!cargando && !mwCd && <tr><td colSpan="7" className="p-8 text-center text-indigo-400/70 italic">Por favor, selecciona una Región y Ciudad en la barra superior para desplegar la topología de microondas.</td></tr>}

                {!cargando && mwCd && subTab === 'enlaces' && enlacesFiltrados.map((e, i) => (
                  <tr key={i} onClick={() => seleccionarItem(e)} className={`group hover:bg-slate-800/60 cursor-pointer ${itemDetalle?.id === e.id ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''}`}>
                    <td className="p-3 font-black text-[10px]">{e.estatus === 'ACTIVO' ? <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">ACTIVO</span> : <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">{e.estatus}</span>}</td>
                    <td className="p-3 font-bold group-hover:text-blue-400">{e.cliente}</td>
                    <td className="p-3 text-emerald-400/80">{e.sitio_base}</td>
                    <td className="p-3 font-mono text-slate-500">{e.ip_gestion_ap}</td>
                    <td className="p-3 font-mono text-slate-400">{e.ip_gestion_st}</td>
                    <td className="p-3 font-mono text-purple-400/80">{e.ssid}</td>
                  </tr>
                ))}

                {!cargando && mwCd && subTab === 'aps' && apsFiltrados.map((ap, i) => {
                  const rbName = radioBases.find(r => r.id === ap.radio_base_id)?.nombre || 'Desconocida';
                  return (
                  <tr key={i} onClick={() => seleccionarItem(ap)} className={`group hover:bg-slate-800/60 cursor-pointer ${itemDetalle?.id === ap.id ? 'bg-purple-600/10 border-l-4 border-l-purple-500' : ''}`}>
                    <td className="p-3 font-black text-[10px]">{ap.estatus === 'ACTIVO' ? <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">ACTIVO</span> : <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">{ap.estatus}</span>}</td>
                    <td className="p-3 font-bold group-hover:text-purple-400">{ap.nombre_ap}</td>
                    <td className="p-3 text-emerald-400/80">{rbName}</td>
                    
                    <td className="p-3 font-mono text-amber-400 font-bold">{ap.frecuencia ? `${ap.frecuencia} MHz` : '-'}</td>
                    <td className="p-3 font-mono text-indigo-400">{ap.ancho_canal ? `${ap.ancho_canal} MHz` : '-'}</td>
                    
                    <td className="p-3 font-mono text-slate-400">{ap.ip_gestion}</td>
                    <td className="p-3 font-mono text-purple-400/80">{ap.ssid}</td>
                  </tr>
                )})}

                {!cargando && mwCd && subTab === 'radiobases' && radioBasesFiltradas.map((rb, i) => (
                  <tr key={i} onClick={() => seleccionarItem(rb)} className={`group hover:bg-slate-800/60 cursor-pointer ${itemDetalle?.id === rb.id ? 'bg-emerald-600/10 border-l-4 border-l-emerald-500' : ''}`}>
                    <td className="p-3 font-bold group-hover:text-emerald-400">{rb.nombre}</td>
                    <td className="p-3 text-slate-300">{rb.ciudad}</td>
                    <td className="p-3 font-mono text-[11px]">
                        {rb.coordenadas ? (
                            <a 
                                href={generarUrlMaps(rb.coordenadas)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 w-max"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MapPin className="w-3 h-3" /> {rb.coordenadas}
                            </a>
                        ) : (
                            <span className="text-amber-500/80">-</span>
                        )}
                    </td>
                    <td className="p-3 text-slate-400">{rb.altura_torre || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DETALLES LATERALES: Se agrega overflow-hidden y min-h-0 para el control absoluto */}
        <div className="w-full xl:w-1/3 bg-[#0b132b]/40 border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl overflow-hidden min-h-0">
          {(itemDetalle || creandoNuevo) ? (
            <div className="flex flex-col h-full overflow-hidden">
              <h3 className={`text-xs font-black tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2 shrink-0 ${subTab==='enlaces'?'text-blue-400':subTab==='aps'?'text-purple-400':'text-emerald-400'}`}>
                {creandoNuevo ? 'CREAR NUEVO REGISTRO' : 'DETALLE DE REGISTRO'}
              </h3>
              
              {/* ÁREA INTERNA DEL FORMULARIO: Es la única parte que ahora generará barra de scroll */}
              <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4 custom-scrollbar text-[11px] text-slate-300">
                
                {/* FORMULARIO DE RADIO BASES */}
                {subTab === 'radiobases' && (
                   <>
                     <div><label className="block text-slate-500 font-bold mb-1">NOMBRE RADIO BASE</label><input type="text" disabled={!puedeEditar} value={editCampos.nombre || ''} onChange={e=>setEditCampos({...editCampos, nombre: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                     <div><label className="block text-slate-500 font-bold mb-1">CIUDAD ASIGNADA</label><input type="text" disabled={true} value={editCampos.ciudad || ''} className="w-full bg-slate-900/50 p-2 rounded border border-slate-800 text-slate-400 cursor-not-allowed outline-none" /></div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-500 font-bold mb-1">COORDENADAS SITE</label>
                            <div className="flex bg-[#050814] border border-slate-700 rounded overflow-hidden focus-within:border-amber-500">
                                <input type="text" disabled={!puedeEditar} value={editCampos.coordenadas || ''} onChange={e=>setEditCampos({...editCampos, coordenadas: e.target.value})} className="w-full bg-transparent p-2 text-amber-400 font-mono outline-none" placeholder="Lat, Lng" />
                                {editCampos.coordenadas && (
                                   <a href={generarUrlMaps(editCampos.coordenadas)} target="_blank" rel="noreferrer" className="px-3 bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center border-l border-slate-700 transition-colors"><MapPin className="w-4 h-4" /></a>
                                )}
                            </div>
                        </div>
                        <div><label className="block text-slate-500 font-bold mb-1">ALTURA TORRE</label><input type="text" disabled={!puedeEditar} value={editCampos.altura_torre || ''} onChange={e=>setEditCampos({...editCampos, altura_torre: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="Ej: 30 Metros" /></div>
                     </div>
                     <div><label className="block text-slate-500 font-bold mb-1">COMENTARIOS</label><textarea rows="3" disabled={!puedeEditar} value={editCampos.comentarios || ''} onChange={e=>setEditCampos({...editCampos, comentarios: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white resize-none outline-none" /></div>
                   </>
                )}

                {/* FORMULARIO DE ACCESS POINTS */}
                {subTab === 'aps' && (
                   <>
                     <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-slate-500 font-bold mb-1">RADIO BASE PADRE</label>
                           <select disabled={!puedeEditar} value={editCampos.radio_base_id || ''} onChange={e=>setEditCampos({...editCampos, radio_base_id: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-emerald-400 font-bold outline-none cursor-pointer">
                              <option value="">-- Seleccionar --</option>
                              {radioBasesFiltradas.map(rb => <option key={rb.id} value={rb.id}>{rb.nombre}</option>)}
                           </select>
                        </div>
                        <div><label className="block text-slate-500 font-bold mb-1">ESTATUS</label>
                           <select disabled={!puedeEditar} value={editCampos.estatus || ''} onChange={e=>setEditCampos({...editCampos, estatus: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none cursor-pointer">
                              <option value="ACTIVO">ACTIVO</option>
                              <option value="SUSPENDIDO">SUSPENDIDO</option>
                              <option value="FALLA">FALLA / CAÍDO</option>
                           </select>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-slate-500 font-bold mb-1">NOMBRE DEL AP</label><input type="text" disabled={!puedeEditar} value={editCampos.nombre_ap || ''} onChange={e=>setEditCampos({...editCampos, nombre_ap: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                        <div><label className="block text-slate-500 font-bold mb-1">MODELO EMISOR</label><input type="text" disabled={!puedeEditar} value={editCampos.modelo || ''} onChange={e=>setEditCampos({...editCampos, modelo: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                     </div>
                     <div className="p-3 border border-slate-700/50 rounded-lg bg-slate-800/10 space-y-3">
                        <h4 className="font-bold text-purple-400 uppercase flex items-center gap-1 border-b border-slate-800 pb-1">Configuración Lógica y RF AP</h4>
                        <div className="grid grid-cols-2 gap-3">
                           <div><label className="block text-slate-500 font-bold mb-1">IP GESTIÓN</label><input type="text" disabled={!puedeEditar} value={editCampos.ip_gestion || ''} onChange={e=>setEditCampos({...editCampos, ip_gestion: e.target.value})} className="w-full bg-[#050814] font-mono text-emerald-400 p-2 rounded border border-slate-700 outline-none" /></div>
                           <div><label className="block text-slate-500 font-bold mb-1">MAC ADDRESS</label><input type="text" disabled={!puedeEditar} value={editCampos.mac || ''} onChange={e=>setEditCampos({...editCampos, mac: e.target.value})} className="w-full bg-[#050814] font-mono p-2 rounded border border-slate-700 text-white outline-none" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                           <div><label className="block text-slate-500 font-bold mb-1">SSID</label><input type="text" disabled={!puedeEditar} value={editCampos.ssid || ''} onChange={e=>setEditCampos({...editCampos, ssid: e.target.value})} className="w-full bg-[#050814] font-mono p-2 rounded border border-slate-700 text-white outline-none" /></div>
                           <div><label className="block text-slate-500 font-bold mb-1">FRECUENCIA (MHz)</label><input type="text" disabled={!puedeEditar} value={editCampos.frecuencia || ''} onChange={e=>setEditCampos({...editCampos, frecuencia: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="Ej: 5820"/></div>
                           <div><label className="block text-slate-500 font-bold mb-1">ANCHO CANAL</label><input type="text" disabled={!puedeEditar} value={editCampos.ancho_canal || ''} onChange={e=>setEditCampos({...editCampos, ancho_canal: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="20/40/80"/></div>
                        </div>
                     </div>
                   </>
                )}

                {/* FORMULARIO ENLACES (CLIENTES) */}
                {subTab === 'enlaces' && (
                   <>
                     <div className="grid grid-cols-2 gap-3 mb-2">
                        <div><label className="block text-slate-500 font-bold mb-1">CLIENTE / SERVICIO</label><input type="text" disabled={!puedeEditar} value={editCampos.cliente || ''} onChange={e=>setEditCampos({...editCampos, cliente: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none focus:border-blue-500" /></div>
                        <div><label className="block text-slate-500 font-bold mb-1">ESTATUS</label>
                           <select disabled={!puedeEditar} value={editCampos.estatus || ''} onChange={e=>setEditCampos({...editCampos, estatus: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none cursor-pointer">
                              <option value="ACTIVO">ACTIVO</option>
                              <option value="SUSPENDIDO">SUSPENDIDO</option>
                              <option value="FALLA">FALLA / CAÍDO</option>
                           </select>
                        </div>
                     </div>

                     <div className="p-3 border border-blue-500/30 rounded-lg bg-blue-900/10 space-y-3">
                        <h4 className="font-bold text-blue-400 uppercase flex items-center gap-1 border-b border-blue-900 pb-1"><Link className="w-3 h-3"/> Vinculación a Torre</h4>
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="block text-blue-300/70 font-bold mb-1">1. FILTRAR POR RADIO BASE</label>
                              <select disabled={!puedeEditar} value={formRbId} onChange={e=>setFormRbId(e.target.value)} className="w-full bg-[#050814] p-2 rounded border border-blue-900 text-emerald-400 font-bold outline-none cursor-pointer">
                                 <option value="">-- Seleccionar Base --</option>
                                 {radioBasesFiltradas.map(rb => <option key={rb.id} value={rb.id}>{rb.nombre}</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="block text-blue-300/70 font-bold mb-1">2. SELECCIONAR ACCESS POINT</label>
                              <select disabled={!puedeEditar || (!formRbId && !editCampos.ap_id)} value={editCampos.ap_id || ''} onChange={e=>manejarCambioAP(e.target.value)} className="w-full bg-[#050814] p-2 rounded border border-blue-900 text-purple-400 font-bold outline-none cursor-pointer">
                                 <option value="">-- Seleccionar AP --</option>
                                 {accessPoints.filter(ap => !formRbId || String(ap.radio_base_id) === String(formRbId)).map(ap => <option key={ap.id} value={ap.id}>{ap.nombre_ap} ({ap.ssid})</option>)}
                              </select>
                           </div>
                        </div>
                     </div>

                     <div className="p-3 border border-slate-700/50 rounded-lg bg-slate-800/10 space-y-3">
                        <h4 className="font-bold text-emerald-400 uppercase border-b border-slate-800 pb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Ubicación de Entrega</h4>
                        <div>
                           <label className="block text-slate-500 font-bold mb-1">DIRECCIÓN DEL CLIENTE</label>
                           <input type="text" disabled={!puedeEditar} value={editCampos.direccion || ''} onChange={e=>setEditCampos({...editCampos, direccion: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none focus:border-blue-500" placeholder="Calle, Número, Colonia" />
                        </div>
                        <div>
                           <label className="block text-slate-500 font-bold mb-1">COORDENADAS CPE</label>
                           <div className="flex bg-[#050814] border border-slate-700 rounded overflow-hidden focus-within:border-amber-500">
                              <input type="text" disabled={!puedeEditar} value={editCampos.coordenadas || ''} onChange={e=>setEditCampos({...editCampos, coordenadas: e.target.value})} className="w-full bg-transparent p-2 text-amber-400 font-mono outline-none" placeholder="Latitud, Longitud" />
                              {editCampos.coordenadas && (
                                 <a href={generarUrlMaps(editCampos.coordenadas)} target="_blank" rel="noreferrer" className="px-3 bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center border-l border-slate-700 transition-colors"><MapPin className="w-4 h-4" /></a>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="p-3 border border-slate-700/50 rounded-lg bg-slate-800/10 space-y-3">
                        <h4 className="font-bold text-amber-500 uppercase border-b border-slate-800 pb-1">Radiofrecuencia e Interfaz (CPE)</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                                <label className="block text-slate-500 font-bold mb-1">FRECUENCIA ACTUAL (TORRE)</label>
                                <input type="text" disabled={true} value={frecuenciaMostrar} className="w-full bg-slate-900/50 font-mono text-slate-400 p-2 rounded border border-slate-800 outline-none cursor-not-allowed" placeholder="Frecuencia AP maestro" />
                           </div>
                           <div>
                                <label className="block text-slate-500 font-bold mb-1">SSID VINCULADO</label>
                                <input type="text" disabled={true} value={ssidMostrar} className="w-full bg-slate-900/50 font-mono text-slate-400 p-2 rounded border border-slate-800 outline-none cursor-not-allowed" placeholder="SSID AP maestro" />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div><label className="block text-slate-500 font-bold mb-1">MODELO CPE CLIENTE</label><input type="text" disabled={!puedeEditar} value={editCampos.modelo_st || ''} onChange={e=>setEditCampos({...editCampos, modelo_st: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="Ej: LiteBeam 5AC Gen2" /></div>
                           <div><label className="block text-slate-500 font-bold mb-1">IP GESTIÓN CLIENTE</label><input type="text" disabled={!puedeEditar} value={editCampos.ip_gestion_st || ''} onChange={e=>setEditCampos({...editCampos, ip_gestion_st: e.target.value})} className="w-full bg-[#050814] font-mono text-emerald-400 p-2 rounded border border-slate-700 outline-none" placeholder="Ej: 10.x.x.x" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div><label className="block text-slate-500 font-bold mb-1">MAC ADDRESS CPE</label><input type="text" disabled={!puedeEditar} value={editCampos.mac_st || ''} onChange={e=>setEditCampos({...editCampos, mac_st: e.target.value})} className="w-full bg-[#050814] font-mono p-2 rounded border border-slate-700 text-slate-400 outline-none" /></div>
                           <div><label className="block text-slate-500 font-bold mb-1">DISTANCIA (km)</label><input type="text" disabled={!puedeEditar} value={editCampos.distancia_km || ''} onChange={e=>setEditCampos({...editCampos, distancia_km: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div><label className="block text-slate-500 font-bold mb-1">SEÑAL RX AP (dBm)</label><input type="text" disabled={!puedeEditar} value={editCampos.senal_rx_ap || ''} onChange={e=>setEditCampos({...editCampos, senal_rx_ap: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="-55" /></div>
                           <div><label className="block text-slate-500 font-bold mb-1">SEÑAL RX ST (dBm)</label><input type="text" disabled={!puedeEditar} value={editCampos.senal_rx_st || ''} onChange={e=>setEditCampos({...editCampos, senal_rx_st: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white outline-none" placeholder="-56" /></div>
                        </div>
                     </div>
                     <div><label className="block text-slate-500 font-bold mb-1">COMENTARIOS</label><textarea rows="2" disabled={!puedeEditar} value={editCampos.comentarios || ''} onChange={e=>setEditCampos({...editCampos, comentarios: e.target.value})} className="w-full bg-[#050814] p-2 rounded border border-slate-700 text-white resize-none outline-none" /></div>
                   </>
                )}
              </div>

              {/* ACCIONES DEL FORMULARIO: Siempre fijas al fondo del sidebar */}
              {puedeEditar && (
                <div className="flex gap-2 mt-4 shrink-0 border-t border-slate-800 pt-3">
                  <button onClick={guardarItem} className="flex-1 bg-[#00a86b] hover:bg-[#008f5d] text-white text-[11px] font-black py-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors shadow-lg">
                    <Save className="w-4 h-4" /> GUARDAR REGISTRO
                  </button>
                  {!creandoNuevo && (
                    <button onClick={eliminarItem} className="p-3 bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg cursor-pointer border border-red-800 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-4 text-slate-600">
              <Radio className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Selecciona un registro del listado o crea uno nuevo para visualizar y editar sus propiedades.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}