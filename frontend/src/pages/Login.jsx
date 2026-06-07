import { useState } from 'react';
import { ShieldCheck, Lock, Key } from 'lucide-react';

export default function Login({ setToken, setUsuario, setTabActiva }) {
  // ESTADOS DEL LOGIN NORMAL
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(null);

  // NUEVOS ESTADOS PARA CAMBIO DE CONTRASEÑA OBLIGATORIO
  const [reqChangePwd, setReqChangePwd] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [tempUser, setTempUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); 
    setLoginError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username: usernameInput, password: passwordInput }) 
      });
      const data = await res.json(); 
      if (!res.ok) throw new Error(data.detail || 'Error al iniciar sesión');
      
      // INTERCEPTAR SI DEBE CAMBIAR LA CONTRASEÑA
      if (data.user.must_change_password) {
         setTempToken(data.token);
         setTempUser(data.user);
         setReqChangePwd(true); // Cambiamos la vista
      } else {
         // Inicio de sesión normal
         setToken(data.token);
         setUsuario(data.user);
         const firstTab = data.user.pestanas === '*' ? 'inventario' : data.user.pestanas.split(',')[0];
         if(setTabActiva) setTabActiva(firstTab);
      }
    } catch (err) { setLoginError(err.message); }
  };

  const handleChangePasswordSubmit = async (e) => {
      e.preventDefault();
      setLoginError(null);
      
      if (newPassword !== confirmPassword) {
          setLoginError("Las contraseñas no coinciden.");
          return;
      }
      if (newPassword.length < 6) {
          setLoginError("La nueva contraseña debe tener al menos 6 caracteres.");
          return;
      }

      try {
          const res = await fetch(`${API_URL}/api/auth/change-password`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tempToken}` // Usamos el token temporal
              },
              body: JSON.stringify({ new_password: newPassword })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Error al actualizar contraseña');

          // SI ES EXITOSO, LO DEJAMOS ENTRAR OFICIALMENTE
          setToken(tempToken);
          setUsuario({...tempUser, must_change_password: false});
          const firstTab = tempUser.pestanas === '*' ? 'inventario' : tempUser.pestanas.split(',')[0];
          if(setTabActiva) setTabActiva(firstTab);

      } catch (err) {
          setLoginError(err.message);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b19] p-4 relative overflow-hidden">
        {/* DECO BACKGROUND */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#0b132b]/80 border border-slate-800/80 p-8 rounded-2xl shadow-2xl backdrop-blur-sm z-10">
            <div className="flex flex-col items-center justify-center mb-8 space-y-3">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <ShieldCheck className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase">MT-APP CORE</h1>
                    <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">
                        {reqChangePwd ? 'ACTUALIZACIÓN DE SEGURIDAD' : 'ACCESO RESTRINGIDO'}
                    </p>
                </div>
            </div>

            {loginError && (
                <div className="mb-6 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-xs font-bold text-center uppercase tracking-widest shadow-inner">
                    {loginError}
                </div>
            )}

            {!reqChangePwd ? (
                // FORMULARIO DE LOGIN NORMAL
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 tracking-widest">Identidad</label>
                        <input 
                            type="text" 
                            required
                            value={usernameInput} 
                            onChange={e => setUsernameInput(e.target.value)} 
                            className="w-full bg-[#050814] border border-slate-700 text-sm text-white p-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors shadow-inner placeholder:text-slate-700 font-mono" 
                            placeholder="Usuario ID"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 tracking-widest">Credencial Cifrada</label>
                        <input 
                            type="password" 
                            required
                            value={passwordInput} 
                            onChange={e => setPasswordInput(e.target.value)} 
                            className="w-full bg-[#050814] border border-slate-700 text-sm text-white p-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors shadow-inner placeholder:text-slate-700 font-mono" 
                            placeholder="••••••••"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)] mt-2"
                    >
                        Iniciar Conexión
                    </button>
                </form>
            ) : (
                // FORMULARIO DE CAMBIO DE CONTRASEÑA OBLIGATORIO
                <form onSubmit={handleChangePasswordSubmit} className="space-y-5">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg mb-4 text-center">
                        <p className="text-amber-400 text-[11px] font-bold">
                            Por políticas de seguridad, debes actualizar la contraseña proporcionada por el sistema antes de continuar.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 tracking-widest flex items-center gap-1"><Lock className="w-3 h-3"/> Nueva Contraseña</label>
                        <input 
                            type="password" 
                            required
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            className="w-full bg-[#050814] border border-slate-700 text-sm text-white p-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors shadow-inner placeholder:text-slate-700 font-mono" 
                            placeholder="Nueva clave"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 tracking-widest flex items-center gap-1"><Key className="w-3 h-3"/> Confirmar Contraseña</label>
                        <input 
                            type="password" 
                            required
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                            className="w-full bg-[#050814] border border-slate-700 text-sm text-white p-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors shadow-inner placeholder:text-slate-700 font-mono" 
                            placeholder="Repita la clave"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-2"
                    >
                        Actualizar y Entrar
                    </button>
                </form>
            )}
        </div>
    </div>
  );
}