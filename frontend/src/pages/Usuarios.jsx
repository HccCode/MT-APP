import { useState, useEffect } from 'react';
import { Users, Search, Edit, Trash2, ShieldCheck, UserPlus, Key, Mail, MapPin, Briefcase, Lock, ChevronDown, ChevronUp } from 'lucide-react';

export default function Usuarios({ token, usuario, esAdmin, estructuraGeografica, handleLogout }) {
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [filtroUserTexto, setFiltroUserTexto] = useState('');
  
  const [idUserEditando, setIdUserEditando] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNombreCompleto, setNewNombreCompleto] = useState('');
  const [newNumEmpleado, setNewNumEmpleado] = useState('');
  const [newCorreo, setNewCorreo] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newRegionUsuario, setNewRegionUsuario] = useState('');
  const [newPuesto, setNewPuesto] = useState('');
  const [newPlazas, setNewPlazas] = useState(['*']);
  const [msgUser, setMsgUser] = useState({ text: '', type: '' });

  // ESTADOS MÚLTIPLES
  const [newPermisos, setNewPermisos] = useState(['LECTURA']);
  const [newPestanas, setNewPestanas] = useState(['*']);
  
  // ESTADOS PARA ACORDEONES DESPLEGABLES
  const [verPermisos, setVerPermisos] = useState(true);
  const [verPestanas, setVerPestanas] = useState(true);
  const [verGeografia, setVerGeografia] = useState(true);

  // ESTADO PARA EL BUSCADOR DE PLAZAS
  const [filtroPlazas, setFiltroPlazas] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const cargarUsuariosDB = async () => {
    if (!token || !esAdmin) return;
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers: { 'Authorization': `Bearer ${token}` },credentials: 'include' });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { setListaUsuarios(await res.json()); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarUsuariosDB(); }, [token, esAdmin]);

  const cancelarEdicionUser = () => { 
    setIdUserEditando(null); setNewUsername(''); setNewPassword(''); setNewNombreCompleto(''); 
    setNewPlazas(['*']); setNewNumEmpleado(''); setNewCorreo(''); setNewArea(''); 
    setNewRegionUsuario(''); setNewPuesto(''); setMsgUser({ text: '', type: '' }); 
    setNewPermisos(['LECTURA']); setNewPestanas(['*']); setFiltroPlazas('');
    
    // Restaurar acordeones al cancelar
    setVerPermisos(true);
    setVerPestanas(true);
    setVerGeografia(true);
  };

  const handleProcesarUsuario = async (e) => {
    e.preventDefault(); setMsgUser({ text: '', type: '' });
    const url = idUserEditando ? `${API_URL}/api/users/${idUserEditando}` : `${API_URL}/api/auth/register`;
    const plazasString = newPlazas.length === 0 ? "" : newPlazas.includes('*') ? '*' : newPlazas.join(',');
    const roleString = newPermisos.join(',');
    const pestanasString = newPestanas.includes('*') ? '*' : newPestanas.join(',');

    try {
      const res = await fetch(url, { 
        method: idUserEditando ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`,credentials: 'include' }, 
        body: JSON.stringify({ 
          username: newUsername, password: newPassword, role: roleString, plazas: plazasString, pestanas: pestanasString,
          nombre_completo: newNombreCompleto, num_empleado: newNumEmpleado, correo: newCorreo, 
          area_org: newArea, region_asignacion: newRegionUsuario, puesto: newPuesto 
        }) 
      });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { 
        setMsgUser({ text: 'Operación táctica exitosa.', type: 'success' }); 
        cancelarEdicionUser(); 
        await cargarUsuariosDB(); 
      } else { 
        setMsgUser({ text: 'Error de validación al procesar.', type: 'error' }); 
      }
    } catch { 
      setMsgUser({ text: 'Fallo de conexión con el servidor.', type: 'error' }); 
    }
  };

  const handleEliminarUsuario = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de revocar permanentemente los accesos a '${name}'?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },credentials: 'include' });
        if (res.status === 401) { handleLogout(); return; }
        if (res.ok) await cargarUsuariosDB();
    } catch (e) { console.error(e); }
  };

  const handleActivarModoEdicionUser = (u) => { 
    setIdUserEditando(u.id); setNewUsername(u.username || ''); setNewPassword(''); setNewNombreCompleto(u.nombre_completo || ''); 
    setNewPlazas(u.plazas ? u.plazas.split(',') : []); setNewNumEmpleado(u.num_empleado || ''); setNewCorreo(u.correo || ''); 
    setNewArea(u.area_org || ''); setNewRegionUsuario(u.region_asignacion || ''); setNewPuesto(u.puesto || ''); 
    setFiltroPlazas('');
    
    const rolDB = String(u.role || '').toUpperCase();
    if (rolDB === 'ADMIN') setNewPermisos(['LECTURA', 'ESCRITURA', 'CARGA', 'ADMIN']);
    else if (rolDB === 'MCM INGENIERIA') setNewPermisos(['LECTURA', 'ESCRITURA', 'CARGA']);
    else if (rolDB === 'MCM NOC') setNewPermisos(['LECTURA', 'ESCRITURA']);
    else if (rolDB === 'RNOC') setNewPermisos(['LECTURA', 'RNOC']);
    else setNewPermisos(rolDB.split(',').map(p => p.trim()).filter(Boolean));

    setNewPestanas(u.pestanas ? u.pestanas.split(',') : ['*']);
    
    // Al editar, asegurar que los acordeones estén abiertos para ver qué hay seleccionado
    setVerPermisos(true);
    setVerPestanas(true);
    setVerGeografia(true);
  };

  const manejarTogglePermiso = (permiso, activado) => {
    if (activado) setNewPermisos([...newPermisos, permiso]);
    else setNewPermisos(newPermisos.filter(p => p !== permiso));
  };

  const manejarTogglePestana = (tab, activado) => {
    if (tab === '*') {
      if (activado) setNewPestanas(['*']);
      else setNewPestanas([]);
    } else {
      let actuales = newPestanas.filter(p => p !== '*');
      if (activado) actuales.push(tab);
      else actuales = actuales.filter(p => p !== tab);
      setNewPestanas(actuales);
    }
  };

  const obtenerNombresPlazas = (plazasStr) => { if (!plazasStr || plazasStr === '*') return 'ACCESO GLOBAL'; return plazasStr.split(',').join(', '); };
  
  // BLINDAJE DE ESTRUCTURA GEOGRAFICA
  const obtenerCiudadesOrdenadas = (region) => { 
      const safeEstructura = estructuraGeografica || {};
      if (!region || !safeEstructura[region]?.ciudades) return []; 
      return Object.keys(safeEstructura[region].ciudades).map(nombre => ({ 
          id: safeEstructura[region].ciudades[nombre].id, 
          nombre: nombre 
      })).sort((a, b) => a.nombre.localeCompare(b.nombre)); 
  };

  const usuariosFiltrados = listaUsuarios.filter(u => (u.username || '').toLowerCase().includes(filtroUserTexto.toLowerCase()) || (u.num_empleado || '').includes(filtroUserTexto) || (u.nombre_completo || '').toLowerCase().includes(filtroUserTexto.toLowerCase()));

  const renderTagsRol = (roleString) => {
    if (!roleString) return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm">LECTURA</span>;
    const roles = roleString.toUpperCase().split(',').map(r => r.trim());
    return roles.map(r => {
        let colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        if (r === 'ADMIN') colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)]';
        else if (r === 'ESCRITURA' || r === 'MCM NOC') colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]';
        else if (r === 'CARGA' || r === 'MCM INGENIERIA') colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
        else if (r === 'RNOC') colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]';
        
        let texto = r; 
        if (r === 'MCM NOC') texto = 'ESCRITURA'; 
        if (r === 'MCM INGENIERIA') texto = 'CARGA EXCEL';
        
        return <span key={r} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${colorClass}`}>{texto}</span>;
    });
  };

  const safeEstructura = estructuraGeografica || {};

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar bg-[#070b19]">
      
      <div className="bg-[#090f24] border-b border-slate-800/60 pb-4 shrink-0">
        <h2 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-widest">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> 
            Consola de Seguridad y Accesos
        </h2>
        <p className="text-xs text-slate-500 mt-1">Administración centralizada de identidades, roles tácticos y privilegios geográficos.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* PANEL IZQUIERDO: FORMULARIO DE EDICIÓN */}
        <div className="xl:col-span-1 bg-[#0b132b]/50 border border-slate-800/80 rounded-xl p-5 space-y-4 h-fit shadow-xl relative overflow-hidden">
          {/* Deco bg */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

          <form onSubmit={handleProcesarUsuario} className="space-y-4 relative z-10" autoComplete="off">
            <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                {idUserEditando ? <><Edit className="w-4 h-4"/> Editando Identidad</> : <><UserPlus className="w-4 h-4"/> Nueva Identidad</>}
            </h3>
            
            {msgUser.text && (
                <div className={`text-[11px] font-bold p-2.5 rounded-lg border text-center uppercase tracking-wider shadow-inner ${msgUser.type === 'error' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50'}`}>
                    {msgUser.text}
                </div>
            )}
            
            <div className="space-y-3">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Nombre Completo *</label>
                    <div className="relative">
                        <input type="text" value={newNombreCompleto} onChange={e => setNewNombreCompleto(e.target.value)} required className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 pl-8 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner" />
                        <Users className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Username *</label>
                        <div className="relative">
                            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required autoComplete="off" className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 pl-8 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner" />
                            <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Clave {idUserEditando ? '(Opcional)' : '*'}</label>
                        <div className="relative">
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required={!idUserEditando} placeholder={idUserEditando ? "Dejar en blanco" : "Requerido"} autoComplete="new-password" className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 pl-8 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner placeholder:text-slate-600" />
                            <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">No. Empleado *</label>
                        <input type="text" value={newNumEmpleado} onChange={e => setNewNumEmpleado(e.target.value)} required className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Correo *</label>
                        <div className="relative">
                            <input type="email" value={newCorreo} onChange={e => setNewCorreo(e.target.value)} required className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 pl-7 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner" />
                            <Mail className="w-3 h-3 text-slate-500 absolute left-2.5 top-3.5" />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* SECCIÓN DESPLEGABLE: PERMISOS */}
            <div className="pt-2">
                <div className="border border-slate-700/50 rounded-lg bg-[#050814] overflow-hidden shadow-inner">
                    <button 
                        type="button" 
                        onClick={() => setVerPermisos(!verPermisos)}
                        className="w-full flex items-center justify-between p-2.5 bg-[#0a0f1d] hover:bg-slate-800/60 font-bold text-slate-400 uppercase border-b border-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-[10px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> PERMISOS DE BASE DE DATOS *
                        </div>
                        {verPermisos ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                    
                    {verPermisos && (
                        <div className="p-3 grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-not-allowed font-medium"><input type="checkbox" checked={true} disabled className="accent-slate-500" /> LECTURA (Base)</label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-blue-400 font-bold transition-colors"><input type="checkbox" checked={newPermisos.includes('ESCRITURA')} onChange={(e) => manejarTogglePermiso('ESCRITURA', e.target.checked)} className="accent-blue-500" /> ESCRITURA</label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-emerald-400 font-bold transition-colors"><input type="checkbox" checked={newPermisos.includes('CARGA')} onChange={(e) => manejarTogglePermiso('CARGA', e.target.checked)} className="accent-emerald-500" /> CARGA EXCEL</label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-purple-400 font-bold transition-colors"><input type="checkbox" checked={newPermisos.includes('ADMIN')} onChange={(e) => manejarTogglePermiso('ADMIN', e.target.checked)} className="accent-purple-500" /> ADMIN TOTAL</label>
                            <label className="flex items-center gap-2 text-[11px] cursor-pointer hover:text-amber-400 col-span-2 pt-2 mt-1 border-t border-slate-800/80 transition-colors">
                                <input type="checkbox" checked={newPermisos.includes('RNOC')} onChange={(e) => manejarTogglePermiso('RNOC', e.target.checked)} className="accent-amber-500" /> 
                                <span className="font-black tracking-widest text-amber-500 uppercase">Perfil RNOC (Solo Fallas)</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* SECCIÓN DESPLEGABLE: PESTAÑAS VISIBLES */}
            <div className="pt-2">
                <div className="border border-slate-700/50 rounded-lg bg-[#050814] overflow-hidden shadow-inner">
                    <button 
                        type="button" 
                        onClick={() => setVerPestanas(!verPestanas)}
                        className="w-full flex items-center justify-between p-2.5 bg-[#0a0f1d] hover:bg-slate-800/60 font-bold text-slate-400 uppercase border-b border-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-[10px]">
                            <Briefcase className="w-3.5 h-3.5 text-blue-400" /> PESTAÑAS VISIBLES *
                        </div>
                        {verPestanas ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                    
                    {verPestanas && (
                        <div className="p-3 grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer hover:text-amber-400 col-span-2 border-b border-slate-800/80 pb-2 mb-1 transition-colors">
                                <input type="checkbox" checked={newPestanas.includes('*')} onChange={(e) => manejarTogglePestana('*', e.target.checked)} className="accent-amber-500 w-3.5 h-3.5" /> 
                                <span className="font-black text-amber-500 tracking-widest">PERMITIR TODAS (*)</span>
                            </label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('inventario')} onChange={(e) => manejarTogglePestana('inventario', e.target.checked)} className="accent-slate-400" /> S. Dedicados</label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('resumen')} onChange={(e) => manejarTogglePestana('resumen', e.target.checked)} className="accent-slate-400" /> Disponibilidad</label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('cabezales')} onChange={(e) => manejarTogglePestana('cabezales', e.target.checked)} className="accent-slate-400" /> Cabezales</label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('microondas')} onChange={(e) => manejarTogglePestana('microondas', e.target.checked)} className="accent-slate-400" /> Microondas</label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('geografia')} onChange={(e) => manejarTogglePestana('geografia', e.target.checked)} className="accent-slate-400" /> Geografía</label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('carga_excel')} onChange={(e) => manejarTogglePestana('carga_excel', e.target.checked)} className="accent-slate-400" /> Aprovisionamiento</label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('usuarios')} onChange={(e) => manejarTogglePestana('usuarios', e.target.checked)} className="accent-slate-400" /> Usuarios</label>
                            <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-indigo-400 transition-colors font-medium ${newPestanas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}>
                                <input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('cuadrilla')} onChange={(e) => manejarTogglePestana('cuadrilla', e.target.checked)} className="accent-indigo-500" /> 
                                Modo Cuadrilla
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Área Org. *</label>
                    <input type="text" value={newArea} onChange={e => setNewArea(e.target.value)} required className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner" />
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Puesto *</label>
                    <input type="text" value={newPuesto} onChange={e => setNewPuesto(e.target.value)} required className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner" />
                </div>
            </div>
            
            <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Región Asignada (RRHH) *</label>
                <input type="text" value={newRegionUsuario} onChange={e => setNewRegionUsuario(e.target.value)} required className="w-full bg-[#050814] border border-slate-700/80 text-xs p-2.5 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner" />
            </div>
            
            {/* SECCIÓN DESPLEGABLE: GEOGRAFÍA */}
            <div className="pt-2">
                <div className="border border-slate-700/50 rounded-lg bg-[#050814] overflow-hidden shadow-inner">
                    <button 
                        type="button" 
                        onClick={() => setVerGeografia(!verGeografia)}
                        className="w-full flex items-center justify-between p-2.5 bg-[#0a0f1d] hover:bg-slate-800/60 font-bold text-slate-400 uppercase border-b border-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-[10px]">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" /> VISIBILIDAD GEOGRÁFICA *
                        </div>
                        {verGeografia ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                    
                    {verGeografia && (
                        <div className="p-3 flex flex-col space-y-3">
                            <div className="relative w-full">
                                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar ciudad o región..." 
                                    value={filtroPlazas} 
                                    onChange={e => setFiltroPlazas(e.target.value)} 
                                    className="w-full bg-[#070b19] border border-slate-700/80 text-[10px] py-1.5 pl-8 pr-2 rounded text-slate-300 focus:outline-none focus:border-purple-500 transition-colors shadow-inner" 
                                />
                            </div>
                            
                            <div className={`bg-[#070b19] border ${newPlazas.length === 0 ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-slate-700/80'} rounded-lg p-2 max-h-40 overflow-y-auto space-y-2 custom-scrollbar transition-all`}>
                                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer hover:bg-slate-800/80 p-1.5 rounded transition-colors">
                                    <input type="checkbox" checked={newPlazas.includes('*')} onChange={(e) => { if(e.target.checked) setNewPlazas(['*']); else setNewPlazas([]); }} className="accent-emerald-500 w-3.5 h-3.5" />
                                    <span className="font-black text-emerald-400 tracking-widest">ACCESO GLOBAL RED (*)</span>
                                </label>
                                <div className="border-t border-slate-800/80 my-1"></div>
                                
                                {Object.keys(safeEstructura).map(r => {
                                    const query = filtroPlazas.toLowerCase();
                                    const regionMatch = r.toLowerCase().includes(query);
                                    const ciudadesTodas = obtenerCiudadesOrdenadas(r);
                                    const ciudadesFiltradas = ciudadesTodas.filter(c => c.nombre.toLowerCase().includes(query) || String(c.id).toLowerCase().includes(query));
                                    
                                    if (query && !regionMatch && ciudadesFiltradas.length === 0) return null;
                                    const ciudadesRender = (query && !regionMatch) ? ciudadesFiltradas : ciudadesTodas;

                                    const idsRegion = ciudadesTodas.map(c => String(c.id));
                                    const todasSeleccionadas = idsRegion.length > 0 && idsRegion.every(id => newPlazas.includes(id));

                                    return (
                                        <div key={r} className="ml-1 space-y-1 mb-2">
                                            <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors ${newPlazas.includes('*') ? 'text-slate-600 opacity-50' : 'text-purple-400'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={newPlazas.includes('*') || todasSeleccionadas} 
                                                    disabled={newPlazas.includes('*')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewPlazas(prev => Array.from(new Set([...prev.filter(p => p !== '*'), ...idsRegion])));
                                                        } else {
                                                            setNewPlazas(prev => prev.filter(p => !idsRegion.includes(p)));
                                                        }
                                                    }} 
                                                    className="accent-purple-500 w-3.5 h-3.5" 
                                                />
                                                {r}
                                            </label>
                                            <div className="ml-2 flex flex-col gap-0.5 border-l border-slate-700/50 pl-2">
                                                {ciudadesRender.map(c => { 
                                                    const cityId = String(c.id); 
                                                    return (
                                                        <label key={cityId} className={`flex items-center gap-2 text-[11px] font-medium cursor-pointer hover:bg-slate-800/80 p-1 rounded transition-colors ${newPlazas.includes('*') ? 'text-slate-600 opacity-50' : 'text-slate-300'}`}>
                                                            <input type="checkbox" checked={newPlazas.includes(cityId) && !newPlazas.includes('*')} disabled={newPlazas.includes('*')} onChange={(e) => { if(e.target.checked) { setNewPlazas(prev => [...prev.filter(p => p !== '*'), cityId]); } else { setNewPlazas(prev => prev.filter(p => p !== cityId)); } }} className="accent-blue-500" />
                                                            {c.nombre}
                                                        </label>
                                                    ); 
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {idUserEditando ? (
                <div className="flex gap-3 mt-4 pt-2 border-t border-slate-800/80">
                    <button type="submit" disabled={newPlazas.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs py-2.5 rounded-lg font-black tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(168,85,247,0.2)]">Actualizar</button>
                    <button type="button" onClick={cancelarEdicionUser} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs py-2.5 rounded-lg font-black tracking-widest uppercase cursor-pointer transition-colors">Cancelar</button>
                </div>
            ) : (
                <button type="submit" disabled={newPlazas.length === 0} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-2.5 rounded-lg font-black tracking-widest uppercase cursor-pointer transition-colors mt-4 shadow-[0_0_15px_rgba(168,85,247,0.2)] disabled:opacity-50">Registrar Identidad</button>
            )}
          </form>
        </div>

        {/* PANEL DERECHO: MATRIZ DE USUARIOS */}
        <div className="xl:col-span-3 bg-[#0b132b]/30 border border-slate-800/80 rounded-xl p-5 flex flex-col space-y-4 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center bg-[#050814]/80 border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-inner shrink-0">
            <div className="flex items-center gap-3 w-full">
                <Search className="w-4 h-4 text-purple-500" />
                <input 
                    type="text" 
                    placeholder="Búsqueda táctica por usuario, nombre o empleado..." 
                    value={filtroUserTexto} 
                    onChange={e => setFiltroUserTexto(e.target.value)} 
                    className="bg-transparent text-sm text-white focus:outline-none w-full placeholder:text-slate-600" 
                />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto border border-slate-800/80 rounded-xl custom-scrollbar shadow-inner bg-[#050814]/40">
            <table className="min-w-full text-left text-xs text-slate-300 whitespace-nowrap">
                <thead className="bg-[#0b132b] text-slate-400 border-b border-slate-800/80 sticky top-0 z-10 uppercase tracking-widest font-black text-[10px]">
                    <tr>
                        <th className="p-4">Identidad</th>
                        <th className="p-4">Credenciales / Vistas</th>
                        <th className="p-4">Organización</th>
                        <th className="p-4">Geografía Asignada</th>
                        <th className="p-4 text-right sticky right-0 bg-[#0b132b] shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.3)]">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                    {usuariosFiltrados.map(u => { 
                        const arrPestanas = u.pestanas ? u.pestanas.split(',') : ['*'];
                        const labelsTabs = arrPestanas.includes('*') ? 'TODAS LAS VISTAS PERMITIDAS' : arrPestanas.join(', ');

                        return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-4 font-medium">
                                <div className="font-bold text-white text-sm">{u.nombre_completo || 'Sin nombre'}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-purple-400 font-mono font-bold">@{u.username}</span>
                                    <span className="text-slate-600 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">ID:{u.num_empleado || '-'}</span>
                                </div>
                                {u.correo && <div className="text-[9px] text-slate-500 mt-1">{u.correo}</div>}
                            </td>
                            
                            <td className="p-4">
                                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                    {renderTagsRol(u.role)}
                                </div>
                                <div className="text-[9px] text-slate-500 mt-2 uppercase font-mono max-w-[200px] truncate" title={labelsTabs}>
                                    <span className="font-bold text-slate-400">VISTAS:</span> {labelsTabs}
                                </div>
                            </td>
                            
                            <td className="p-4">
                                <div className="text-slate-300 font-bold">{u.area_org || 'No especificada'}</div>
                                {u.puesto && <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{u.puesto}</div>}
                            </td>
                            
                            <td className="p-4">
                                <div className="max-w-[200px] truncate text-[10px] text-slate-400 font-mono" title={obtenerNombresPlazas(u.plazas)}>
                                    {u.plazas === '*' ? (
                                        <span className="text-emerald-400 font-bold tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">GLOBAL (*)</span>
                                    ) : (
                                        obtenerNombresPlazas(u.plazas)
                                    )}
                                </div>
                            </td>
                            
                            <td className="p-4 text-right sticky right-0 bg-[#070b19] xl:bg-transparent xl:backdrop-blur-none shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.3)] xl:shadow-none">
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => handleActivarModoEdicionUser(u)} title="Modificar Identidad" className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => handleEliminarUsuario(u.id, u.username)} disabled={usuario?.username === u.username} title={usuario?.username === u.username ? "No puedes auto-eliminarte" : "Revocar Identidad"} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-20 disabled:hover:bg-red-500/10 disabled:hover:text-red-400 shadow-sm">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        )
                    })} 
                    {usuariosFiltrados.length === 0 && (
                        <tr><td colSpan="5" className="p-12 text-center text-slate-500 italic">No se encontraron identidades en MT_DB.</td></tr>
                    )}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}