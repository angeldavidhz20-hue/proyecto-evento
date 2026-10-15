import { NextResponse } from 'next/server';
import {
  getAllData,
  saveEvent,
  deleteEvent,
  saveRegistration,
  updateRegistrationStatus,
  clearAllRegistrations,
  saveApplication,
  saveOrganizer,
  clearDatabase,
} from '@/lib/sqlite';

// Forzar renderizado dinámico para que las consultas a SQLite siempre sean frescas
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getAllData();
    return NextResponse.json({
      success: true,
      provider: 'sqlite',
      ...data,
    });
  } catch (error: any) {
    console.error('[SQLite GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al consultar SQLite' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case 'saveEvent': {
        if (!payload?.event) {
          return NextResponse.json({ success: false, message: 'Falta payload.event' }, { status: 400 });
        }
        const saved = saveEvent(payload.event);
        return NextResponse.json({ success: true, event: saved });
      }

      case 'deleteEvent': {
        if (!payload?.id) {
          return NextResponse.json({ success: false, message: 'Falta payload.id' }, { status: 400 });
        }
        const deleted = deleteEvent(payload.id);
        return NextResponse.json({ success: true, deleted });
      }

      case 'saveRegistration': {
        if (!payload?.registration) {
          return NextResponse.json({ success: false, message: 'Falta payload.registration' }, { status: 400 });
        }
        const saved = saveRegistration(payload.registration);
        return NextResponse.json({ success: true, registration: saved });
      }

      case 'updateRegistration': {
        if (!payload?.id || !payload?.updates) {
          return NextResponse.json({ success: false, message: 'Faltan id o updates' }, { status: 400 });
        }
        const updated = updateRegistrationStatus(payload.id, payload.updates);
        return NextResponse.json({ success: true, updated });
      }

      case 'clearRegistrations': {
        clearAllRegistrations();
        return NextResponse.json({ success: true, message: 'Inscripciones vaciadas con éxito' });
      }

      case 'saveApplication': {
        if (!payload?.application) {
          return NextResponse.json({ success: false, message: 'Falta payload.application' }, { status: 400 });
        }
        const saved = saveApplication(payload.application);
        return NextResponse.json({ success: true, application: saved });
      }

      case 'saveOrganizer': {
        if (!payload?.organizer) {
          return NextResponse.json({ success: false, message: 'Falta payload.organizer' }, { status: 400 });
        }
        const saved = saveOrganizer(payload.organizer);
        if (payload.application) {
          saveApplication(payload.application);
        }
        return NextResponse.json({ success: true, organizer: saved });
      }

      case 'clearAll': {
        clearDatabase();
        return NextResponse.json({ success: true, message: 'Base de datos SQLite limpiada completamente' });
      }

      case 'syncAll': {
        if (payload?.events && Array.isArray(payload.events)) {
          for (const ev of payload.events) saveEvent(ev);
        }
        if (payload?.registrations && Array.isArray(payload.registrations)) {
          for (const r of payload.registrations) saveRegistration(r);
        }
        if (payload?.applications && Array.isArray(payload.applications)) {
          for (const a of payload.applications) saveApplication(a);
        }
        if (payload?.organizers && Array.isArray(payload.organizers)) {
          for (const o of payload.organizers) saveOrganizer(o);
        }
        const freshData = getAllData();
        return NextResponse.json({ success: true, ...freshData });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Acción desconocida: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[SQLite POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error en operación SQLite' },
      { status: 500 }
    );
  }
}
