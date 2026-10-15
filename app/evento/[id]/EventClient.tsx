'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEventPassStore, formatWhatsAppPhone, getAppBaseUrl } from '@/lib/store';
import { Calendar, MapPin, Clock, Users, ArrowLeft, Ticket as TicketIcon, CheckCircle2, ShieldCheck, MessageSquare, Sparkles, Mail, Download, Share2, ImageIcon } from 'lucide-react';
import { sendTicketEmail } from '@/lib/email';

export default function EventDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { events, registrations, registerPerson, attachPaymentReceipt } = useEventPassStore();
  
  const event = events.find((e) => e.id === id);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isRegistering, setIsRegistering] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState<{
    attempted: boolean;
    success: boolean;
    configured?: boolean;
    message?: string;
  } | null>(null);

  if (!event) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Evento no encontrado</h2>
        <p className="text-xs text-slate-500">El evento que buscas no existe o aún no ha sido publicado.</p>
        <Link href="/" className="inline-block bg-purple-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
          Volver a la Cartelera de Eventos
        </Link>
      </div>
    );
  }

  // Confirmed attendees for this event (ONLY NAMES DISPLAYED)
  const confirmedAttendees = registrations.filter(
    (r) => r.eventId === event.id && (r.status === 'inscribed' || r.status === 'attended')
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setIsRegistering(true);
    setErrorMsg(null);
    setEmailSendStatus(null);

    try {
      const res = await registerPerson(event.id, fullName, phone, email, preferredChannel);
      setSuccessResult(res.registration);
      if (res.isAlreadyRegistered) {
        setErrorMsg('Este número celular ya está registrado.');
      } else if (event.isFree && preferredChannel === 'email' && email.trim() && res.registration.qrDataUrl) {
        setIsSendingEmail(true);
        sendTicketEmail({
          toEmail: email.trim(),
          fullName,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          ticketId: res.registration.id,
          qrDataUrl: res.registration.qrDataUrl,
          priceInfo: 'Entrada Gratuita',
          replyToEmail: event.organizerContactEmail,
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
      setErrorMsg(err.message || 'Error al registrar');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleResendEmail = async () => {
    if (!successResult || !event || !email.trim()) return;
    setIsSendingEmail(true);
    try {
      const mailRes = await sendTicketEmail({
        toEmail: email.trim(),
        fullName: successResult.fullName,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        ticketId: successResult.id,
        qrDataUrl: successResult.qrDataUrl,
        priceInfo: event.isFree ? 'Entrada Gratuita' : `$${event.price} ${event.currency}`,
        replyToEmail: event.organizerContactEmail,
      });
      setEmailSendStatus({ attempted: true, ...mailRes });
    } catch (err: any) {
      setEmailSendStatus({ attempted: true, success: false, message: err.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadQR = (qrDataUrl?: string, folio?: string) => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Boleto-${folio || 'EventPass'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareQRImage = async (qrDataUrl?: string, title?: string, folio?: string) => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `Boleto-${folio || 'QR'}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Boleto para ${title}`,
          text: `Boleto de acceso oficial para ${title} (Folio: ${folio})`,
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Share error or canceled:', err);
    }
    // Si el navegador no permite compartir archivos directamente, descargar la imagen
    handleDownloadQR(qrDataUrl, folio);
  };

  const getAttendeeWhatsAppLink = (evt: any, reg: any) => {
    const baseUrl = getAppBaseUrl();
    const cleanPhone = formatWhatsAppPhone(reg.phone);
    const text = encodeURIComponent(
      `¡Hola ${reg.fullName}! 🎫\n\n` +
      `Tu registro para "${evt.title}" ha sido confirmado exitosamente.\n\n` +
      `📅 Fecha: ${evt.date} • ${evt.time}\n` +
      `📍 Lugar: ${evt.location}\n` +
      `🔖 Clave de Boleto: ${reg.id}\n\n` +
      `📲 Consulta y muestra tu código QR oficial en este enlace directo:\n` +
      `${baseUrl}/mis-boletos?phone=${cleanPhone}`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && successResult) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        attachPaymentReceipt(successResult.id, base64);
        setReceiptUploaded(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const getOrganizerPaymentWhatsAppLink = (evt: any, reg: any) => {
    const cleanPhone = formatWhatsAppPhone(evt.organizerPhone);
    const message = encodeURIComponent(
      `¡Hola! Acabo de registrarme para "${evt.title}".\n\n` +
      `👤 Nombre: ${reg.fullName}\n` +
      `🔖 Referencia de Pago: ${reg.paymentReference}\n` +
      `💵 Monto: $${evt.price} ${evt.currency}\n\n` +
      `Te adjunto mi comprobante de transferencia para validar mi acceso. ¡Muchas gracias!`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  return (
    <div className="space-y-10 pb-16">
      
      {/* Event Header Banner (Soft Pastel Gradient) */}
      <section className="bg-gradient-to-br from-purple-100/90 via-pink-50/70 to-amber-50/90 border-b border-purple-100 pt-10 pb-14 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto space-y-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-bold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a la Cartelera de Eventos
          </Link>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold uppercase bg-white/90 text-purple-900 px-3 py-1 rounded-full border border-purple-200 shadow-sm">
              {event.category}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${
              event.isFree ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {event.isFree ? 'Entrada Libre / Gratuita' : `$${event.price} ${event.currency}`}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 max-w-4xl">
            {event.title}
          </h1>

          <div className="flex flex-wrap gap-6 text-xs text-slate-600 pt-2 font-medium items-center">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-purple-600" /> {event.date}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-pink-500" /> {event.time}</span>
            {event.locationUrl ? (
              <a
                href={event.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-bold transition-all hover:underline"
              >
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{event.location}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                  Ver Mapa 📍
                </span>
              </a>
            ) : (
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-600" /> {event.location}</span>
            )}
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-600" /> {confirmedAttendees.length} / {event.capacity} confirmados</span>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Details & Public Attendees List */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Banner Photo if customized */}
          {event.bannerUrl && (
            <div className="rounded-3xl overflow-hidden border border-purple-100 shadow-md h-72">
              <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Description */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Acerca de este evento</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Ubicación y Botón de Mapa si está configurado */}
          {event.locationUrl && (
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0 border border-emerald-200 shadow-2xs">
                  📍
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Ubicación del Evento</h4>
                  <p className="text-xs text-slate-600 font-medium">{event.location}</p>
                </div>
              </div>
              <a
                href={event.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2.5 px-5 rounded-2xl shadow-md shadow-emerald-200 transition-all text-center"
              >
                <MapPin className="w-4 h-4" /> Abrir en Google Maps / GPS 🗺️
              </a>
            </div>
          )}

          {/* PÚBLICO: ASISTENTES CONFIRMADOS (SOLO SUS NOMBRES) */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-purple-50 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" /> Asistentes Confirmados ({confirmedAttendees.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Personas que ya tienen su lugar asegurado en este evento.
                </p>
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold border border-purple-200">
                Público
              </span>
            </div>

            {confirmedAttendees.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aún no hay inscripciones confirmadas. ¡Sé el primero!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {confirmedAttendees.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {att.fullName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{att.fullName}</p>
                      <p className="text-[10px] text-purple-700 font-medium">Inscripción confirmada</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Registration Card */}
        <div>
          <div className="sticky top-24 bg-white border-2 border-purple-200 rounded-3xl p-6 space-y-6 shadow-xl shadow-purple-100/50">
            <div className="border-b border-purple-100 pb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                Asegura tu Lugar
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="text-2xl font-black text-slate-900">
                  {event.isFree ? 'Entrada Gratuita' : `$${event.price} ${event.currency}`}
                </h3>
                <span className="text-xs text-slate-500 font-medium">Por persona</span>
              </div>
            </div>

            {successResult ? (
              <div className="py-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">¡Registro Completado!</h4>
                <p className="text-xs text-slate-600">
                  {event.isFree
                    ? 'Tu código QR ya está listo en tu sección Mis Boletos.'
                    : 'Tu lugar ha sido apartado. Realiza tu pago para confirmar tu acceso.'}
                </p>

                {/* Flujo para Evento de Pago */}
                {!event.isFree ? (
                  <div className="space-y-4 text-left pt-2">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        Paso 2: Realizar Pago
                      </span>
                      <h4 className="text-sm font-black text-slate-900 mt-1">
                        Tu lugar está reservado (Pendiente de Pago)
                      </h4>
                      <p className="text-xs text-slate-600 font-mono">
                        Referencia única: <strong className="text-slate-900 font-bold">{successResult.paymentReference}</strong>
                      </p>
                    </div>

                    {/* Datos Bancarios y Mensaje del Organizador */}
                    <div className="p-4 bg-purple-50/80 border border-purple-200/80 rounded-2xl space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 font-bold">
                        Datos para Transferencia
                      </span>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-line text-[11px] font-medium">
                        {event.bankDetails?.customPaymentMessage ||
                          `Realiza tu transferencia de $${event.price} ${event.currency} a la cuenta CLABE: ${event.bankDetails?.clabe || '012180001234567890'} (${event.bankDetails?.bankName || 'BBVA'}). Titular: ${event.bankDetails?.accountHolder || 'Organizador'}. Reenvía tu comprobante.`}
                      </p>
                    </div>

                    {/* Botón WhatsApp directo al Organizador */}
                    <div className="space-y-2">
                      <a
                        href={getOrganizerPaymentWhatsAppLink(event, successResult)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 text-center"
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

                    {/* Subida directa de comprobante */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-center">
                      {receiptUploaded ? (
                        <div className="text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 py-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Comprobante recibido. El organizador lo validará para emitir tu QR.
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
                  </div>
                ) : (
                  <>
                    {/* Email Feedback */}
                    {preferredChannel === 'email' && (
                      <div className="text-xs space-y-2 text-left">
                        {isSendingEmail && (
                          <div className="p-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-2xl flex items-center justify-center gap-2 animate-pulse">
                            <Mail className="w-4 h-4" /> Enviando boleto a tu correo ({email})...
                          </div>
                        )}

                        {emailSendStatus?.attempted && !isSendingEmail && (
                          emailSendStatus.success ? (
                            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl font-semibold flex items-center justify-center gap-2 text-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>¡Boleto enviado a tu correo ({email})!</span>
                            </div>
                          ) : emailSendStatus.configured === false ? (
                            <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-left space-y-1">
                              <p className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                                <span>⚠️</span> Servidor de correo pendiente de configurar
                              </p>
                              <p className="text-[11px] text-amber-800 leading-relaxed">
                                Tu boleto está activo en el sistema. Para recibirlo en tu bandeja real, agrega tu correo y contraseña de aplicación en <code>.env.local</code>.
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl flex items-center justify-between gap-2">
                              <span className="text-[11px]">Error: {emailSendStatus.message}</span>
                              <button
                                type="button"
                                onClick={handleResendEmail}
                                disabled={isSendingEmail}
                                className="underline font-bold text-rose-900 text-[11px] shrink-0"
                              >
                                Reintentar
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* QR Code Card (si está generado) */}
                    {successResult.qrDataUrl && (
                      <div className="p-4 bg-purple-50/60 rounded-3xl border-2 border-dashed border-purple-200 inline-block mx-auto shadow-inner space-y-2 animate-in zoom-in-95 duration-200">
                        <img
                          src={successResult.qrDataUrl}
                          alt="Código QR de Acceso"
                          className="w-44 h-44 mx-auto rounded-xl bg-white p-2 shadow-xs"
                        />
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Folio Oficial</span>
                          <span className="text-xs font-mono font-bold text-purple-900 bg-white py-0.5 px-2.5 rounded-lg border border-purple-200">
                            {successResult.id}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp & Image Sharing Options */}
                    {successResult.qrDataUrl ? (
                      <div className="space-y-2 pt-1 text-left">
                        <p className="text-[11px] font-bold text-slate-600 text-center">
                          ¿Cómo deseas guardar tu boleto?
                        </p>

                        {/* Botón 1: Compartir como imagen (Abre WhatsApp con foto adjunta en móvil) */}
                        <button
                          type="button"
                          onClick={() => handleShareQRImage(successResult.qrDataUrl, event.title, successResult.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-4 h-4" /> Enviar QR como Imagen a WhatsApp 📲
                        </button>

                        {/* Botón 2: Guardar directamente en galería */}
                        <button
                          type="button"
                          onClick={() => handleDownloadQR(successResult.qrDataUrl, successResult.id)}
                          className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-2xl shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Guardar Imagen del QR en Galería (PNG) 💾
                        </button>

                        {/* Botón 3: Enlace de chat con texto y link directo */}
                        <a
                          href={getAttendeeWhatsAppLink(event, successResult)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs py-2.5 px-4 rounded-2xl border border-emerald-300 transition-all flex items-center justify-center gap-2 text-center"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Abrir Mensaje con Enlace en WhatsApp
                        </a>
                      </div>
                    ) : preferredChannel === 'whatsapp' ? (
                      <div className="p-4 bg-emerald-50/90 border-2 border-emerald-300 rounded-3xl text-center space-y-2.5 shadow-sm animate-in fade-in">
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold border border-emerald-200">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Boleto para WhatsApp
                        </div>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                          Toca el botón para abrir tu boleto y guardarlo directamente en tu chat de WhatsApp:
                        </p>
                        <a
                          href={getAttendeeWhatsAppLink(event, successResult)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" /> Abrir y Recibir en mi WhatsApp 📲
                        </a>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {preferredChannel === 'email' && email.trim() && (
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={isSendingEmail}
                      className="w-full bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs py-2.5 rounded-2xl transition-all border border-purple-200 flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> Reenviar a mi correo
                    </button>
                  )}
                  <Link
                    href={`/mis-boletos?phone=${phone.replace(/\D/g, '')}`}
                    className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-2xl transition-all text-center"
                  >
                    Ver en Mis Boletos &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {errorMsg && (
                  <div className="p-2.5 bg-pink-50 text-pink-900 border border-pink-200 text-xs rounded-2xl font-medium">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tu Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofía Herrera"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Número Celular (WhatsApp) <span className="text-[10px] text-purple-600 font-bold">• Tu ancla</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10 dígitos"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-mono font-bold"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Enviar accesos por:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPreferredChannel('whatsapp')}
                      className={`py-2 rounded-2xl border text-center transition-all ${
                        preferredChannel === 'whatsapp'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredChannel('email')}
                      className={`py-2 rounded-2xl border text-center transition-all ${
                        preferredChannel === 'email'
                          ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      Correo
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-md shadow-purple-200 disabled:opacity-50"
                >
                  {isRegistering ? 'Procesando...' : event.isFree ? 'Completar Registro Gratuito 🎫' : 'Registrarme y Obtener Datos de Pago'}
                </button>
              </form>
            )}

            <div className="pt-1 text-center">
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Boleto digital verificado por QR
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
