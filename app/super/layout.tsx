'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft, Eye, EyeOff, Sparkles, LogOut, ShieldAlert, Shield } from 'lucide-react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Volatile in-memory: always resets on page reload
  useEffect(() => {
    setIsAuthenticated(false);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (username.trim() === 'Admin123' && password === 'Mimamame21') {
      setIsAuthenticated(true);
      setErrorMessage(null);
    } else {
      setErrorMessage('Usuario o contraseña incorrectos. Verifica tus credenciales de Super Admin.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  // GATE: LOGIN EXCLUSIVO DE SUPER ADMIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-purple-100 rounded-3xl p-8 sm:p-10 shadow-xl shadow-purple-100/60 space-y-6">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 via-pink-100 to-amber-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-purple-200">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
              👑 Acceso Exclusivo • Super Admin
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Portal del Propietario
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ingresa con tus credenciales maestras para supervisar la plataforma, aprobar solicitudes de organizadores y enviar claves por WhatsApp.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-semibold flex items-center gap-2 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Usuario de Super Admin</label>
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Admin123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-400 focus:bg-white transition-all font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="off"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 pr-10 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-400 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs py-3.5 rounded-2xl shadow-md shadow-purple-200 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              Iniciar Sesión como Super Admin 👑
            </button>
          </form>

          <div className="pt-2 border-t border-purple-50 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a la Cartelera de Eventos
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // AUTHENTICATED
  return (
    <div className="space-y-2">
      <div className="bg-amber-50/70 border-b border-amber-200 py-2 px-4 sm:px-8 text-xs flex items-center justify-between text-amber-950">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>
            Sesión activa: <strong className="font-bold font-mono">Admin123</strong> • 👑 <strong>Super Administrador</strong> (Control Maestro)
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 text-[11px] bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-all cursor-pointer"
        >
          <LogOut className="w-3 h-3" /> Cerrar Sesión
        </button>
      </div>

      <div>{children}</div>
    </div>
  );
}
