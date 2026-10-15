'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEventPassStore, formatWhatsAppPhone, getAppBaseUrl } from '@/lib/store';
import { Calendar, MapPin, Users, Ticket, ArrowRight, MessageSquare, CheckCircle2, Sparkles, UploadCloud, Smartphone, Mail } from 'lucide-react';
import { Event, PersonRegistration } from '@/lib/types';
import { sendTicketEmail } from '@/lib/email';

export default function HomePage() {
  const { events, registrations, registerPerson, attachPaymentReceipt } = useEventPassStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [activeModalEvent, setActiveModalEvent] = useState<Event | null>(null);
  
  // Registration Form State (Anchored by Phone)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredResult, setRegisteredResult] = useState<PersonRegistration | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email status state
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState<{
    attempted: boolean;
    success: boolean;
    configured?: boolean;
    message?: string;
  } | null>(null);

  const filteredEvents = events.filter((e) => {
    if (selectedCategory === 'todos') return true;
    if (selectedCategory === 'gratis') return e.isFree;
    if (selectedCategory === 'pago') return !e.isFree;
    return e.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const handleOpenRegister = (evt: Event) => {
    setActiveModalEvent(evt);
    setRegisteredResult(null);
    setReceiptUploaded(false);
    setErrorMessage(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setEmailSendStatus(null);
    setIsSendingEmail(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalEvent) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setEmailSendStatus(null);

    try {
      const res = await registerPerson(
        activeModalEvent.id,
        fullName,
        phone,
        email,
        preferredChannel
      );

      setRegisteredResult(res.registration);
      if (res.isAlreadyRegistered) {
        setErrorMessage('Este número celular ya estaba registrado en este evento.');
      } else if (activeModalEvent.isFree && preferredChannel === 'email' && email.trim() && res.registration.qrDataUrl) {
        // Disparar envío automático de correo con el boleto y código QR
        setIsSendingEmail(true);
        sendTicketEmail({
          toEmail: email.trim(),
          fullName,
          eventTitle: activeModalEvent.title,
          eventDate: activeModalEvent.date,
          eventTime: activeModalEvent.time,
          eventLocation: activeModalEvent.location,
          eventLocationUrl: activeModalEvent.locationUrl,
          ticketId: res.registration.id,
          qrDataUrl: res.registration.qrDataUrl,
          priceInfo: 'Entrada Gratuita',
          replyToEmail: activeModalEvent.organizerContactEmail,
        })
          .then((mailRes) => {
            setEmailSendStatus({ attempted: true, ...mailRes });
            setIsSendingEmail(false);
          })
          .catch((err) => {
            setEmailSendStatus({ attempted: true, success: false, message: err.message });
            setIsSendingEmail(false);
          });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!registeredResult || !activeModalEvent || !email.trim()) return;
    setIsSendingEmail(true);
    try {
      const mailRes = await sendTicketEmail({
        toEmail: email.trim(),
        fullName: registeredResult.fullName,
        eventTitle: activeModalEvent.title,
        eventDate: activeModalEvent.date,
        eventTime: activeModalEvent.time,
        eventLocation: activeModalEvent.location,
        eventLocationUrl: activeModalEvent.locationUrl,
        ticketId: registeredResult.id,
        qrDataUrl: registeredResult.qrDataUrl,
        priceInfo: activeModalEvent.isFree ? 'Entrada Gratuita' : `$${activeModalEvent.price} ${activeModalEvent.currency}`,
        replyToEmail: activeModalEvent.organizerContactEmail,
      });
      setEmailSendStatus({ attempted: true, ...mailRes });
    } catch (err: any) {
      setEmailSendStatus({ attempted: true, success: false, message: err.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !registeredResult) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      attachPaymentReceipt(registeredResult.id, base64);
      setReceiptUploaded(true);
    };
    reader.readAsDataURL(file);
  };

  const getWhatsAppLink = (event: Event, reg: PersonRegistration) => {
    const orgPhone = formatWhatsAppPhone(event.organizerPhone || '525599887766');
    const text = encodeURIComponent(
      `¡Hola! Me acabo de registrar a "${event.title}".\n\n` +
      `👤 Nombre: ${reg.fullName}\n` +
      `📱 Celular: ${reg.phone}\n` +
      `🔖 Referencia: ${reg.paymentReference}\n\n` +
      `Adjunto mi comprobante de pago de $${event.price} ${event.currency} para confirmar mi inscripción.`
    );
    return `https://wa.me/${orgPhone}?text=${text}`;
  };

  const getAttendeeWhatsAppLink = (event: Event, reg: PersonRegistration) => {
    const locationLine = event.locationUrl
      ? `📍 Lugar: ${event.location}\n🗺️ Ubicación GPS: ${event.locationUrl}\n`
      : `📍 Lugar: ${event.location}\n`;

    const text = encodeURIComponent(
      `¡Hola ${reg.fullName}! 🎫\n\n` +
      `Tu boleto para "${event.title}" está confirmado con éxito.\n\n` +
      `📅 Fecha: ${event.date} • ${event.time}\n` +
      locationLine +
      `🔖 Clave de Boleto: ${reg.id}\n\n` +
      `📲 Consulta y muestra tu código QR oficial aquí:\n` +
      `${getAppBaseUrl()}/mis-boletos`
    );
    const cleanPhone = formatWhatsAppPhone(reg.phone);
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="space-y-12 pb-16">
      
      {/* HERO SECTION (Soft Pastel Mesh Gradient) */}
      <section className="bg-gradient-to-br from-purple-100/90 via-pink-50/70 to-amber-50/90 border-b border-purple-100/80 pt-16 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-purple-200/80 text-xs font-semibold text-purple-900 shadow-sm shadow-purple-100">
            <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Registro Ágil Sin Contraseñas
          </div>
          
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Regístrate a eventos en segundos con tu celular.
            </h1>
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl font-normal leading-relaxed">
              Sin crear cuentas ni recordar contraseñas. Tu número telefónico es tu boleto digital y tu llave de acceso oficial con código QR.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/mis-boletos"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-purple-300/40 flex items-center gap-2 hover:scale-[1.02]"
            >
              <Smartphone className="w-4 h-4" /> Consultar Mi Boleto por Celular
            </Link>
          </div>

        </div>
      </section>

      {/* EVENTS CATALOG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Eventos Disponibles</h2>
            <p className="text-xs text-slate-500">Selecciona tu evento y asegura tu lugar en un instante.</p>
          </div>

          {/* Filter Pills with Pastel Hues */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['todos', 'gratis', 'pago', 'tecnología', 'música'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full capitalize font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-300'
                    : 'bg-white text-slate-600 border border-purple-100 hover:border-purple-300 hover:text-purple-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* EVENT CARDS GRID OR EMPTY STATE */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white border border-purple-100 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-xl mx-auto">
            <div className="w-14 h-14 bg-gradient-to-tr from-purple-100 via-pink-100 to-amber-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto border border-purple-200 shadow-xs">
              <Ticket className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Aún no hay eventos publicados</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Pronto habrá nuevas conferencias, conciertos y talleres disponibles. Si eres productor y deseas publicar tu propio evento, solicita tu cuenta.
            </p>
            <div className="pt-2">
              <Link
                href="/solicitar-organizador"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-purple-200 inline-block transition-all"
              >
                Solicitar Acceso como Organizador 🚀
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((evt) => {
            const confirmedCount = registrations.filter(
              (r) => r.eventId === evt.id && (r.status === 'inscribed' || r.status === 'attended')
            ).length;

            return (
              <div
                key={evt.id}
                className="bg-white border border-purple-100/90 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-purple-300 transition-all flex flex-col group"
              >
                {/* Banner Header Image */}
                <div className="h-48 bg-purple-100 relative overflow-hidden">
                  {evt.bannerUrl ? (
                    <img
                      src={evt.bannerUrl}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-purple-200 to-pink-100 flex items-center justify-center text-purple-700 font-bold">
                      {evt.title}
                    </div>
                  )}

                  {/* Price Tag Overlay in Soft Pastel */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-sm ${
                        evt.isFree
                          ? 'bg-emerald-100/95 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100/95 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {evt.isFree ? 'Entrada Libre' : `$${evt.price} ${evt.currency}`}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/90 text-purple-900 backdrop-blur-sm border border-purple-200 shadow-sm">
                      {evt.category}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-purple-900 transition-colors tracking-tight">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="space-y-1.5 text-xs text-slate-500 pt-1 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-slate-800">{evt.date} • {evt.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                          <span className="text-slate-700 truncate">{evt.location}</span>
                        </div>
                        {evt.locationUrl && (
                          <a
                            href={evt.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 shrink-0 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 transition-colors"
                          >
                            Mapa 📍
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-purple-50 flex items-center justify-between gap-2">
                    <Link
                      href={`/evento?id=${evt.id}`}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" /> {confirmedCount} inscritos &rarr;
                    </Link>

                    <button
                      onClick={() => handleOpenRegister(evt)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-purple-200 active:scale-95"
                    >
                      Registrarme 🎫
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* REGISTRATION & PAYMENT MODAL */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-purple-100 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            
            {/* Modal Header in Soft Pastel Gradient */}
            <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-amber-100 p-6 relative border-b border-purple-200/80">
              <button
                onClick={() => setActiveModalEvent(null)}
                className="absolute top-5 right-5 text-slate-500 hover:text-slate-900 font-bold text-lg"
              >
                ✕
              </button>
              <span className="text-[10px] uppercase font-bold tracking-widest text-purple-800 bg-white/70 px-2 py-0.5 rounded-full border border-purple-200">
                Registro al Evento
              </span>
              <h3 className="text-xl font-black mt-1 text-slate-900">{activeModalEvent.title}</h3>
              <div className="text-xs text-slate-600 mt-1 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{activeModalEvent.date}</span>
                <span>•</span>
                <span>{activeModalEvent.isFree ? 'Entrada Libre' : `$${activeModalEvent.price} ${activeModalEvent.currency}`}</span>
                {activeModalEvent.location && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <span>{activeModalEvent.location}</span>
                      {activeModalEvent.locationUrl && (
                        <a
                          href={activeModalEvent.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-purple-700 hover:text-purple-900 hover:underline ml-1"
                        >
                          (Mapa 📍)
                        </a>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              
              {!registeredResult ? (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 bg-pink-50 text-pink-900 border border-pink-200 rounded-2xl text-xs font-semibold">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Luis Fernando Mendoza"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Número Celular (WhatsApp) <span className="text-[10px] text-purple-600 font-bold">• Tu ancla principal</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 5541239876 (10 dígitos)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">¿Por dónde prefieres recibir tus accesos y QR?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPreferredChannel('whatsapp')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          preferredChannel === 'whatsapp'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferredChannel('email')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          preferredChannel === 'email'
                            ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        ✉️ Correo
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-50 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveModalEvent(null)}
                      className="text-xs text-slate-500 hover:text-slate-900 font-semibold px-3 py-2"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-md shadow-purple-200 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Registrando...' : activeModalEvent.isFree ? 'Confirmar Inscripción Gratuita' : 'Continuar con el Registro'}
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 2: REGISTERED RESULT IN PASTEL THEME */
                <div className="space-y-5 text-center">
                  
                  {activeModalEvent.isFree ? (
                    <div className="space-y-4">
                      <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-md border border-emerald-200">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900">¡Ya estás Inscrito Oficialmente!</h4>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Tu boleto digital gratuito ha sido generado. Puedes descargarlo ahora o consultarlo con tu celular en <strong>Mis Boletos</strong>.
                      </p>

                      {/* Email Sending Feedback */}
                      {preferredChannel === 'email' && (
                        <div className="text-xs max-w-sm mx-auto">
                          {isSendingEmail && (
                            <div className="p-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-2xl flex items-center justify-center gap-2 animate-pulse">
                              <Mail className="w-4 h-4" /> Enviando boleto con código QR a tu correo...
                            </div>
                          )}

                          {emailSendStatus?.attempted && !isSendingEmail && (
                            emailSendStatus.success ? (
                              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl font-semibold flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>¡Boleto enviado a tu correo ({email})! Revisa tu bandeja.</span>
                              </div>
                            ) : emailSendStatus.configured === false ? (
                              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-left space-y-1">
                                <p className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                                  <span>⚠️</span> Servidor de correo pendiente de configurar
                                </p>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Tu boleto está listo y activo aquí abajo. Para que el correo llegue a tu bandeja real, agrega tu correo emisor y contraseña de aplicación en <code>.env.local</code>.
                                </p>
                              </div>
                            ) : (
                              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl flex items-center justify-between gap-2 text-left">
                                <div className="text-[11px] leading-tight">
                                  <strong>No se pudo enviar el correo:</strong> {emailSendStatus.message}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleResendEmail}
                                  disabled={isSendingEmail}
                                  className="underline text-[11px] font-bold text-rose-900 hover:text-rose-950 shrink-0"
                                >
                                  Reintentar
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* WhatsApp Delivery Action */}
                      {preferredChannel === 'whatsapp' && (
                        <div className="p-4 bg-emerald-50/90 border-2 border-emerald-300 rounded-3xl text-center space-y-2.5 max-w-sm mx-auto shadow-sm animate-in fade-in">
                          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold border border-emerald-200">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Boleto para WhatsApp
                          </div>
                          <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                            Toca el botón para abrir WhatsApp con tu boleto y guardarlo directamente en tu chat:
                          </p>
                          <a
                            href={getAttendeeWhatsAppLink(activeModalEvent, registeredResult)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" /> Abrir y Recibir en mi WhatsApp 📲
                          </a>
                        </div>
                      )}

                      {registeredResult.qrDataUrl && (
                        <div className="p-4 bg-purple-50/50 rounded-3xl border border-purple-100 inline-block shadow-inner">
                          <img src={registeredResult.qrDataUrl} alt="QR" className="w-40 h-40 mx-auto" />
                          <p className="text-[10px] text-slate-500 font-mono mt-2">ID: {registeredResult.id}</p>
                        </div>
                      )}

                      <div className="pt-3 flex flex-col sm:flex-row gap-2">
                        {preferredChannel === 'email' && email.trim() && (
                          <button
                            type="button"
                            onClick={handleResendEmail}
                            disabled={isSendingEmail}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs py-2.5 px-4 rounded-2xl transition-all border border-purple-200 flex items-center justify-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5" /> Reenviar a mi correo
                          </button>
                        )}
                        <Link
                          href="/mis-boletos"
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-2xl shadow-md shadow-purple-200 text-center"
                        >
                          Ir a Mis Boletos 🎟️
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 text-left">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                          Paso 2: Realizar Pago
                        </span>
                        <h4 className="text-base font-black text-slate-900 mt-1">
                          Tu lugar está reservado (Pendiente de Pago)
                        </h4>
                        <p className="text-xs text-slate-600 font-mono">
                          Referencia única: <strong className="text-slate-900 font-bold">{registeredResult.paymentReference}</strong>
                        </p>
                      </div>

                      {/* Custom Payment Message configured by Organizer in Pastel Card */}
                      <div className="p-4 bg-purple-50/80 border border-purple-200/80 rounded-2xl space-y-2 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                          Mensaje del Organizador para Pago
                        </span>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line text-[11px] font-medium">
                          {activeModalEvent.bankDetails?.customPaymentMessage ||
                            `Realiza tu transferencia de $${activeModalEvent.price} ${activeModalEvent.currency} a la cuenta CLABE: ${activeModalEvent.bankDetails?.clabe || '012180001234567890'} (${activeModalEvent.bankDetails?.bankName || 'BBVA'}). Reenvía tu comprobante.`}
                        </p>
                      </div>

                      {/* Option 1: Send via WhatsApp */}
                      <div className="space-y-2">
                        <a
                          href={getWhatsAppLink(activeModalEvent, registeredResult)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" /> Enviar Comprobante por WhatsApp 📲
                        </a>
                        <p className="text-[10px] text-slate-400 text-center">
                          Abre el chat directo con el organizador con tu referencia prellenada.
                        </p>
                      </div>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase font-mono">o adjúntalo aquí</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      {/* Option 2: Upload receipt right here */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-center">
                        {receiptUploaded ? (
                          <div className="text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 py-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Comprobante recibido. El admin lo revisará en su panel.
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-slate-800">Subir foto o captura del comprobante</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="text-xs text-slate-600 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-purple-600 file:text-white file:text-xs file:font-bold"
                            />
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setActiveModalEvent(null)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-2xl transition-all"
                      >
                        Entendido, cerrar ventana
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
