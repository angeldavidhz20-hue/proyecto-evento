'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEventPassStore } from '@/lib/store';
import { Ticket, QrCode, Shield, Sparkles, Smartphone, LayoutDashboard, PlusCircle, ExternalLink, UserCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // En modo Staff (puerta/kiosk), ocultar toda la barra de navegación para aislar al personal
  if (pathname.startsWith('/staff')) {
    return null;
  }

  const isCurrent = (path: string) => pathname === path;
  const isSuperRoute = pathname.startsWith('/super');
  const isAdminRoute = pathname.startsWith('/admin');

  /* ============================================================== */
  /* 1. NAVBAR SUPER ADMIN (Visible en /super)                      */
  /* ============================================================== */
  if (isSuperRoute) {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md text-slate-800 border-b border-amber-200 shadow-sm shadow-amber-100/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo Super Admin */}
            <Link href="/super" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-800 to-indigo-800 text-white flex items-center justify-center font-black text-lg tracking-tight shadow-md shadow-purple-300/40">
                EP
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                  EventPass <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 font-extrabold">
                    👑 Super Admin
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Centro de Control Maestro
                </p>
              </div>
            </Link>

            {/* Navigation Super Admin */}
            <nav className="flex items-center gap-2 text-xs font-semibold">
              <Link
                href="/super"
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  isCurrent('/super') ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300' : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                Panel Maestro & Solicitudes
              </Link>

              <Link
                href="/admin"
                className="text-slate-600 hover:text-purple-700 hover:bg-purple-50 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Ir a Panel de Organizador &rarr;
              </Link>

              <Link
                href="/"
                className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs"
              >
                Ver Catálogo <ExternalLink className="w-3 h-3 text-purple-600" />
              </Link>
            </nav>

          </div>
        </div>
      </header>
    );
  }

  /* ============================================================== */
  /* 2. NAVBAR ORGANIZADOR (Visible en /admin o /staff)             */
  /* ============================================================== */
  if (isAdminRoute) {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md text-slate-800 border-b border-purple-200/80 shadow-sm shadow-purple-100/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo Admin */}
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white flex items-center justify-center font-black text-lg tracking-tight shadow-md shadow-purple-300/40">
                EP
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                  EventPass <span className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full border border-purple-200 font-bold">
                    Organizador
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Gestión de Eventos y Boletos
                </p>
              </div>
            </Link>

            {/* Admin Navigation */}
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
              <Link
                href="/admin"
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  isCurrent('/admin') ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-purple-600" />
                Mis Eventos
              </Link>

              <Link
                href="/admin/evento/nuevo"
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  isCurrent('/admin/evento/nuevo') ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-purple-600" />
                Publicar Evento
              </Link>

              <Link
                href="/staff"
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  pathname.startsWith('/staff') ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                Lector de Puerta
              </Link>
            </nav>

            {/* Back to Public Storefront */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs"
              >
                Ver Catálogo Público <ExternalLink className="w-3 h-3 text-purple-600" />
              </Link>
            </div>

          </div>
        </div>
      </header>
    );
  }

  /* ============================================================== */
  /* 3. NAVBAR PÚBLICO (Para asistentes que entran al link)         */
  /* ============================================================== */
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md text-slate-800 border-b border-purple-100/80 shadow-xs shadow-purple-100/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-400 via-pink-400 to-amber-300 text-white flex items-center justify-center font-black text-lg tracking-tight group-hover:scale-105 transition-transform shadow-md shadow-purple-200/50">
              EP
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                EventPass
              </span>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Cartelera Oficial & Registro</p>
            </div>
          </Link>

          {/* Clean Public Navigation */}
          <nav className="flex items-center gap-2 text-xs font-semibold">
            <Link
              href="/"
              className={`px-4 py-2 rounded-xl transition-all ${
                isCurrent('/') ? 'bg-purple-100/80 text-purple-900 font-bold' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
              }`}
            >
              Eventos Disponibles
            </Link>

            <Link
              href="/mis-boletos"
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                isCurrent('/mis-boletos')
                  ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-300'
                  : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Ticket className={`w-3.5 h-3.5 ${isCurrent('/mis-boletos') ? 'text-white' : 'text-purple-600'}`} />
              <span>Consultar Mi Boleto</span>
            </Link>
          </nav>

        </div>
      </div>
    </header>
  );
}
