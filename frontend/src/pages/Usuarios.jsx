import { useState, useEffect } from 'react';
import { Users, Search, Edit, Trash2 } from 'lucide-react';

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
  const [msgUser, setMsgUser] = useState('');

  // ESTADOS MÚLTIPLES
  const [newPermisos, setNewPermisos] = useState(['LECTURA']);
  const [newPestanas, setNewPestanas] = useState(['*']);

  const API_URL = import.meta.env.VITE_API_URL || 'https://mt-backend-2ox8.onrender.com';

  const cargarUsuariosDB = async () => {
    if (!token || !esAdmin) return;
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { setListaUsuarios(await res.json()); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarUsuariosDB(); }, [token, esAdmin]);

  const cancelarEdicionUser = () => { 
    setIdUserEditando(null); setNewUsername(''); setNewPassword(''); setNewNombreCompleto(''); 
    setNewPlazas(['*']); setNewNumEmpleado(''); setNewCorreo(''); setNewArea(''); 
    setNewRegionUsuario(''); setNewPuesto(''); setMsgUser(''); 
    setNewPermisos(['LECTURA']); setNewPestanas(['*']);
  };

  const handleProcesarUsuario = async (e) => {
    e.preventDefault(); setMsgUser('');
    const url = idUserEditando ? `${API_URL}/api/users/${idUserEditando}` : `${API_URL}/api/auth/register`;
    const plazasString = newPlazas.length === 0 ? "" : newPlazas.includes('*') ? '*' : newPlazas.join(',');
    const roleString = newPermisos.join(',');
    const pestanasString = newPestanas.includes('*') ? '*' : newPestanas.join(',');

    try {
      const res = await fetch(url, { 
        method: idUserEditando ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify({ 
          username: newUsername, password: newPassword, role: roleString, plazas: plazasString, pestanas: pestanasString,
          nombre_completo: newNombreCompleto, num_empleado: newNumEmpleado, correo: newCorreo, 
          area_org: newArea, region_asignacion: newRegionUsuario, puesto: newPuesto 
        }) 
      });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) { setMsgUser('Operación exitosa.'); cancelarEdicionUser(); await cargarUsuariosDB(); } else { setMsgUser('Error al procesar.'); }
    } catch { setMsgUser('Fallo en servidor.'); }
  };

  const handleEliminarUsuario = async (id, name) => {
    if (!window.confirm(`¿Retirar accesos a '${name}'?`)) return;
    const res = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.status === 401) { handleLogout(); return; }
    if (res.ok) await cargarUsuariosDB();
  };

  const handleActivarModoEdicionUser = (u) => { 
    setIdUserEditando(u.id); setNewUsername(u.username || ''); setNewPassword(''); setNewNombreCompleto(u.nombre_completo || ''); 
    setNewPlazas(u.plazas ? u.plazas.split(',') : []); setNewNumEmpleado(u.num_empleado || ''); setNewCorreo(u.correo || ''); 
    setNewArea(u.area_org || ''); setNewRegionUsuario(u.region_asignacion || ''); setNewPuesto(u.puesto || ''); 
    
    const rolDB = String(u.role || '').toUpperCase();
    if (rolDB === 'ADMIN') setNewPermisos(['LECTURA', 'ESCRITURA', 'CARGA', 'ADMIN']);
    else if (rolDB === 'MCM INGENIERIA') setNewPermisos(['LECTURA', 'ESCRITURA', 'CARGA']);
    else if (rolDB === 'MCM NOC') setNewPermisos(['LECTURA', 'ESCRITURA']);
    else if (rolDB === 'RNOC') setNewPermisos(['LECTURA']);
    else setNewPermisos(rolDB.split(',').map(p => p.trim()).filter(Boolean));

    setNewPestanas(u.pestanas ? u.pestanas.split(',') : ['*']);
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
  const obtenerCiudadesOrdenadas = (region) => { if (!region || !estructuraGeografica[region]?.ciudades) return []; return Object.keys(estructuraGeografica[region].ciudades).map(nombre => ({ id: estructuraGeografica[region].ciudades[nombre].id, nombre: nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)); };
  const usuariosFiltrados = listaUsuarios.filter(u => (u.username || '').toLowerCase().includes(filtroUserTexto.toLowerCase()) || (u.num_empleado || '').includes(filtroUserTexto) || (u.nombre_completo || '').toLowerCase().includes(filtroUserTexto.toLowerCase()));

  const renderTagsRol = (roleString) => {
    if (!roleString) return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">LECTURA</span>;
    const roles = roleString.toUpperCase().split(',').map(r => r.trim());
    return roles.map(r => {
        let colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        if (r === 'ADMIN') colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        else if (r === 'ESCRITURA' || r === 'MCM NOC') colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        else if (r === 'CARGA' || r === 'MCM INGENIERIA') colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        let texto = r; if (r === 'MCM NOC') texto = 'ESCRITURA'; if (r === 'MCM INGENIERIA') texto = 'CARGA EXCEL';
        return <span key={r} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${colorClass}`}>{texto}</span>;
    });
  };

  return (
    <main className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
      <div className="border-b border-slate-800 pb-2"><h2 className="text-base font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-purple-400" /> Control de Accesos Console</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-[#0b132b]/50 border border-slate-800 rounded-xl p-5 space-y-4 h-fit">
          <form onSubmit={handleProcesarUsuario} className="space-y-3" autoComplete="off">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-slate-800 pb-2">{idUserEditando ? '✏️ Editar Operador' : '➕ Nuevo Operador'}</h3>
            {msgUser && <div className="text-xs p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-center">{msgUser}</div>}
            
            <div><label className="text-[10px] text-slate-500 block mb-1">Nombre Completo *</label><input type="text" value={newNombreCompleto} onChange={e => setNewNombreCompleto(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-slate-500 block mb-1">Username *</label><input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required autoComplete="off" className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div><div><label className="text-[10px] text-slate-500 block mb-1">Contraseña {idUserEditando ? '' : '*'}</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required={!idUserEditando} placeholder={idUserEditando ? "Opcional" : "Obligatorio"} autoComplete="new-password" className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-slate-500 block mb-1">No. Empleado *</label><input type="text" value={newNumEmpleado} onChange={e => setNewNumEmpleado(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div><div><label className="text-[10px] text-slate-500 block mb-1">Correo Electrónico *</label><input type="email" value={newCorreo} onChange={e => setNewCorreo(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div></div>
            
            <div className="pt-2">
              <label className="text-[10px] text-slate-500 block mb-1">Permisos sobre Datos *</label>
              <div className="bg-[#1c2541] border border-slate-700 rounded p-2 grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-not-allowed"><input type="checkbox" checked={true} disabled className="accent-slate-500" /> Lectura (Base)</label>
                <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer hover:text-blue-400"><input type="checkbox" checked={newPermisos.includes('ESCRITURA')} onChange={(e) => manejarTogglePermiso('ESCRITURA', e.target.checked)} className="accent-blue-500" /> Editar Manual</label>
                <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer hover:text-emerald-400"><input type="checkbox" checked={newPermisos.includes('CARGA')} onChange={(e) => manejarTogglePermiso('CARGA', e.target.checked)} className="accent-emerald-500" /> Subir Excel</label>
                <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer hover:text-purple-400"><input type="checkbox" checked={newPermisos.includes('ADMIN')} onChange={(e) => manejarTogglePermiso('ADMIN', e.target.checked)} className="accent-purple-500" /> Admin Total</label>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] text-slate-500 block mb-1">Pestañas Visibles *</label>
              <div className="bg-[#1c2541] border border-slate-700 rounded p-2 grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer hover:text-amber-400 col-span-2 border-b border-slate-700 pb-1 mb-1"><input type="checkbox" checked={newPestanas.includes('*')} onChange={(e) => manejarTogglePestana('*', e.target.checked)} className="accent-amber-500" /> <span className="font-bold text-amber-400">TODAS LAS PESTAÑAS</span></label>
                <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white ${newPestanas.includes('*') ? 'text-slate-500 opacity-50' : 'text-slate-200'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('inventario')} onChange={(e) => manejarTogglePestana('inventario', e.target.checked)} className="accent-slate-400" /> S. Dedicados</label>
                <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white ${newPestanas.includes('*') ? 'text-slate-500 opacity-50' : 'text-slate-200'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('resumen')} onChange={(e) => manejarTogglePestana('resumen', e.target.checked)} className="accent-slate-400" /> Disp. Puertos</label>
                <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white ${newPestanas.includes('*') ? 'text-slate-500 opacity-50' : 'text-slate-200'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('cabezales')} onChange={(e) => manejarTogglePestana('cabezales', e.target.checked)} className="accent-slate-400" /> Cabezales</label>
                <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white ${newPestanas.includes('*') ? 'text-slate-500 opacity-50' : 'text-slate-200'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('geografia')} onChange={(e) => manejarTogglePestana('geografia', e.target.checked)} className="accent-slate-400" /> Config. Red</label>
                <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white ${newPestanas.includes('*') ? 'text-slate-500 opacity-50' : 'text-slate-200'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('carga_excel')} onChange={(e) => manejarTogglePestana('carga_excel', e.target.checked)} className="accent-slate-400" /> Carga Masiva</label>
                <label className={`flex items-center gap-2 text-[11px] cursor-pointer hover:text-white ${newPestanas.includes('*') ? 'text-slate-500 opacity-50' : 'text-slate-200'}`}><input type="checkbox" disabled={newPestanas.includes('*')} checked={newPestanas.includes('*') || newPestanas.includes('usuarios')} onChange={(e) => manejarTogglePestana('usuarios', e.target.checked)} className="accent-slate-400" /> Usuarios</label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2"><div><label className="text-[10px] text-slate-500 block mb-1">Área Org. *</label><input type="text" value={newArea} onChange={e => setNewArea(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div><div><label className="text-[10px] text-slate-500 block mb-1">Puesto *</label><input type="text" value={newPuesto} onChange={e => setNewPuesto(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div></div>
            <div><label className="text-[10px] text-slate-500 block mb-1">Región Asignada (RRHH) *</label><input type="text" value={newRegionUsuario} onChange={e => setNewRegionUsuario(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-xs p-2 rounded text-white focus:outline-none focus:border-blue-500" /></div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Visibilidad de Ciudades *</label>
              <div className={`bg-[#1c2541] border ${newPlazas.length === 0 ? 'border-red-500' : 'border-slate-700'} rounded p-2 max-h-40 overflow-y-auto space-y-2`}>
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors"><input type="checkbox" checked={newPlazas.includes('*')} onChange={(e) => { if(e.target.checked) setNewPlazas(['*']); else setNewPlazas([]); }} className="accent-amber-500" /><span className="font-bold text-amber-400">ACCESO GLOBAL (*)</span></label>
                <div className="border-t border-slate-700 my-1"></div>
                {Object.keys(estructuraGeografica).map(r => (<div key={r} className="ml-1 space-y-1"><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{r}</span><div className="ml-2 flex flex-col gap-0.5">{obtenerCiudadesOrdenadas(r).map(c => { const cityId = String(c.id); return (<label key={cityId} className={`flex items-center gap-2 text-[11px] cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors ${newPlazas.includes('*') ? 'text-slate-500 opacity-50' : 'text-slate-300'}`}><input type="checkbox" checked={newPlazas.includes(cityId) && !newPlazas.includes('*')} disabled={newPlazas.includes('*')} onChange={(e) => { if(e.target.checked) { setNewPlazas(prev => [...prev.filter(p => p !== '*'), cityId]); } else { setNewPlazas(prev => prev.filter(p => p !== cityId)); } }} className="accent-blue-500" />{c.nombre} <span className="text-[9px] text-slate-500 font-mono">({cityId})</span></label>); })}</div></div>))}
              </div>
            </div>
            {idUserEditando ? (<div className="flex gap-2 mt-2"><button type="submit" disabled={newPlazas.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors disabled:opacity-50">Actualizar</button><button type="button" onClick={cancelarEdicionUser} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors">Cancelar</button></div>) : (<button type="submit" disabled={newPlazas.length === 0} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 rounded font-semibold cursor-pointer transition-colors mt-2 disabled:opacity-50">Registrar Nuevo Usuario</button>)}
          </form>
        </div>
        <div className="md:col-span-3 bg-[#0b132b]/30 border border-slate-800 rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl"><div className="flex items-center gap-3 w-full"><Search className="w-4 h-4 text-slate-500" /><input type="text" placeholder="Filtrar por usuario o número de empleado..." value={filtroUserTexto} onChange={e => setFiltroUserTexto(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none w-full" /></div></div>
          <div className="overflow-x-auto"><div className="inline-block min-w-full overflow-hidden align-middle"><div className="overflow-y-auto max-h-[500px] border border-slate-800 rounded-lg custom-scrollbar"><table className="min-w-full text-xs text-left whitespace-nowrap"><thead className="bg-[#0b132b] text-slate-500 border-b border-slate-800 sticky top-0 z-10"><tr><th className="p-3 font-bold">Username</th><th className="p-3 font-bold">Permisos / Rol</th><th className="p-3 font-bold">No. Empleado</th><th className="p-3 font-bold">Área / Puesto</th><th className="p-3 font-bold">Visibilidad Ciudades</th><th className="p-3 font-bold text-right sticky right-0 bg-[#0b132b]">Acciones</th></tr></thead><tbody className="divide-y divide-slate-800/50">{usuariosFiltrados.map(u => { 
            const arrPestanas = u.pestanas ? u.pestanas.split(',') : ['*'];
            const labelsTabs = arrPestanas.includes('*') ? 'TODAS LAS PESTAÑAS' : arrPestanas.join(', ');

            return (
              <tr key={u.id} className="hover:bg-slate-900/30">
                <td className="p-3 font-medium text-slate-200"><div className="font-bold text-white">{u.nombre_completo || 'Sin nombre'}</div><div className="text-[10px] text-slate-400">@{u.username}</div>{u.correo && <div className="text-[9px] text-slate-500 mt-0.5">{u.correo}</div>}</td>
                
                <td className="p-3">
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {renderTagsRol(u.role)}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1.5 uppercase font-mono max-w-[150px] truncate" title={labelsTabs}>
                    Visibles: {labelsTabs}
                  </div>
                </td>
                
                <td className="p-3 text-slate-400 font-mono">{u.num_empleado || '-'}</td>
                <td className="p-3 text-slate-300">{u.area_org || '-'}{u.puesto && <div className="text-[10px] text-slate-500 mt-0.5">{u.puesto}</div>}</td>
                <td className="p-3 text-[10px] text-slate-400"><div className="max-w-[150px] truncate" title={obtenerNombresPlazas(u.plazas)}>{obtenerNombresPlazas(u.plazas)}</div></td>
                <td className="p-3 text-right sticky right-0 bg-[#070b19] md:bg-transparent md:backdrop-blur-sm"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => handleActivarModoEdicionUser(u)} title="Editar Usuario" className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors cursor-pointer"><Edit className="w-5 h-5" /></button><button type="button" onClick={() => handleEliminarUsuario(u.id, u.username)} disabled={usuario?.username === u.username} title="Eliminar Usuario" className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors cursor-pointer disabled:opacity-20"><Trash2 className="w-5 h-5" /></button></div></td>
              </tr>
            )
          })} {usuariosFiltrados.length === 0 && (<tr><td colSpan="6" className="p-6 text-center text-slate-500 italic">No se encontraron usuarios.</td></tr>)}</tbody></table></div></div></div>
        </div>
      </div>
    </main>
  );
}