'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminEventClient from './[id]/AdminEventClient';
import Link from 'next/link';

function AdminEventQueryHandler() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';

  if (!id) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Evento no especificado</h2>
        <p className="text-xs text-slate-500">Por favor selecciona un evento desde tu panel de administración.</p>
        <Link href="/admin" className="inline-block bg-purple-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
          Ir a Mis Eventos
        </Link>
      </div>
    );
  }

  return <AdminEventClient id={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Cargando panel de evento...</div>}>
      <AdminEventQueryHandler />
    </Suspense>
  );
}
