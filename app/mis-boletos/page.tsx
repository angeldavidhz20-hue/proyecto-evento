'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEventPassStore, formatWhatsAppPhone, getAppBaseUrl, matchPhoneNumbers } from '@/lib/store';
import { Ticket as TicketIcon, Smartphone, Download, CheckCircle2, Clock, ArrowLeft, Search, Sparkles, Mail, MessageSquare, Share2, MapPin } from 'lucide-react';
import { sendTicketEmail } from '@/lib/email';

export default function MisBoletosPage() {
  const { registrations, events } = useEventPassStore();
  const [searchPhone, setSearchPhone] = useState('');
  const [queriedPhone, setQueriedPhone] = useState('');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const cleanQuery = queriedPhone.replace(/\D/g, '');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const phoneParam = params.get('phone');
      if (phoneParam) {
        setSearchPhone(phoneParam);
        setQueriedPhone(phoneParam);
      }
    }
  }, []);

  const myRegistrations = registrations.filter(
    (r) => cleanQuery && matchPhoneNumbers(r.phone, cleanQuery)
  );

  const handleShareQRImage = async (qrDataUrl?: string, title?: string, regId?: string) => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `Boleto-${regId || 'EventPass'}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Boleto para ${title || 'Evento'}`,
          text: `Boleto oficial de acceso para ${title || 'Evento'} (Folio: ${regId})`,
        });
        return;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.warn('Share error:', e);
    }
    handleDownloadQR(qrDataUrl, regId);
  };

  const getTicketWhatsAppLink = (reg: any, relatedEvent: any) => {
    const title = reg.eventTitle || relatedEvent?.title || 'Evento EventPass';
    const dateStr = relatedEvent?.date ? `📅 Fecha: ${relatedEvent.date} ${relatedEvent.time || ''}\n` : '';
    const locStr = relatedEvent?.location ? `📍 Lugar: ${relatedEvent.location}\n` : '';
    const mapStr = relatedEvent?.locationUrl ? `🗺️ Ubicación GPS: ${relatedEvent.locationUrl}\n` : '';
    const statusText = reg.status === 'inscribed' || reg.status === 'attended'
      ? '✅ Boleto Confirmado / Válido para Acceso'
      : '⏳ Pendiente de Verificación de Pago';

    const baseUrl = getAppBaseUrl();
    const cleanPhone = formatWhatsAppPhone(reg.phone);
    const message = `¡Hola! Aquí está mi boleto para ${title}:\n\n` +
      `🎟️ Folio: ${reg.id}\n` +
      `👤 Titular: ${reg.fullName}\n` +
      `${dateStr}${locStr}${mapStr}` +
      `📌 Estado: ${statusText}\n\n` +
      `Puedes consultar tu boleto y código QR en: ${baseUrl}/mis-boletos?phone=${cleanPhone}`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQueriedPhone(searchPhone);
  };

  const handleDownloadQR = (qrDataUrl?: string, regId?: string) => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Boleto-${regId || 'EventPass'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmailTicket = async (reg: any) => {
    if (!reg.email || !reg.qrDataUrl) return;
    setSendingEmailId(reg.id);
    setEmailNotice(null);

    const relatedEvent = events.find((e) => e.id === reg.eventId);

    try {
      const res = await sendTicketEmail({
        toEmail: reg.email,
        fullName: reg.fullName,
        eventTitle: reg.eventTitle || relatedEvent?.title || 'Evento EventPass',
        eventDate: relatedEvent?.date,
        eventTime: relatedEvent?.time,
        eventLocation: relatedEvent?.location,
        eventLocationUrl: relatedEvent?.locationUrl,
        ticketId: reg.id,
        qrDataUrl: reg.qrDataUrl,
        priceInfo: relatedEvent?.isFree ? 'Entrada Gratuita' : 'Entrada Confirmada',
        replyToEmail: relatedEvent?.organizerContactEmail,
      });

      setEmailNotice({
        id: reg.id,
        success: res.success,
        message: res.success ? `¡Boleto enviado a ${reg.email}!` : (res.configured === false ? 'Servidor de correo pendiente de configurar en .env.local.' : res.message),
      });
    } catch (e: any) {
      setEmailNotice({
        id: reg.id,
        success: false,
        message: e.message || 'Error al enviar correo.',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Header */}
      <div className="border-b border-purple-100 pb-6 space-y-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-bold">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a la Cartelera de Eventos
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Smartphone className="w-7 h-7 text-purple-600" /> Consulta de Boletos por Celular
        </h1>
        <p className="text-xs text-slate-500">
          Tu número celular es tu llave de acceso. Ingresa tu número para consultar tus boletos y códigos QR.
        </p>
      </div>

      {/* Phone Lookup Box in Pastel Gradient Card */}
      <div className="bg-gradient-to-br from-purple-50/80 via-white to-pink-50/80 border-2 border-purple-200/80 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto shadow-lg shadow-purple-100/50 space-y-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <label className="text-xs font-bold text-slate-800">Tu Número Celular Registrado</label>
          <div className="flex gap-2">
            <input
              type="tel"
              required
              placeholder="Ingresa tu celular (ej: 5541239876)"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="flex-1 bg-white border border-purple-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-500 font-mono font-bold shadow-inner"
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl transition-all shadow-md shadow-purple-200 flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5" /> Buscar
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            * Se muestran automáticamente todos los eventos a los que te has registrado con este número.
          </p>
        </form>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">
            Boletos Encontrados ({myRegistrations.length})
          </h2>
          {cleanQuery && (
            <span className="text-xs font-mono font-bold bg-purple-100 text-purple-900 px-3 py-1 rounded-full border border-purple-200">
              Celular: +{cleanQuery}
            </span>
          )}
        </div>

        {myRegistrations.length === 0 ? (
          <div className="bg-white border border-purple-100 rounded-3xl p-12 text-center space-y-3 shadow-sm">
            <TicketIcon className="w-12 h-12 text-purple-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No se encontraron boletos para este número</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Verifica haber escrito tu número sin espacios ni guiones, o regístrate en alguno de los eventos disponibles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myRegistrations.map((reg) => {
              const isInscribed = reg.status === 'inscribed';
              const isAttended = reg.status === 'attended';
              const isRegistered = reg.status === 'registered';
              const relatedEvent = events.find((e) => e.id === reg.eventId);

              return (
                <div
                  key={reg.id}
                  className="bg-white border-2 border-purple-100 rounded-3xl overflow-hidden shadow-md flex flex-col hover:shadow-xl hover:border-purple-300 transition-all"
                >
                  {/* Card Header in Soft Pastel Gradient */}
                  <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-amber-50 p-6 space-y-1.5 border-b border-purple-100">
                    <span className="text-[10px] font-bold uppercase bg-white/80 text-purple-900 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Boleto Oficial
                    </span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{reg.eventTitle}</h3>
                    <p className="text-xs text-slate-500 font-mono">Folio: {reg.id}</p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col items-center justify-between text-center space-y-5">
                    
                    {/* Status Badge in Soft Pastel */}
                    <div>
                      {isAttended && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Ingreso Registrado ({reg.attendedAt})
                        </span>
                      )}
                      {isInscribed && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Inscrito • Válido para Acceso
                        </span>
                      )}
                      {isRegistered && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-700" /> Pendiente de Verificación de Pago
                        </span>
                      )}
                    </div>

                    {/* QR Code Container */}
                    <div className="p-4 bg-purple-50/40 rounded-3xl border-2 border-dashed border-purple-200 shadow-inner">
                      {reg.qrDataUrl ? (
                        <img src={reg.qrDataUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
                      ) : (
                        <div className="w-44 h-44 bg-slate-50 flex flex-col items-center justify-center p-3 text-center space-y-1 rounded-2xl">
                          <Clock className="w-6 h-6 text-purple-400" />
                          <p className="text-xs font-bold text-slate-700">QR en Espera</p>
                          <p className="text-[10px] text-slate-400">
                            El organizador confirmará tu pago para activar tu código QR.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Attendee & Event Details */}
                    <div className="space-y-2 w-full text-xs border-t border-purple-50 pt-3 text-left">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Titular</p>
                          <p className="font-extrabold text-slate-900 text-sm">{reg.fullName}</p>
                          <p className="text-[11px] text-purple-700 font-mono font-bold">📱 +{reg.phone}</p>
                        </div>
                        {relatedEvent?.date && (
                          <div className="text-right">
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Fecha</p>
                            <p className="text-xs font-bold text-slate-800">{relatedEvent.date}</p>
                            {relatedEvent.time && (
                              <p className="text-[11px] text-slate-500 font-medium">{relatedEvent.time}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {relatedEvent?.location && (
                        <div className="pt-2 border-t border-dashed border-purple-100 flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                            <span className="truncate font-medium">{relatedEvent.location}</span>
                          </div>
                          {relatedEvent.locationUrl && (
                            <a
                              href={relatedEvent.locationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 shrink-0 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 transition-colors"
                            >
                              Ver Mapa 🗺️
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="w-full pt-1 space-y-2">
                      {emailNotice && emailNotice.id === reg.id && (
                        <div
                          className={`p-2.5 rounded-xl text-[11px] font-semibold text-center border ${
                            emailNotice.success
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}
                        >
                          {emailNotice.message}
                        </div>
                      )}

                      {reg.qrDataUrl ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleShareQRImage(reg.qrDataUrl, reg.eventTitle, reg.id)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2.5 rounded-2xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Enviar QR como Imagen a WhatsApp 📲
                          </button>

                          <button
                            onClick={() => handleDownloadQR(reg.qrDataUrl, reg.id)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-2xl shadow-md shadow-purple-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                          >
                            <Download className="w-3.5 h-3.5" /> Guardar QR en Galería (PNG) 💾
                          </button>

                          <a
                            href={getTicketWhatsAppLink(reg, relatedEvent)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs py-2 rounded-2xl flex items-center justify-center gap-2 transition-all text-center"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Abrir Mensaje con Enlace en WhatsApp
                          </a>

                          {reg.email && (
                            <button
                              onClick={() => handleSendEmailTicket(reg)}
                              disabled={sendingEmailId === reg.id}
                              className="w-full bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs py-2 rounded-2xl border border-purple-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {sendingEmailId === reg.id ? 'Enviando correo...' : 'Enviar a mi correo ✉️'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <a
                            href={getTicketWhatsAppLink(reg, relatedEvent)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-2xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Guardar en mi WhatsApp 📲
                          </a>
                          <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2.5 rounded-2xl border border-amber-200">
                            Referencia de Pago: <strong className="text-slate-900 font-mono">{reg.paymentReference}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
