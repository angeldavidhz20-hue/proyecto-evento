'use client';

import Link from 'next/link';
import { useEventPassStore } from '@/lib/store';
import { 
  Sparkles, 
  Calendar, 
  PlusCircle, 
  Users, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  ExternalLink,
  CheckCircle2,
  Clock,
  DollarSign,
  UserCheck
} from 'lucide-react';

export default function AdminHubPage() {
  const { events, registrations } = useEventPassStore();

  const totalRegistered = registrations.filter((r) => r.status === 'registered').length;
  const totalInscribed = registrations.filter((r) => r.status === 'inscribed' || r.status === 'attended').length;
  const totalAttended = registrations.filter((r) => r.status === 'attended').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Banner / Hero Backoffice */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-8 sm:p-10 shadow-lg shadow-purple-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-purple-100 backdrop-blur-xs">
            <UserCheck className="w-3.5 h-3.5 text-pink-300" /> Panel de Organizador
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gestión de Mis Eventos
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-normal">
            Aquí publicas tus eventos, revisas los comprobantes de transferencia que te envían tus asistentes y les confirmas su boleto digital con código QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/evento/nuevo"
            className="bg-white hover:bg-purple-50 text-purple-900 font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 text-purple-600" /> Publicar Nuevo Evento
          </Link>
          <Link
            href="/"
            className="bg-purple-900/40 hover:bg-purple-900/60 border border-purple-400/30 text-purple-100 font-semibold text-xs sm:text-sm px-4 py-3 rounded-2xl transition-all flex items-center gap-1.5"
          >
            Ver Catálogo Público <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm shadow-purple-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold">Pagos por Verificar</span>
            <p className="text-2xl font-black text-amber-600">{totalRegistered}</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm shadow-purple-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold">Inscritos con QR Activo</span>
            <p className="text-2xl font-black text-emerald-600">{totalInscribed}</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm shadow-purple-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold">Acreditados en Puerta</span>
            <p className="text-2xl font-black text-purple-700">{totalAttended}</p>
          </div>
        </div>
      </div>

      {/* Events Management List */}
      <div className="bg-white border border-purple-100 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tus Eventos Activos</h2>
            <p className="text-xs text-slate-500">
              Selecciona tu evento para revisar quién ya pagó y enviarles su código QR.
            </p>
          </div>
          <Link
            href="/admin/evento/nuevo"
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 self-start sm:self-auto"
          >
            + Publicar Otro Evento
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 border border-purple-100 rounded-2xl space-y-3">
            <Calendar className="w-10 h-10 text-purple-300 mx-auto" />
            <h3 className="font-bold text-base text-slate-800">Aún no has publicado ningún evento</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Crea tu primer evento para definir el precio, tus datos bancarios y el mensaje personalizado de cobro para tus asistentes.
            </p>
            <div className="pt-2">
              <Link
                href="/admin/evento/nuevo"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                + Crear Mi Primer Evento
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {events.map((evt) => {
              const pendingForEvt = registrations.filter(
                (r) => r.eventId === evt.id && r.status === 'registered'
              ).length;
              const confirmedForEvt = registrations.filter(
                (r) => r.eventId === evt.id && (r.status === 'inscribed' || r.status === 'attended')
              ).length;

              return (
                <div
                  key={evt.id}
                  className="bg-slate-50/70 border border-purple-100 rounded-3xl p-5 hover:border-purple-300 transition-all flex flex-col justify-between space-y-4 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                        {evt.category}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {evt.isFree ? 'Gratis' : `$${evt.price} MXN`}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 leading-snug">{evt.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" /> {evt.date} • {evt.time}
                    </p>
                    
                    <div className="pt-2 flex items-center gap-3 text-xs">
                      <span className="bg-amber-100/80 text-amber-900 font-semibold px-2.5 py-1 rounded-xl">
                        {pendingForEvt} por verificar
                      </span>
                      <span className="bg-emerald-100/80 text-emerald-900 font-semibold px-2.5 py-1 rounded-xl">
                        {confirmedForEvt} confirmados
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100/80 flex items-center justify-between">
                    <Link
                      href={`/evento?id=${evt.id}`}
                      target="_blank"
                      className="text-xs text-slate-500 hover:text-purple-700 flex items-center gap-1 font-medium"
                    >
                      Ver en Catálogo <ExternalLink className="w-3 h-3" />
                    </Link>

                    <Link
                      href={`/admin/evento?id=${evt.id}`}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
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

      {/* Staff Scanner Tool */}
      <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
          📱
        </div>
        <h3 className="text-base font-bold text-slate-900">Lector de Boletos en Puerta (PWA)</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Accede al escáner de cámara para validar el acceso de tus asistentes en la puerta de tu evento.
        </p>
        {events.length > 0 ? (
          <Link
            href={`/staff?event=${events[0].id}&key=${events[0].staffPin}&role=admin&name=${encodeURIComponent(events[0].creatorName || 'Organizador')}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 transition-colors"
          >
            Abrir mi Escáner ({events[0].title}) &rarr;
          </Link>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Crea tu primer evento arriba para activar tu lector de boletos.
          </p>
        )}
      </div>

    </div>
  );
}
