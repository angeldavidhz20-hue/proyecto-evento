'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEventPassStore } from '@/lib/store';
import { useAdminAuth } from '@/lib/admin-auth';
import { ArrowLeft, Sparkles, Calendar, MapPin, DollarSign, MessageSquare } from 'lucide-react';

export default function NuevoEventoPage() {
  const router = useRouter();
  const { createEvent } = useEventPassStore();
  const { admin } = useAdminAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tecnología');
  const [date, setDate] = useState('2026-11-15');
  const [time, setTime] = useState('10:00 AM');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [capacity, setCapacity] = useState('300');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('250');
  const [bannerUrl, setBannerUrl] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState(admin?.creatorId || admin?.username || '525599887766');
  const [organizerContactEmail, setOrganizerContactEmail] = useState('');
  const [bankName, setBankName] = useState('BBVA México');
  const [accountHolder, setAccountHolder] = useState(admin?.displayName || 'Producciones Oficiales');
  const [clabe, setClabe] = useState('012180001234567890');
  const [customMsg, setCustomMsg] = useState(
    '¡Hola! Para confirmar tu lugar, transfiere el monto a nuestra cuenta bancaria. Usa tu celular como concepto y reenvía tu comprobante por este chat para enviarte tu código QR.'
  );

  useEffect(() => {
    if (admin) {
      if (admin.creatorId || admin.username) {
        setOrganizerPhone(admin.creatorId || admin.username);
      }
      if (admin.displayName) {
        setAccountHolder(admin.displayName);
      }
    }
  }, [admin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = title.substring(0, 4).toUpperCase().replace(/\s/g, '') + '26';

    const newEvt = createEvent({
      title,
      description,
      category,
      date,
      time,
      location,
      locationUrl: locationUrl.trim() || undefined,
      capacity: Number(capacity) || 200,
      isFree,
      price: isFree ? 0 : Number(price) || 0,
      currency: 'MXN',
      bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      organizerPhone: organizerPhone.replace(/\D/g, ''),
      organizerContactEmail: organizerContactEmail.trim() || undefined,
      staffPin: pin,
      creatorId: admin?.creatorId || (admin?.role === 'superadmin' ? 'user_super' : 'user_org_1'),
      creatorName: admin?.displayName || 'Organizador',
      authorizedScanners: [organizerPhone.replace(/\D/g, '')],
      bankDetails: isFree
        ? undefined
        : {
            bankName,
            accountHolder,
            clabe,
            customPaymentMessage: customMsg,
          },
    });

    router.push(`/admin/evento?id=${newEvt.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-700 font-semibold transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a Mis Eventos
      </Link>

      <div className="bg-white border border-purple-100 rounded-3xl overflow-hidden shadow-lg shadow-purple-50">
        
        {/* Header (Pastel Deep Gradient) */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-8 sm:p-10 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-300" /> Creador de Eventos
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Crear y Personalizar Nuevo Evento
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 font-normal max-w-xl">
            Define la portada, horarios, datos de cobro y el mensaje exacto que recibirán tus asistentes por WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Título del Evento</label>
              <input
                type="text"
                required
                placeholder="Ej: Workshop de Desarrollo Web"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
              >
                <option>Tecnología</option>
                <option>Música</option>
                <option>Deportes</option>
                <option>Educación</option>
                <option>Social & Arte</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">URL de Imagen de Portada / Banner</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Descripción Completa</label>
            <textarea
              rows={3}
              required
              placeholder="Explica de qué trata tu evento, qué incluye y los requisitos de asistencia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Fecha</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Hora</label>
              <input
                type="text"
                required
                placeholder="Ej: 10:00 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Aforo Máximo (Cupo)</label>
              <input
                type="number"
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Lugar / Sede (Nombre o Dirección)</label>
              <input
                type="text"
                required
                placeholder="Ej: Auditorio BB, CDMX"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Link de Ubicación (Google Maps o Waze)</span>
                <span className="text-[10px] text-purple-600 font-semibold">Opcional</span>
              </label>
              <input
                type="url"
                placeholder="https://maps.app.goo.gl/... o https://maps.google.com/..."
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">WhatsApp Oficial del Organizador</label>
              <input
                type="tel"
                required
                placeholder="Ej: 525599887766 (con código de país)"
                value={organizerPhone}
                onChange={(e) => setOrganizerPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">
                Correo Electrónico de Contacto del Evento <span className="text-purple-600 font-normal">(Para que los asistentes te respondan)</span>
              </label>
              <input
                type="email"
                placeholder="ej: contacto@mievento.com o producciones@gmail.com"
                value={organizerContactEmail}
                onChange={(e) => setOrganizerContactEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400">
                * Si un asistente responde al correo de su boleto para hacer preguntas, las dudas te llegarán directamente a este correo.
              </p>
            </div>
          </div>

          {/* Configuración de Cobro */}
          <div className="p-6 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-amber-50/40 border border-purple-100 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-purple-600" /> Precios y Datos de Depósito
              </span>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-400"
                />
                ¿Evento Gratuito?
              </label>
            </div>

            {!isFree && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Precio (MXN)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Banco Receptor</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">CLABE Interbancaria</label>
                    <input
                      type="text"
                      value={clabe}
                      onChange={(e) => setClabe(e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                    Mensaje Personalizado con Información de Pago (Recibido por WhatsApp)
                  </label>
                  <textarea
                    rows={3}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full bg-white border border-purple-200 rounded-2xl p-3.5 text-xs text-slate-900 font-mono leading-relaxed focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs px-7 py-3.5 rounded-2xl transition-all shadow-md shadow-purple-200 active:scale-98"
            >
              Publicar Evento y Abrir Registro 🚀
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
