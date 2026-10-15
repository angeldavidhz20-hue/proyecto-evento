'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft, Eye, EyeOff, Sparkles, LogOut, ShieldAlert, Smartphone, UserCheck } from 'lucide-react';
import { useEventPassStore } from '@/lib/store';
import { useAdminAuth } from '@/lib/admin-auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organizers, validateOrganizerLogin } = useEventPassStore();
  const { login, logout } = useAdminAuth();
  
  // Session state synced with sessionStorage
  const [activeOrganizer, setActiveOrganizer] = useState<{ phone: string; name: string } | null>(null);

  // Form State
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('ep_active_organizer');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setActiveOrganizer(parsed);
          login({
            username: parsed.phone,
            role: 'organizer',
            displayName: parsed.name,
            creatorId: parsed.phone,
            organizationName: parsed.name,
          });
        } catch {}
      }
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    const found = validateOrganizerLogin(cleanPhone, password);

    if (found) {
      const orgData = { phone: found.phone, name: found.name };
      setActiveOrganizer(orgData);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ep_active_organizer', JSON.stringify(orgData));
      }
      login({
        username: found.phone,
        role: 'organizer',
        displayName: found.name,
        creatorId: found.phone,
        organizationName: found.name,
      });
      setErrorMessage(null);
    } else {
      setErrorMessage(
        'Celular o contraseña incorrectos. Verifica que el Super Admin haya aprobado tu solicitud y revisa el mensaje que te llegó a tu WhatsApp.'
      );
    }
  };

  const handleLogout = () => {
    setActiveOrganizer(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ep_active_organizer');
    }
    logout();
    setPhone('');
    setPassword('');
  };

  // GATE: LOGIN DE ORGANIZADOR (Solo Celular y Contraseña)
  if (!activeOrganizer) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-purple-100 rounded-3xl p-8 sm:p-10 shadow-xl shadow-purple-100/60 space-y-6">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 via-pink-100 to-amber-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-purple-200">
              <UserCheck className="w-8 h-8 text-purple-600" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Panel de Organizadores
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Ingreso para Creadores de Eventos
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ingresa con tu <strong>Número Celular</strong> y la <strong>Contraseña</strong> que el Super Admin te envió por WhatsApp tras aprobar tu solicitud.
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
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-600" /> Número Celular Registrado
              </label>
              <input
                type="tel"
                required
                autoComplete="tel"
                placeholder="Ingresa tu celular (10 dígitos)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-600" /> Contraseña Recibida por WhatsApp
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 pr-10 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
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
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs py-3.5 rounded-2xl shadow-md shadow-purple-200 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              Ingresar a Mis Eventos 🚀
            </button>
          </form>

          {/* Links de ayuda */}
          <div className="pt-2 border-t border-purple-50 text-center space-y-2">
            <p className="text-[11px] text-slate-500">
              ¿Aún no eres organizador?{' '}
              <Link href="/solicitar-organizador" className="text-purple-600 font-bold hover:underline">
                Solicita tu cuenta aquí &rarr;
              </Link>
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-purple-700 transition-colors font-medium"
              >
                <ArrowLeft className="w-3 h-3" /> Volver a la Cartelera de Eventos
              </Link>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // AUTHENTICATED AS ORGANIZER
  return (
    <div className="space-y-2">
      {/* Top Session Bar for Organizer */}
      <div className="bg-purple-50/70 border-b border-purple-200 py-2 px-4 sm:px-8 text-xs flex items-center justify-between text-purple-950">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>
            Organizador activo: <strong className="font-bold">{activeOrganizer.name}</strong> • Celular: <strong className="font-mono">+{activeOrganizer.phone}</strong> • <span className="text-purple-600 font-semibold">Tus Eventos</span>
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
