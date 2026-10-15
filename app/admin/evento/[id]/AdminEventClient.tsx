'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEventPassStore, formatWhatsAppPhone, getAppBaseUrl } from '@/lib/store';
import { Settings, Users, QrCode, ArrowLeft, ExternalLink, MessageSquare, CheckCircle2, Clock, FileText, Image as ImageIcon, Plus, Trash2, Smartphone, ShieldCheck, Mail, Copy, RefreshCw, Key, Share2, Lock } from 'lucide-react';
import { Event, PersonRegistration } from '@/lib/types';
import { sendTicketEmail } from '@/lib/email';

export default function EventAdminPage({ id }: { id: string }) {
  const { events, registrations, updateEvent, confirmPaymentAndInscribe, addAuthorizedScanner, removeAuthorizedScanner } = useEventPassStore();
  
  const event = events.find((e) => e.id === id);

  const [activeTab, setActiveTab] = useState<'people' | 'customization' | 'scanners'>('people');
  const [peopleFilter, setPeopleFilter] = useState<'registered' | 'inscribed'>('registered');

  // Scanner Form & Link Generation State
  const [newScannerInput, setNewScannerInput] = useState('');
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [pinEditMode, setPinEditMode] = useState(false);
  const [pinInput, setPinInput] = useState(event?.staffPin || 'PRUE26');

  // Event Customization Form State
  const [bannerUrl, setBannerUrl] = useState(event?.bannerUrl || '');
  const [title, setTitle] = useState(event?.title || '');
  const [desc, setDesc] = useState(event?.description || '');
  const [loc, setLoc] = useState(event?.location || '');
  const [locationUrl, setLocationUrl] = useState(event?.locationUrl || '');
  const [price, setPrice] = useState(event ? event.price.toString() : '0');
  const [isFree, setIsFree] = useState(event?.isFree ?? false);
  const [orgPhone, setOrgPhone] = useState(event?.organizerPhone || '525599887766');
  const [orgContactEmail, setOrgContactEmail] = useState(event?.organizerContactEmail || '');
  const [clabe, setClabe] = useState(event?.bankDetails?.clabe || '012180001234567890');
  const [bankName, setBankName] = useState(event?.bankDetails?.bankName || 'BBVA');
  const [accountHolder, setAccountHolder] = useState(event?.bankDetails?.accountHolder || 'Nombre del Organizador');
  const [customMsg, setCustomMsg] = useState(
    event?.bankDetails?.customPaymentMessage ||
      '¡Hola! Para asegurar tu lugar en el evento, realiza tu transferencia a nuestra cuenta bancaria. Usa tu número celular como concepto de pago y reenvía tu comprobante por este chat para enviarte tu código QR.'
  );

  const [receiptModalImage, setReceiptModalImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sendingEmailRegId, setSendingEmailRegId] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setBannerUrl(event.bannerUrl || '');
      setTitle(event.title || '');
      setDesc(event.description || '');
      setLoc(event.location || '');
      setLocationUrl(event.locationUrl || '');
      setPrice(event.price.toString());
      setIsFree(event.isFree ?? false);
      setOrgPhone(event.organizerPhone || '525599887766');
      setOrgContactEmail(event.organizerContactEmail || '');
      if (event.bankDetails) {
        setClabe(event.bankDetails.clabe || '012180001234567890');
        setBankName(event.bankDetails.bankName || 'BBVA');
        setAccountHolder(event.bankDetails.accountHolder || 'Nombre del Organizador');
        setCustomMsg(event.bankDetails.customPaymentMessage || '');
      }
      setPinInput(event.staffPin || 'PRUE26');
    }
  }, [event]);

  if (!event) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Evento no encontrado</h2>
        <p className="text-xs text-slate-500">Este evento no existe o aún no ha sido creado.</p>
        <Link href="/admin" className="inline-block bg-purple-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
          Volver a Mis Eventos
        </Link>
      </div>
    );
  }

  // Filter registrations for this event
  const eventRegistrations = registrations.filter((r) => r.eventId === event.id);
  const pendingRegistrations = eventRegistrations.filter((r) => r.status === 'registered');
  const inscribedRegistrations = eventRegistrations.filter((r) => r.status === 'inscribed' || r.status === 'attended');

  const totalRevenue = inscribedRegistrations.length * (event.isFree ? 0 : event.price);

  const handleConfirmPayment = async (regId: string, attendeeName: string) => {
    const updated = await confirmPaymentAndInscribe(regId);
    setToastMessage(`¡Pago confirmado para ${attendeeName}! QR generado.`);
    setTimeout(() => setToastMessage(null), 3500);

    const target = updated || registrations.find((r) => r.id === regId);
    if (target?.email && target.preferredChannel === 'email' && target.qrDataUrl) {
      sendTicketEmail({
        toEmail: target.email,
        fullName: target.fullName,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        ticketId: target.id,
        qrDataUrl: target.qrDataUrl,
        priceInfo: `$${event.price} ${event.currency}`,
        replyToEmail: event.organizerContactEmail,
      }).catch((err) => console.warn('Error al auto-enviar correo:', err));
    }
  };

  const handleSendEmailFromAdmin = async (reg: PersonRegistration) => {
    if (!reg.email || !reg.qrDataUrl) return;
    setSendingEmailRegId(reg.id);
    try {
      const res = await sendTicketEmail({
        toEmail: reg.email,
        fullName: reg.fullName,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        ticketId: reg.id,
        qrDataUrl: reg.qrDataUrl,
        priceInfo: event.isFree ? 'Entrada Gratuita' : `$${event.price} ${event.currency}`,
        replyToEmail: event.organizerContactEmail,
      });
      if (res.success) {
        setToastMessage(`¡Boleto enviado con éxito a ${reg.email}!`);
      } else {
        setToastMessage(res.configured === false ? 'Aviso: Servidor de correo pendiente de configurar en .env.local.' : `Aviso: ${res.message}`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      setToastMessage(`Error al enviar correo: ${e.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSendingEmailRegId(null);
    }
  };

  const handleAddScanner = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newScannerInput.trim();
    if (!clean) return;
    addAuthorizedScanner(event.id, clean);
    setNewScannerInput('');
    setToastMessage(`¡Enlace generado exitosamente para "${clean}"!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getStaffLink = (scannerName: string) => {
    const baseUrl = getAppBaseUrl();
    return `${baseUrl}/staff?event=${event.id}&key=${event.staffPin}&name=${encodeURIComponent(scannerName)}`;
  };

  const handleCopyStaffLink = (scannerName: string, index: number) => {
    const link = getStaffLink(scannerName);
    navigator.clipboard.writeText(link);
    setCopiedLinkIndex(index);
    setToastMessage(`¡Enlace copiado al portapapeles! Listo para enviar a ${scannerName}.`);
    setTimeout(() => {
      setCopiedLinkIndex(null);
      setToastMessage(null);
    }, 3500);
  };

  const getStaffWhatsAppShareLink = (scannerName: string) => {
    const link = getStaffLink(scannerName);
    const message = `¡Hola ${scannerName}! 🎫\n\n` +
      `Aquí tienes tu enlace oficial de acceso para escanear y validar boletos en la entrada de "${event.title}":\n\n` +
      `👉 ${link}\n\n` +
      `Abre este enlace desde tu celular para activar el lector de boletos de este evento.`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handleRegenerateMasterPin = () => {
    const randomPin = Math.random().toString(36).substring(2, 8).toUpperCase();
    updateEvent(event.id, { staffPin: randomPin });
    setPinInput(randomPin);
    setToastMessage(`¡Clave Maestra renovada (${randomPin})! Los enlaces anteriores han sido revocados.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleSavePin = () => {
    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) return;
    updateEvent(event.id, { staffPin: cleanPin });
    setPinEditMode(false);
    setToastMessage(`Clave Maestra actualizada a: ${cleanPin}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvent(event.id, {
      title,
      description: desc,
      location: loc,
      locationUrl: locationUrl.trim() || undefined,
      bannerUrl,
      isFree,
      price: Number(price),
      organizerPhone: orgPhone,
      organizerContactEmail: orgContactEmail.trim() || undefined,
      bankDetails: {
        bankName,
        accountHolder,
        clabe,
        customPaymentMessage: customMsg,
      },
    });
    setToastMessage('¡Configuración del evento guardada exitosamente!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getSendQRWhatsAppLink = (reg: PersonRegistration) => {
    const baseUrl = getAppBaseUrl();
    const text = encodeURIComponent(
      `¡Hola ${reg.fullName}! 👋\n\n` +
      `Tu pago para "${event.title}" ha sido verificado con éxito.\n\n` +
      `🎫 Tu código QR y boleto oficial ya están activos.\n` +
      `Consulta y descarga tu boleto en este enlace: ${baseUrl}/mis-boletos\n\n` +
      `¡Nos vemos en el evento!`
    );
    const cleanPhone = formatWhatsAppPhone(reg.phone);
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-bold">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Mis Eventos
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {event.title}
            </h1>
            <span className="text-[10px] bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
              Panel del Creador
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de asistentes, canalización de pagos y lectores de QR en puerta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/staff?event=${event.id}&key=${event.staffPin}&role=admin&name=${encodeURIComponent(event.creatorName || 'Organizador')}`}
            target="_blank"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold px-4 py-2 rounded-2xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-100 active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5" /> Abrir mi Escáner (Admin) 📱
          </Link>
          <Link
            href={`/evento?id=${event.id}`}
            target="_blank"
            className="bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-xs font-bold px-3.5 py-2 rounded-2xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            Página Pública <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
          </Link>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {toastMessage}
        </div>
      )}

      {/* Quick Metrics Bar in Soft Pastel Colors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-3xl shadow-sm">
          <span className="text-xs text-amber-700 font-bold">Registrados (Pendientes)</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{pendingRegistrations.length}</p>
          <span className="text-[10px] text-amber-600 font-medium">Esperando verificación</span>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-3xl shadow-sm">
          <span className="text-xs text-emerald-700 font-bold">Inscritos Confirmados</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{inscribedRegistrations.length}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Con QR emitido</span>
        </div>
        <div className="bg-purple-50/70 border border-purple-200 p-5 rounded-3xl shadow-sm">
          <span className="text-xs text-purple-700 font-bold">Ingresaron en Puerta</span>
          <p className="text-2xl font-black text-purple-900 mt-1">
            {inscribedRegistrations.filter((r) => r.status === 'attended').length}
          </p>
          <span className="text-[10px] text-purple-600 font-medium">Escaneados</span>
        </div>
        <div className="bg-pink-50/70 border border-pink-200 p-5 rounded-3xl shadow-sm">
          <span className="text-xs text-pink-700 font-bold">Recaudación Confirmada</span>
          <p className="text-2xl font-black text-pink-900 mt-1 font-mono">
            ${totalRevenue.toLocaleString()} {event.currency}
          </p>
          <span className="text-[10px] text-pink-600 font-medium">De pagos validados</span>
        </div>
      </div>

      {/* Main Tabs Navigation in Pastel Pills */}
      <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold w-fit">
        <button
          onClick={() => setActiveTab('people')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'people' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-700'
          }`}
        >
          👥 Gestión de Asistentes & Pagos
        </button>
        <button
          onClick={() => setActiveTab('customization')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'customization' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-700'
          }`}
        >
          🎨 Personalización & Cobro
        </button>
        <button
          onClick={() => setActiveTab('scanners')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'scanners' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-700'
          }`}
        >
          📱 Lectores de QR Autorizados ({event.authorizedScanners.length})
        </button>
      </div>

      {/* TAB 1: GESTIÓN DE ASISTENTES & PAGOS */}
      {activeTab === 'people' && (
        <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-50 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Lista de Clientes y Pagos
              </h2>
              <p className="text-xs text-slate-500">
                Canaliza las transferencias, revisa los comprobantes y confirma las inscripciones.
              </p>
            </div>

            <div className="flex gap-2 text-xs font-bold">
              <button
                onClick={() => setPeopleFilter('registered')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  peopleFilter === 'registered'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:text-amber-800'
                }`}
              >
                🟡 Registrados ({pendingRegistrations.length})
              </button>
              <button
                onClick={() => setPeopleFilter('inscribed')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  peopleFilter === 'inscribed'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:text-emerald-800'
                }`}
              >
                🟢 Inscritos Oficiales ({inscribedRegistrations.length})
              </button>
            </div>
          </div>

          {/* TABLE: REGISTRADOS (ESPERANDO PAGO) */}
          {peopleFilter === 'registered' && (
            <div className="space-y-4">
              {pendingRegistrations.length === 0 ? (
                <div className="p-8 text-center bg-purple-50/30 rounded-2xl border border-purple-100 text-xs text-slate-500">
                  No hay personas pendientes de confirmación de pago.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-purple-50/50 text-purple-900 uppercase text-[10px] font-bold border-b border-purple-100">
                      <tr>
                        <th className="p-3.5">Asistente</th>
                        <th className="p-3.5">Número Celular (Ancla)</th>
                        <th className="p-3.5">Referencia de Pago</th>
                        <th className="p-3.5">Comprobante</th>
                        <th className="p-3.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {pendingRegistrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            {reg.fullName}
                            <div className="text-[11px] font-normal text-slate-500">{reg.email}</div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-purple-900 text-sm">
                            +{reg.phone}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-700">
                            {reg.paymentReference}
                          </td>
                          <td className="p-3.5">
                            {reg.paymentReceiptImage ? (
                              <button
                                onClick={() => setReceiptModalImage(reg.paymentReceiptImage || null)}
                                className="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2.5 py-1 rounded-xl text-[11px] border border-amber-200"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-700" /> Ver Comprobante 📸
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No ha adjuntado</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleConfirmPayment(reg.id, reg.fullName)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md shadow-purple-200"
                            >
                              Confirmar Pago & Inscribir ✅
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TABLE: INSCRITOS OFICIALES */}
          {peopleFilter === 'inscribed' && (
            <div className="space-y-4">
              {inscribedRegistrations.length === 0 ? (
                <div className="p-8 text-center bg-purple-50/30 rounded-2xl border border-purple-100 text-xs text-slate-500">
                  Aún no hay asistentes inscritos confirmados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-purple-50/50 text-purple-900 uppercase text-[10px] font-bold border-b border-purple-100">
                      <tr>
                        <th className="p-3.5">Asistente</th>
                        <th className="p-3.5">Número Celular</th>
                        <th className="p-3.5">Estado en Puerta</th>
                        <th className="p-3.5">Hora Inscripción</th>
                        <th className="p-3.5 text-right">Enviar Acceso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {inscribedRegistrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            {reg.fullName}
                            <div className="text-[11px] font-normal text-slate-500">{reg.email}</div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-purple-900 text-sm">
                            +{reg.phone}
                          </td>
                          <td className="p-3.5">
                            {reg.status === 'attended' ? (
                              <span className="bg-slate-100 text-slate-800 border border-slate-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                Ingresó ({reg.attendedAt})
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                                Pendiente de llegar
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-500">
                            {reg.inscribedAt || 'Confirmado'}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            {reg.email && (
                              <button
                                type="button"
                                onClick={() => handleSendEmailFromAdmin(reg)}
                                disabled={sendingEmailRegId === reg.id}
                                className="inline-flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs px-3 py-1.5 rounded-xl border border-purple-200 transition-all disabled:opacity-50"
                              >
                                <Mail className="w-3.5 h-3.5 text-purple-700" />
                                {sendingEmailRegId === reg.id ? 'Enviando...' : 'Reenviar Correo'}
                              </button>
                            )}
                            <a
                              href={getSendQRWhatsAppLink(reg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md shadow-emerald-200"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: PERSONALIZACIÓN & MENSAJE DE PAGO */}
      {activeTab === 'customization' && (
        <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-purple-50 pb-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Personalización del Evento e Información de Cobro
            </h2>
            <p className="text-xs text-slate-500">
              Personaliza la imagen, datos bancarios y el mensaje exacto que recibirán los clientes para pagar.
            </p>
          </div>

          <form onSubmit={handleSaveCustomization} className="space-y-6 max-w-3xl">
            
            {/* Banner URL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">URL de Imagen de Portada / Banner</label>
              <input
                type="url"
                placeholder="https://..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
              {bannerUrl && (
                <div className="h-40 rounded-3xl overflow-hidden border border-purple-100 mt-2">
                  <img src={bannerUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Título del Evento</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">WhatsApp Oficial del Organizador</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 525599887766 (con código de país)"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-800">
                  Correo de Contacto del Evento <span className="text-purple-600 font-normal">(Reply-To de los Boletos)</span>
                </label>
                <input
                  type="email"
                  placeholder="ej: contacto@mievento.com o producciones@gmail.com"
                  value={orgContactEmail}
                  onChange={(e) => setOrgContactEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-400">
                  * Si un asistente responde al correo de su boleto con dudas, te llegará a este correo personal.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Lugar / Sede (Texto)</label>
                <input
                  type="text"
                  placeholder="Ej: Auditorio BB, CDMX"
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Link de Google Maps o Waze</span>
                  <span className="text-[10px] text-purple-600 font-semibold">Opcional</span>
                </label>
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/... o https://maps.google.com/..."
                  value={locationUrl}
                  onChange={(e) => setLocationUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">Descripción Detallada</label>
              <textarea
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* SECCIÓN DE COBRO EN PASTEL */}
            <div className="p-5 bg-purple-50/40 rounded-3xl border border-purple-100 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <span className="font-bold text-xs text-purple-950">Configuración de Precios y Banco</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  ¿Evento Gratuito?
                </label>
              </div>

              {!isFree && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Precio Boleto (MXN)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-white border border-purple-200 rounded-2xl px-3 py-2 text-xs text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Banco Receptor</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-white border border-purple-200 rounded-2xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">CLABE Interbancaria</label>
                      <input
                        type="text"
                        value={clabe}
                        onChange={(e) => setClabe(e.target.value)}
                        className="w-full bg-white border border-purple-200 rounded-2xl px-3 py-2 text-xs text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* MENSAJE PERSONALIZADO DE PAGO */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-800">
                      Mensaje Personalizado con Información de Pago (Recibido por WhatsApp / Correo)
                    </label>
                    <textarea
                      rows={3}
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      placeholder="Redacta las instrucciones exactas, número de cuenta y cómo mandar el comprobante..."
                      className="w-full bg-white border border-purple-200 rounded-2xl p-3 text-xs text-slate-900 font-mono leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-500">
                      * Este es el texto que le aparecerá al usuario para que sepa exactamente a qué cuenta transferir y cómo mandar su comprobante.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-3 rounded-2xl transition-all shadow-md shadow-purple-200"
            >
              Guardar Personalización del Evento 💾
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: GESTIÓN DE ENLACES PARA STAFF Y CONTROL DE ACCESO */}
      {activeTab === 'scanners' && (
        <div className="space-y-6 max-w-4xl">
          
          {/* 1. ACCESO DIRECTO DEL ORGANIZADOR */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-3 border border-purple-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
                  Acceso del Creador
                </span>
                <h3 className="text-lg font-black text-white mt-1">Tu Escáner de Puerta (Admin)</h3>
                <p className="text-xs text-purple-200 max-w-lg leading-relaxed mt-0.5">
                  Como creador de "{event.title}", puedes abrir y operar el escáner de boletos directamente desde tu celular o computadora.
                </p>
              </div>
              <Link
                href={`/staff?event=${event.id}&key=${event.staffPin}&role=admin&name=${encodeURIComponent(event.creatorName || 'Organizador')}`}
                target="_blank"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
              >
                <Smartphone className="w-4 h-4" /> Abrir mi Escáner (Admin) 📱
              </Link>
            </div>
          </div>

          {/* 2. GENERADOR DE ENLACES PARA EL STAFF */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-purple-50 pb-4">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-600" /> Generador de Enlaces para Staff de Entrada
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Genera enlaces exclusivos para tu personal de puerta (ej. Puerta 1, Carlos, Taquilla). Al abrir el enlace en su celular, entrarán directamente a escanear este evento <strong>sin necesidad de crear cuentas ni pedir contraseñas</strong>.
              </p>
            </div>

            {/* Formulario para nuevo enlace */}
            <form onSubmit={handleAddScanner} className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Nombre o Ubicación del Colaborador</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej: Puerta Principal, Taquilla Norte, Carlos Staff"
                  value={newScannerInput}
                  onChange={(e) => setNewScannerInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-md shadow-purple-200 whitespace-nowrap transition-all"
                >
                  + Generar Enlace de Staff
                </button>
              </div>
            </form>

            {/* Listado de Enlaces Generados */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-800">
                Enlaces Activos para este Evento ({event.authorizedScanners.length}):
              </h3>

              {event.authorizedScanners.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-600">Aún no has generado enlaces para staff.</p>
                  <p className="text-[11px] text-slate-400">
                    Ingresa un nombre arriba para crear el primer enlace de acceso para tus colaboradores.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {event.authorizedScanners.map((sc, idx) => {
                    const staffUrl = getStaffLink(sc);
                    const isCopied = copiedLinkIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-2.5 transition-all hover:border-purple-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center">
                              ✓
                            </span>
                            <span className="font-extrabold text-xs text-slate-900">{sc}</span>
                            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-mono font-medium">
                              Staff Autorizado
                            </span>
                          </div>

                          <button
                            onClick={() => removeAuthorizedScanner(event.id, sc)}
                            className="text-slate-400 hover:text-pink-600 p-1 transition-colors text-xs flex items-center gap-1 font-semibold"
                            title="Revocar este enlace"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Revocar
                          </button>
                        </div>

                        {/* URL Box */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={staffUrl}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-600 select-all focus:outline-none"
                          />
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleCopyStaffLink(sc, idx)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${
                              isCopied
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {isCopied ? '¡Enlace Copiado! ✓' : 'Copiar Enlace'}
                          </button>

                          <a
                            href={getStaffWhatsAppShareLink(sc)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-2xs shadow-emerald-200 active:scale-95"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Mandar por WhatsApp 📲
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. CLAVE MAESTRA DEL EVENTO (SEGURIDAD) */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-purple-50 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-600" /> Clave Maestra de Seguridad del Evento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Todos los enlaces de staff generados utilizan esta clave. Si cambias o regeneras la clave maestra, <strong>todos los enlaces compartidos anteriormente quedarán invalidados de inmediato</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
                <span className="text-xs text-slate-500 font-medium">Clave Actual:</span>
                {pinEditMode ? (
                  <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                    className="bg-white border border-purple-300 rounded-lg px-2 py-0.5 text-xs font-mono font-bold uppercase w-24 text-slate-900 focus:outline-none"
                  />
                ) : (
                  <span className="font-mono font-extrabold text-sm text-purple-900 bg-purple-100/70 px-2.5 py-0.5 rounded-lg border border-purple-200">
                    {event.staffPin || 'SIN_PIN'}
                  </span>
                )}
              </div>

              {pinEditMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePin}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setPinEditMode(false);
                      setPinInput(event.staffPin || 'PRUE26');
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPinEditMode(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                  >
                    Modificar Clave
                  </button>
                  <button
                    onClick={handleRegenerateMasterPin}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    title="Invalida todos los enlaces anteriores"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerar y Revocar Anteriores
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODAL PARA VER FOTO DEL COMPROBANTE BANCARIO */}
      {receiptModalImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-purple-100">
            <div className="flex justify-between items-center border-b border-purple-50 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Comprobante de Pago Adjunto</h3>
              <button onClick={() => setReceiptModalImage(null)} className="text-slate-400 hover:text-slate-900 font-bold">✕</button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-2xl border border-purple-100">
              <img src={receiptModalImage} alt="Comprobante" className="w-full object-contain" />
            </div>

            <button
              onClick={() => setReceiptModalImage(null)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-2xl shadow-md shadow-purple-200"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
