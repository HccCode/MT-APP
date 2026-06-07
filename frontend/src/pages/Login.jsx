import { useState } from 'react';
import { Server } from 'lucide-react';

export default function Login({ setToken, setUsuario, setTabActiva }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL|| 'http://127.0.0.1:8000';

const handleLoginSubmit = async (e) => {
    e.preventDefault(); 
    setLoginError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        // ELIMINADA la línea de credentials: 'include'
        body: JSON.stringify({ username: usernameInput, password: passwordInput }) 
      });
      
      const data = await res.json(); 
      if (!res.ok) throw new Error(data.detail);
      
      // RESTAURADO: Guardamos el token real en localStorage
      localStorage.setItem('mcm_token', data.token); 
      localStorage.setItem('mcm_user', JSON.stringify(data.user));
      
      localStorage.removeItem('mcm_inv_reg');
      localStorage.removeItem('mcm_inv_cd');
      localStorage.removeItem('mcm_inv_hub');
      localStorage.removeItem('mcm_res_reg');
      localStorage.removeItem('mcm_res_cd');
      localStorage.removeItem('mcm_res_hub');
      
      // Enviamos el token real
      setToken(data.token); 
      setUsuario(data.user);
      setTabActiva('inventario');
    } catch (err) { 
      setLoginError(err.message || "Demasiados intentos. Por seguridad, espera 1 minuto."); 
    }
  };

  return (
    <div className="h-screen bg-[#050814] flex items-center justify-center p-4 font-sans text-slate-100">
      <form onSubmit={handleLoginSubmit} className="bg-[#0b132b] border border-slate-800 p-8 rounded-2xl w-full max-w-sm space-y-5 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400">
            <Server className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Memoria Técnica - Console</h2>
        </div>
        
        {loginError && (
          <div className="bg-red-950/40 border border-red-500/40 p-3 rounded-lg text-xs text-red-300 text-center">
            {loginError}
          </div>
        )}
        
        <div className="space-y-3">
          <input type="text" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-sm p-2 rounded-lg text-white outline-none focus:border-blue-500 transition-colors" placeholder="Usuario" />
          <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} required className="w-full bg-[#1c2541] border border-slate-700 text-sm p-2 rounded-lg text-white outline-none focus:border-blue-500 transition-colors" placeholder="Contraseña" />
        </div>
        
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-medium py-2 rounded-lg text-sm text-white cursor-pointer transition-colors shadow-lg shadow-blue-900/20">
          Conectar Seguro
        </button>
      </form>
    </div>
  );
}