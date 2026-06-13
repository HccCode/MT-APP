import React, { useState } from 'react';

const Login = ({ setToken, setUsuario, setTabActiva }) => {
  const [credenciales, setCredenciales] = useState({ usuario: '', password: '' });
  
  // Estados de control para el cambio de clave
  const [requiereCambio, setRequiereCambio] = useState(false);
  const [nuevosDatos, setNuevosDatos] = useState({ nueva: '', confirmar: '' });
  const [authTemporal, setAuthTemporal] = useState(null); 

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
  };

  const handleNuevosDatosChange = (e) => {
    setNuevosDatos({ ...nuevosDatos, [e.target.name]: e.target.value });
  };

  const completarLogin = (data) => {
    localStorage.setItem('mcm_token', data.token);
    localStorage.setItem('mcm_user', JSON.stringify(data.user));
    setUsuario(data.user);
    setToken(data.token);
    setTabActiva('inventario');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: credenciales.usuario,
            password: credenciales.password
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === "error") {
        throw new Error(data.detail || 'Credenciales incorrectas');
      }

      // Si el backend dictamina que necesita cambio
      if (data.user.must_change_password === true) {
        setAuthTemporal(data);
        setRequiereCambio(true);
        return; // Interrumpe y no hace login aún
      }

      // Si no, lo deja pasar
      completarLogin(data);

    } catch (err) {
      setError(err.message || 'Error en el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const handleCambioPassword = async (e) => {
    e.preventDefault();
    if (nuevosDatos.nueva !== nuevosDatos.confirmar) {
        setError("Las contraseñas no coinciden.");
        return;
    }
    if (nuevosDatos.nueva.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    setCargando(true);
    setError('');

    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${apiUrl}/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authTemporal.token}`
            },
            body: JSON.stringify({ new_password: nuevosDatos.nueva }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Fallo al actualizar.');
        }

        const dataActualizada = {
            ...authTemporal,
            user: { ...authTemporal.user, must_change_password: false }
        };

        completarLogin(dataActualizada);

    } catch (err) {
        setError(err.message);
    } finally {
        setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 font-sans relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl p-8 sm:p-10 relative z-10">
        
        <div className="flex justify-center mb-6">
          <div className={`h-16 w-16 bg-gradient-to-tr rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 ${requiereCambio ? 'from-amber-500 to-orange-600 shadow-orange-500/30' : 'from-blue-600 to-purple-600 shadow-blue-500/30'}`}>
            <svg className="w-8 h-8 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {requiereCambio ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              )}
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {requiereCambio ? 'Acción Requerida' : 'Bienvenido'}
          </h2>
          <p className={`text-sm mt-2 font-medium tracking-wide border-l-2 pl-2 text-left mx-auto max-w-[280px] ${requiereCambio ? 'text-amber-400 border-amber-500' : 'text-gray-400 border-blue-500'}`}>
            {requiereCambio 
                ? 'Por políticas de seguridad, debes actualizar tu contraseña antes de continuar.' 
                : 'Ingresa tus credenciales para acceder'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!requiereCambio ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Usuario</label>
                <input
                  name="usuario"
                  type="text"
                  required
                  value={credenciales.usuario}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-700 rounded-xl bg-gray-800/50 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe tu usuario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
                <input
                  name="password"
                  type="password"
                  required
                  value={credenciales.password}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-700 rounded-xl bg-gray-800/50 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={cargando} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-70">
                {cargando ? 'Validando...' : 'Iniciar Sesión'}
              </button>
            </form>
        ) : (
            <form onSubmit={handleCambioPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nueva Contraseña</label>
                <input
                  name="nueva"
                  type="password"
                  required
                  value={nuevosDatos.nueva}
                  onChange={handleNuevosDatosChange}
                  className="block w-full px-4 py-3 border border-gray-700 rounded-xl bg-gray-800/50 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmar Contraseña</label>
                <input
                  name="confirmar"
                  type="password"
                  required
                  value={nuevosDatos.confirmar}
                  onChange={handleNuevosDatosChange}
                  className="block w-full px-4 py-3 border border-gray-700 rounded-xl bg-gray-800/50 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Repite la contraseña"
                />
              </div>

              <button type="submit" disabled={cargando} className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-70">
                {cargando ? 'Actualizando...' : 'Actualizar y Entrar'}
              </button>
            </form>
        )}
      </div>
    </div>
  );
};

export default Login;