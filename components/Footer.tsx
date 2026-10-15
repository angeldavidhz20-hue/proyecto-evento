'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // En modo Staff (puerta/kiosk), ocultar el footer para aislar al personal
  if (pathname.startsWith('/staff')) {
    return null;
  }

  const isAdminOrStaff = pathname.startsWith('/admin') || pathname.startsWith('/staff');

  return (
    <footer className="mt-auto border-t border-purple-100 bg-white/60 text-slate-700">
      
      {/* Banner de Solicitud de Organizador (Solo visible en páginas públicas) */}
      {!isAdminOrStaff && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-amber-100 border border-purple-200/80 rounded-3xl p-6 sm:p-10 shadow-lg shadow-purple-100/50 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            
            <div className="space-y-2 text-center md:text-left z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 text-purple-800 border border-purple-200 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Para Productores y Creadores
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                ¿Quieres publicar tu propio evento?
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm max-w-xl">
                Gestiona tus inscripciones sin comisiones bancarias complejas. Configura tu WhatsApp oficial de cobro y valida accesos con código QR.
              </p>
            </div>

            <div className="z-10">
              <Link
                href="/solicitar-organizador"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-purple-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Solicitar Acceso como Organizador 🚀
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="border-t border-purple-50 bg-slate-50/50 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-6 h-6 rounded-xl bg-gradient-to-tr from-purple-400 to-pink-400 text-white flex items-center justify-center font-black text-xs shadow-sm">
              EP
            </span>
            <span className="text-slate-900 font-bold">EventPass</span> &copy; 2026. Todos los derechos reservados.
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/" className="hover:text-purple-700 transition-colors">Eventos Disponibles</Link>
            <Link href="/mis-boletos" className="hover:text-purple-700 transition-colors">Consultar Boleto</Link>
            <Link href="/admin" className="text-slate-400 hover:text-purple-700 transition-colors text-[11px]">Acceso Organizadores</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
