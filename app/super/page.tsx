'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEventPassStore, formatWhatsAppPhone, getAppBaseUrl } from '@/lib/store';
import { OrganizerAccount } from '@/lib/types';
import { 
  Shield, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Smartphone, 
  ArrowUpRight, 
  Sparkles, 
  PhoneCall, 
  Search, 
  PlusCircle, 
  QrCode, 
  ExternalLink,
  Clock,
  Check,
  X,
  TrendingUp,
  Award,
  MessageSquare,
  Trash2,
  AlertCircle
} from 'lucide-react';

export default function SuperAdminPage() {
  const { 
    events, 
    applications, 
    registrations, 
    organizers,
    approveAndCreateOrganizer, 
    rejectApplication, 
    getPhoneFrequencyMetrics,
    clearRegistrations,
    clearAllData
  } = useEventPassStore();

  const [phoneSearch, setPhoneSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'paid' | 'free'>('all');
  const [lastApprovedInfo, setLastApprovedInfo] = useState<{ name: string; phone: string; pass: string; whatsappUrl?: string } | null>(null);

  const phoneMetrics = getPhoneFrequencyMetrics();
  const cleanSearch = phoneSearch.replace(/\D/g, '');
  const filteredMetrics = phoneMetrics.filter((m) => {
    if (!phoneSearch.trim()) return true;
    const matchPhone = cleanSearch && m.phone.includes(cleanSearch);
    const matchName = m.fullName.toLowerCase().includes(phoneSearch.toLowerCase());
    return matchPhone || matchName;
  });

  const pendingApps = applications.filter((a) => a.status === 'pending');
  const reviewedApps = applications.filter((a) => a.status !== 'pending');

  const totalAttended = registrations.filter((r) => r.status === 'attended').length;
  const totalInscribed = registrations.filter((r) => r.status === 'inscribed' || r.status === 'attended').length;

  const filteredEvents = events.filter((e) => {
    if (eventFilter === 'paid') return !e.isFree;
    if (eventFilter === 'free') return e.isFree;
    return true;
  });

  const handleApprove = (appId: string, name: string, phone: string) => {
    const res = approveAndCreateOrganizer(appId);
    if (res) {
      setLastApprovedInfo({
        name,
        phone,
        pass: res.password,
        whatsappUrl: res.whatsappUrl,
      });
      try {
        window.open(res.whatsappUrl, '_blank');
      } catch {
        // Fallback handled by direct banner button
      }
    }
  };

  const getOrganizerWhatsAppLink = (org: OrganizerAccount) => {
    const baseUrl = getAppBaseUrl();
    const message = `¡Hola ${org.name}! 🎉 Recordatorio de tus credenciales de organizador en EventPass:\n\n👉 ${baseUrl}/admin\n📱 Celular: ${org.phone}\n🔑 Contraseña: ${org.password}`;
    return `https://wa.me/${formatWhatsAppPhone(org.phone)}?text=${encodeURIComponent(message)}`;
  };

  const handleClearAttendees = async () => {
    if (confirm('¿Deseas vaciar la lista de todos los asistentes e inscripciones registradas? (Tus eventos y organizadores se conservarán)')) {
      await clearRegistrations();
      alert('¡Lista de asistentes vaciada con éxito!');
    }
  };

  const handleResetData = async () => {
    if (confirm('¿Estás seguro de que deseas vaciar todos los eventos, registros y solicitudes para empezar desde cero?')) {
      await clearAllData();
      alert('¡Datos vaciados con éxito! La plataforma está limpia para tus pruebas.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. MASTER HEADER & ACTION BAR */}
      <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-amber-100 border border-purple-200/80 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-purple-200 text-xs font-bold text-purple-900 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-purple-600" /> Centro de Control Maestro • Super Administrador
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Supervisión Global de la Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Aquí recibes las solicitudes de organizadores, autorizas su acceso y les envías sus contraseñas por WhatsApp. También supervisas los eventos y la recurrencia telefónica.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/evento/nuevo"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md shadow-purple-200 transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Publicar Evento
          </Link>
          <Link
            href="/admin"
            className="bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xs transition-all flex items-center gap-1.5"
          >
            Panel de Organizadores &rarr;
          </Link>
          <button
            onClick={handleClearAttendees}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Vaciar únicamente los registros de asistentes"
          >
            <Users className="w-3.5 h-3.5 text-amber-700" /> Vaciar Asistentes
          </button>
          <button
            onClick={handleResetData}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-1 cursor-pointer"
            title="Vaciar eventos y solicitudes para pruebas"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpiar Todo
          </button>
        </div>
      </div>

      {/* BANNER DE NOTIFICACIÓN DE APROBACIÓN EXITOSA CON WHATSAPP */}
      {lastApprovedInfo && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 shadow-sm animate-in zoom-in-95">
          <div className="space-y-0.5">
            <p className="font-extrabold text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ¡Organizador Aprobado con Éxito!
            </p>
            <p>
              Se dio de alta a <strong>{lastApprovedInfo.name}</strong> (+{lastApprovedInfo.phone}) con la contraseña:{' '}
              <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900">{lastApprovedInfo.pass}</strong>.
            </p>
            <p className="text-[11px] text-emerald-700">
              * Se intentó abrir WhatsApp con los datos de acceso. Si tu navegador bloqueó la ventana emergente, usa el botón directo:
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {lastApprovedInfo.whatsappUrl && (
              <a
                href={lastApprovedInfo.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Abrir WhatsApp 💬
              </a>
            )}
            <button
              onClick={() => setLastApprovedInfo(null)}
              className="text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 2. TOP METRICS ROW (4 KPI CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Eventos */}
        <div className="bg-white border border-purple-100 p-5 rounded-3xl shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700">Eventos Activos</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xs">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900">{events.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">
            {events.filter((e) => !e.isFree).length} de cobro • {events.filter((e) => e.isFree).length} gratuitos
          </span>
        </div>

        {/* Card 2: Registros por Celular */}
        <div className="bg-white border border-purple-100 p-5 rounded-3xl shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700">Personas Registradas</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs">
              <Smartphone className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900">{registrations.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">
            {phoneMetrics.length} celulares únicos registrados
          </span>
        </div>

        {/* Card 3: Acreditados en Puerta */}
        <div className="bg-white border border-purple-100 p-5 rounded-3xl shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Acreditados en Puerta</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalAttended}</p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {totalInscribed} inscritos pagados
          </span>
        </div>

        {/* Card 4: Solicitudes Pendientes */}
        <div className="bg-white border border-purple-100 p-5 rounded-3xl shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Solicitudes Productores</span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              pendingApps.length > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900">{pendingApps.length}</p>
          <span className={`text-[11px] font-semibold ${pendingApps.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {pendingApps.length > 0 ? 'Esperando tu aprobación' : 'Al día, sin pendientes'}
          </span>
        </div>

      </div>

      {/* 3. COCKPIT 2-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ======================================================== */}
        {/* COLUMNA IZQUIERDA (7/12): RECURRENCIA POR CELULAR & EVENTOS */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* BLOQUE A: RECURRENCIA POR CELULAR ENTRE EVENTOS */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-50 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Métrica Informativa Cruzada
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-purple-600" /> Recurrencia por Celular en Eventos
                </h2>
                <p className="text-xs text-slate-500">
                  Identifica qué números telefónicos coinciden en más de un evento de la plataforma.
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-60">
                <input
                  type="text"
                  placeholder="Buscar por celular o nombre..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-400 focus:bg-white transition-all font-mono"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-purple-50/50 text-slate-700 uppercase text-[10px] font-bold border-b border-purple-100">
                  <tr>
                    <th className="p-3">Celular (Ancla)</th>
                    <th className="p-3">Asistente</th>
                    <th className="p-3 text-center">Frecuencia</th>
                    <th className="p-3">Eventos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {filteredMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        {registrations.length === 0 
                          ? 'Aún no hay registros en la plataforma. Regístrate en un evento para ver la métrica aquí.'
                          : `No se encontraron coincidencias para "${phoneSearch}"`}
                      </td>
                    </tr>
                  ) : (
                    filteredMetrics.map((item, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-purple-900">
                          +{item.phone}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{item.fullName}</p>
                          <p className="text-[10px] text-slate-400">{item.email}</p>
                        </td>
                        <td className="p-3 text-center">
                          {item.eventsCount > 1 ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-amber-300">
                              <Award className="w-3 h-3 text-amber-600" /> {item.eventsCount} eventos
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              1 evento
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {item.eventsList.map((evName, i) => (
                              <span
                                key={i}
                                className="bg-purple-50 text-purple-800 text-[10px] px-2 py-0.5 rounded-md border border-purple-200 font-medium"
                              >
                                {evName}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BLOQUE B: MONITOR GLOBAL DE EVENTOS */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-50 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" /> Monitor Global de Eventos
                </h2>
                <p className="text-xs text-slate-500">
                  Eventos creados por todos los organizadores en la plataforma.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setEventFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    eventFilter === 'all' ? 'bg-purple-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({events.length})
                </button>
                <button
                  onClick={() => setEventFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    eventFilter === 'paid' ? 'bg-purple-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  De Cobro
                </button>
                <button
                  onClick={() => setEventFilter('free')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    eventFilter === 'free' ? 'bg-purple-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gratuitos
                </button>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-sm text-slate-800">No hay eventos en la plataforma todavía</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Los eventos aparecerán aquí tan pronto como un organizador aprobado o tú publiquen uno.
                </p>
                <Link
                  href="/admin/evento/nuevo"
                  className="inline-block mt-2 bg-purple-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                >
                  + Publicar Primer Evento
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredEvents.map((evt) => {
                  const confirmedForEvt = registrations.filter(
                    (r) => r.eventId === evt.id && (r.status === 'inscribed' || r.status === 'attended')
                  ).length;
                  const percent = Math.min(100, Math.round((confirmedForEvt / evt.capacity) * 100));

                  return (
                    <div
                      key={evt.id}
                      className="p-4 rounded-2xl bg-slate-50/60 border border-purple-100 hover:border-purple-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full border border-purple-200">
                            {evt.category}
                          </span>
                          <h3 className="font-extrabold text-sm text-slate-900">{evt.title}</h3>
                          <span className="text-xs font-bold text-slate-700">
                            {evt.isFree ? '• Gratis' : `• $${evt.price} MXN`}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          Productor: <strong className="text-slate-700">{evt.creatorName}</strong> • {evt.date} • {evt.location}
                        </p>

                        <div className="w-full max-w-xs space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>Aforo confirmado: {confirmedForEvt} de {evt.capacity}</span>
                            <span className="font-bold text-purple-700">{percent}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/admin/evento?id=${evt.id}`}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                        >
                          Gestionar Pagos & QR &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ======================================================== */}
        {/* COLUMNA DERECHA (5/12): BANDEJA DE SOLICITUDES & PRODUCTORES */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* BANDEJA DE SOLICITUDES DE ORGANIZADORES */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-purple-50 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Flujo de Productores
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" /> Solicitudes ({pendingApps.length} pendientes)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aprueba con 1 clic para generar la contraseña y abrir WhatsApp automáticamente.
                </p>
              </div>
            </div>

            {pendingApps.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">¡Bandeja sin pendientes!</p>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Cuando alguien llene el formulario de <Link href="/solicitar-organizador" className="text-purple-600 underline font-semibold">/solicitar-organizador</Link>, te aparecerá aquí de inmediato.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900">{app.userName}</h4>
                        <p className="text-xs text-slate-600 font-mono mt-0.5">
                          📱 Celular: <strong className="text-purple-900">+{app.phone}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                        Pendiente
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-amber-100 text-xs text-slate-600 space-y-1">
                      <p className="text-[11px] text-slate-400">Acción al dar clic en Aprobar:</p>
                      <p className="text-[11px] font-medium text-slate-700">
                        1. Se registra como organizador autorizado en el sistema.<br />
                        2. Se genera su contraseña de acceso.<br />
                        3. Se abre WhatsApp automáticamente para enviársela.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-100">
                      <button
                        onClick={() => rejectApplication(app.id)}
                        className="text-slate-500 hover:text-slate-800 font-semibold text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleApprove(app.id, app.userName, app.phone)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Aprobar y Enviar WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ORGANIZADORES YA APROBADOS */}
            {organizers.length > 0 && (
              <div className="pt-3 border-t border-purple-50 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Organizadores Autorizados ({organizers.length})
                </span>
                <div className="space-y-2">
                  {organizers.map((org) => (
                    <div key={org.phone} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{org.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">Celular: +{org.phone}</p>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Contraseña:</span>
                          <code className="text-[11px] font-bold text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200 font-mono">
                            {org.password}
                          </code>
                        </div>
                        <a
                          href={getOrganizerWhatsAppLink(org)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl transition-all shadow-xs"
                          title="Enviar o reenviar credenciales de acceso por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp 💬
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ÚLTIMOS REGISTROS EN EL SISTEMA */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="border-b border-purple-50 pb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                En Vivo
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" /> Registros de Asistentes
              </h2>
            </div>

            {registrations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No hay registros de asistentes aún.
              </p>
            ) : (
              <div className="space-y-2.5">
                {registrations.slice(0, 5).map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3 rounded-2xl bg-slate-50/70 border border-purple-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{reg.fullName}</p>
                      <p className="text-[11px] text-purple-700 font-mono">+{reg.phone}</p>
                      <p className="text-[10px] text-slate-400">{reg.eventTitle}</p>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        reg.status === 'inscribed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : reg.status === 'attended'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {reg.status === 'inscribed' ? 'Inscrito QR' : reg.status === 'attended' ? 'Acreditado' : 'Por Pagar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
