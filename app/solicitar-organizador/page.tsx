'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEventPassStore } from '@/lib/store';
import { Sparkles, ArrowLeft, CheckCircle2, Send, HeartHandshake, Smartphone, User } from 'lucide-react';

export default function SolicitarOrganizadorPage() {
  const { submitOrganizerApplication } = useEventPassStore();

  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    submitOrganizerApplication(userName, phone);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-700 font-semibold transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a la Cartelera de Eventos
      </Link>

      <div className="bg-white border border-purple-100 rounded-3xl overflow-hidden shadow-xl shadow-purple-100/50">
        
        {/* Header (Pastel Deep Gradient) */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-8 sm:p-10 space-y-2 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-purple-100 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-pink-300" /> Registro de Productores
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Solicitar Acceso como Organizador
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 font-normal max-w-lg leading-relaxed">
            Ingresa tu nombre y tu celular. El <strong>Super Admin</strong> revisará tu postulación y te enviará por WhatsApp tu contraseña para ingresar a tu panel de eventos.
          </p>
        </div>

        {/* Content Body */}
        {isSubmitted ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-purple-200">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">¡Solicitud Enviada al Super Admin!</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Hemos registrado tus datos. En cuanto el Super Admin apruebe tu cuenta, te llegará un mensaje directo a tu <strong>WhatsApp (+{phone.replace(/\D/g, '')})</strong> con tu contraseña de acceso para entrar a <strong>/admin</strong>.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md shadow-purple-200 transition-all inline-flex items-center justify-center gap-2"
              >
                Volver a la Cartelera de Eventos &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-5">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" /> Tu Nombre Completo
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Mendoza o Productora México"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white transition-all font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-600" /> Número de Teléfono Celular (WhatsApp)
              </label>
              <input
                type="tel"
                required
                placeholder="Ingresa tu celular (10 dígitos)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white font-mono font-bold transition-all"
              />
              <p className="text-[11px] text-slate-400">
                * Por este número se te enviará la contraseña y el link para ingresar a tu panel.
              </p>
            </div>

            <div className="pt-4 border-t border-purple-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-purple-500" />
                Revisión directa por el Super Admin
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>

          </form>
        )}

      </div>

    </div>
  );
}
