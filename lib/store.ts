'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  Event,
  PersonRegistration,
  OrganizerApplication,
  OrganizerAccount,
  UserRole,
} from './types';

// ==============================================================
// CONFIGURACIÓN DE BASE DE DATOS ACTIVA
// 'sqlite': Base de datos local SQLite (Next.js API routes)
// 'firebase': Base de datos en la nube Firebase Firestore
// ==============================================================
export type DataProviderType = 'sqlite' | 'firebase';

export const ACTIVE_DATA_PROVIDER: DataProviderType =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER as DataProviderType) || 'sqlite';

/**
 * Cliente HTTP ligero para mutaciones atómicas en SQLite
 */
async function callSqliteApi(action: string, payload?: any) {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[SQLite API error]:', err);
    return null;
  }
}

// DATA INICIAL LIMPIA (Vacía para que el usuario pruebe desde cero)
const INITIAL_EVENTS: Event[] = [];
const INITIAL_REGISTRATIONS: PersonRegistration[] = [];
const INITIAL_APPLICATIONS: OrganizerApplication[] = [];
const INITIAL_ORGANIZERS: OrganizerAccount[] = [];

/**
 * Normaliza cualquier número de teléfono al formato internacional requerido por WhatsApp (wa.me).
 * Si el número tiene 10 dígitos (estándar en México), antepone automáticamente el código de país '52'.
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '';

  // Si tiene 10 dígitos (ej. 5512345678 en México), agregamos 52
  if (clean.length === 10) {
    return `52${clean}`;
  }

  // Si tiene 11 dígitos y empieza con 0 (antiguo prefijo local en México):
  if (clean.length === 11 && clean.startsWith('0')) {
    return `52${clean.slice(1)}`;
  }

  // Si ya tiene 12 dígitos y empieza con 52 (52 + 10 dígitos)
  if (clean.length === 12 && clean.startsWith('52')) {
    return clean;
  }

  // Si tiene 13 dígitos y empieza con 521 (521 + 10 dígitos formato legacy WhatsApp México)
  if (clean.length === 13 && clean.startsWith('521')) {
    return clean;
  }

  return clean;
}

/**
 * Compara dos números de teléfono de forma flexible, soportando variaciones
 * de código de país (ej. 52, 521), espacios o guiones.
 */
export function matchPhoneNumbers(phoneA?: string, phoneB?: string): boolean {
  if (!phoneA || !phoneB) return false;
  const a = phoneA.replace(/\D/g, '');
  const b = phoneB.replace(/\D/g, '');
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Comparar los últimos 10 dígitos (longitud estándar nacional en México y Norteamérica)
  if (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10)) {
    return true;
  }
  return false;
}

/**
 * Obtiene la URL base de la aplicación.
 * Si se ejecuta en localhost o entorno local, retorna la URL pública oficial en producción
 * para que los enlaces compartidos por WhatsApp siempre funcionen en celulares externos.
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // En modo SQLite local, respetar el origen de la máquina o red local
    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      return origin;
    }
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://eventpass-4f1c9.web.app';
    }
    return origin;
  }
  return ACTIVE_DATA_PROVIDER === 'sqlite' ? 'http://localhost:3000' : 'https://eventpass-4f1c9.web.app';
}

/**
 * Elimina recursivamente todas las propiedades con valor undefined
 * para evitar que Firestore lance un error al guardar documentos.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function useEventPassStore() {
  const [currentRole, setCurrentRole] = useState<UserRole>('attendee');
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [registrations, setRegistrations] = useState<PersonRegistration[]>(INITIAL_REGISTRATIONS);
  const [applications, setApplications] = useState<OrganizerApplication[]>(INITIAL_APPLICATIONS);
  const [organizers, setOrganizers] = useState<OrganizerAccount[]>(INITIAL_ORGANIZERS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFirebaseOnline, setIsFirebaseOnline] = useState(false);

  // Initialize store and sync with Firebase Firestore / localStorage
  useEffect(() => {
    async function init() {
      try {
        const storedRole = localStorage.getItem('ep_role') as UserRole;
        if (storedRole) setCurrentRole(storedRole);

        let loadedEvents: Event[] = [];
        let loadedRegs: PersonRegistration[] = [];
        let loadedApps: OrganizerApplication[] = [];
        let loadedOrgs: OrganizerAccount[] = [];

        // 1. Cargar datos según el proveedor activo
        if (ACTIVE_DATA_PROVIDER === 'sqlite') {
          try {
            const res = await fetch('/api/data', { cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                loadedEvents = data.events || [];
                loadedRegs = data.registrations || [];
                loadedApps = data.applications || [];
                loadedOrgs = data.organizers || [];
                setIsFirebaseOnline(true);

                // Si SQLite está vacío pero teníamos datos en localStorage, sincronizar
                if (
                  typeof window !== 'undefined' &&
                  loadedEvents.length === 0 &&
                  loadedRegs.length === 0
                ) {
                  const cachedEvents = localStorage.getItem('ep_events_v2');
                  const cachedRegs = localStorage.getItem('ep_registrations_v2');
                  const cachedApps = localStorage.getItem('ep_applications_v2');
                  const cachedOrgs = localStorage.getItem('ep_organizers_v2');

                  if (cachedEvents || cachedRegs || cachedApps || cachedOrgs) {
                    const toSync = {
                      events: cachedEvents ? JSON.parse(cachedEvents) : [],
                      registrations: cachedRegs ? JSON.parse(cachedRegs) : [],
                      applications: cachedApps ? JSON.parse(cachedApps) : [],
                      organizers: cachedOrgs ? JSON.parse(cachedOrgs) : [],
                    };
                    await callSqliteApi('syncAll', toSync);
                    loadedEvents = toSync.events;
                    loadedRegs = toSync.registrations;
                    loadedApps = toSync.applications;
                    loadedOrgs = toSync.organizers;
                  }
                }
              }
            }
          } catch (sqlErr) {
            console.warn('[SQLite fetch error, fallback localStorage]:', sqlErr);
          }
        } else if (ACTIVE_DATA_PROVIDER === 'firebase' && db && isFirebaseConfigured) {
          try {
            const eventsSnap = await getDocs(collection(db, 'events'));
            if (!eventsSnap.empty) {
              loadedEvents = eventsSnap.docs.map((d) => d.data() as Event);
            }

            const regsSnap = await getDocs(collection(db, 'registrations'));
            if (!regsSnap.empty) {
              loadedRegs = regsSnap.docs.map((d) => d.data() as PersonRegistration);
            }

            const appsSnap = await getDocs(collection(db, 'applications'));
            if (!appsSnap.empty) {
              loadedApps = appsSnap.docs.map((d) => d.data() as OrganizerApplication);
            }

            const orgsSnap = await getDocs(collection(db, 'organizers'));
            if (!orgsSnap.empty) {
              loadedOrgs = orgsSnap.docs.map((d) => d.data() as OrganizerAccount);
            }

            setIsFirebaseOnline(true);
          } catch (fbErr) {
            console.info('Firestore offline/fallback cache:', fbErr);
          }
        }

        // 2. LocalStorage fallback
        if (typeof window !== 'undefined') {
          const storedRegs = localStorage.getItem('ep_registrations_v2');
          if (storedRegs && loadedRegs.length === 0) loadedRegs = JSON.parse(storedRegs);

          const storedEvents = localStorage.getItem('ep_events_v2');
          if (storedEvents && loadedEvents.length === 0) loadedEvents = JSON.parse(storedEvents);

          const storedApps = localStorage.getItem('ep_applications_v2');
          if (storedApps && loadedApps.length === 0) loadedApps = JSON.parse(storedApps);

          const storedOrgs = localStorage.getItem('ep_organizers_v2');
          if (storedOrgs && loadedOrgs.length === 0) loadedOrgs = JSON.parse(storedOrgs);
        }

        setEvents(loadedEvents);
        setRegistrations(loadedRegs);
        setApplications(loadedApps);
        setOrganizers(loadedOrgs);
      } catch (err) {
        console.error('Store initialization error:', err);
      } finally {
        setIsLoaded(true);
      }
    }
    init();

    // 3. Suscripción en tiempo real (Polling para SQLite o onSnapshot para Firebase)
    let unsubRegs = () => {};
    let unsubEvents = () => {};
    let unsubApps = () => {};
    let unsubOrgs = () => {};
    let sqlitePollInterval: any = null;

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      sqlitePollInterval = setInterval(async () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          return;
        }
        try {
          const res = await fetch('/api/data', { cache: 'no-store' });
          if (res.ok) {
            const fresh = await res.json();
            if (fresh.success) {
              setEvents(fresh.events || []);
              setRegistrations(fresh.registrations || []);
              setApplications(fresh.applications || []);
              setOrganizers(fresh.organizers || []);
              setIsFirebaseOnline(true);
            }
          }
        } catch {}
      }, 3500);
    } else if (ACTIVE_DATA_PROVIDER === 'firebase' && db && isFirebaseConfigured) {
      try {
        unsubRegs = onSnapshot(collection(db, 'registrations'), (snap) => {
          const freshRegs = snap.docs.map((d) => d.data() as PersonRegistration);
          setRegistrations(freshRegs);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ep_registrations_v2', JSON.stringify(freshRegs));
          }
        });

        unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
          const freshEvents = snap.docs.map((d) => d.data() as Event);
          setEvents(freshEvents);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ep_events_v2', JSON.stringify(freshEvents));
          }
        });

        unsubApps = onSnapshot(collection(db, 'applications'), (snap) => {
          const freshApps = snap.docs.map((d) => d.data() as OrganizerApplication);
          setApplications(freshApps);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ep_applications_v2', JSON.stringify(freshApps));
          }
        });

        unsubOrgs = onSnapshot(collection(db, 'organizers'), (snap) => {
          const freshOrgs = snap.docs.map((d) => d.data() as OrganizerAccount);
          setOrganizers(freshOrgs);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ep_organizers_v2', JSON.stringify(freshOrgs));
          }
        });
      } catch (err) {
        console.warn('Realtime subscription error:', err);
      }
    }

    return () => {
      if (sqlitePollInterval) clearInterval(sqlitePollInterval);
      unsubRegs();
      unsubEvents();
      unsubApps();
      unsubOrgs();
    };
  }, []);

  const saveRegistrations = (updated: PersonRegistration[]) => {
    setRegistrations(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ep_registrations_v2', JSON.stringify(updated));
    }
  };

  const saveEvents = (updated: Event[]) => {
    setEvents(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ep_events_v2', JSON.stringify(updated));
    }
  };

  const saveApplications = (updated: OrganizerApplication[]) => {
    setApplications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ep_applications_v2', JSON.stringify(updated));
    }
  };

  const saveOrganizers = (updated: OrganizerAccount[]) => {
    setOrganizers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ep_organizers_v2', JSON.stringify(updated));
    }
  };

  // Función para vaciar únicamente las inscripciones de asistentes
  const clearRegistrations = async () => {
    setRegistrations([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ep_registrations_v2');
      localStorage.removeItem('ep_registrations');
    }
    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('clearRegistrations');
    } else if (db && isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'registrations'));
        for (const docSnap of snap.docs) {
          deleteDoc(docSnap.ref).catch(() => {});
        }
      } catch (err) {
        console.warn('Error clearing registrations from Firestore:', err);
      }
    }
  };

  // Función para vaciar completamente los datos de prueba
  const clearAllData = async () => {
    setEvents([]);
    setRegistrations([]);
    setApplications([]);
    setOrganizers([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ep_registrations_v2');
      localStorage.removeItem('ep_events_v2');
      localStorage.removeItem('ep_applications_v2');
      localStorage.removeItem('ep_organizers_v2');
      localStorage.removeItem('ep_registrations');
      localStorage.removeItem('ep_events');
    }
    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('clearAll');
    } else if (db && isFirebaseConfigured) {
      try {
        const collectionsToClear = ['registrations', 'events', 'applications', 'organizers'];
        for (const colName of collectionsToClear) {
          const snap = await getDocs(collection(db, colName));
          for (const docSnap of snap.docs) {
            deleteDoc(docSnap.ref).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Error clearing Firestore collections:', err);
      }
    }
  };

  // 1. REGISTRAR PERSONA USANDO EL CELULAR COMO ANCLA
  const registerPerson = async (
    eventId: string,
    fullName: string,
    rawPhone: string,
    email: string,
    preferredChannel: 'whatsapp' | 'email'
  ): Promise<{ registration: PersonRegistration; isAlreadyRegistered: boolean }> => {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const event = events.find((e) => e.id === eventId);
    if (!event) throw new Error('Evento no encontrado');

    const existing = registrations.find(
      (r) => r.eventId === eventId && matchPhoneNumbers(r.phone, cleanPhone)
    );

    if (existing) {
      return { registration: existing, isAlreadyRegistered: true };
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const regId = `REG-${event.staffPin || 'EVT'}-${randomSuffix}`;
    const paymentRef = `REF-${event.staffPin || 'PAG'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isFree = event.isFree;
    let qrDataUrl: string | undefined = undefined;

    if (isFree) {
      qrDataUrl = await QRCode.toDataURL(regId, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }

    const newReg: PersonRegistration = {
      id: regId,
      eventId: event.id,
      eventTitle: event.title,
      phone: cleanPhone,
      fullName,
      email,
      preferredChannel,
      status: isFree ? 'inscribed' : 'registered',
      paymentReference: paymentRef,
      qrDataUrl,
      registeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      inscribedAt: isFree ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };

    const updated = [newReg, ...registrations];
    saveRegistrations(updated);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('saveRegistration', { registration: newReg });
    } else if (db && isFirebaseConfigured) {
      try {
        setDoc(doc(db, 'registrations', newReg.id), sanitizeForFirestore(newReg)).catch((e) =>
          console.warn('Firestore write warning:', e)
        );
      } catch (e) {
        console.warn('Firestore write warning exception:', e);
      }
    }

    return { registration: newReg, isAlreadyRegistered: false };
  };

  // 2. ADJUNTAR COMPROBANTE DE PAGO
  const attachPaymentReceipt = (registrationId: string, receiptBase64OrUrl: string) => {
    const updated = registrations.map((r) =>
      r.id === registrationId ? { ...r, paymentReceiptImage: receiptBase64OrUrl } : r
    );
    saveRegistrations(updated);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('updateRegistration', {
        id: registrationId,
        updates: { paymentReceiptImage: receiptBase64OrUrl },
      });
    } else if (db && isFirebaseConfigured) {
      updateDoc(doc(db, 'registrations', registrationId), {
        paymentReceiptImage: receiptBase64OrUrl,
      }).catch((e) => console.warn('Firestore update warning:', e));
    }
  };

  // 3. ADMIN CONFIRMA PAGO -> PASA A 'INSCRIBED' Y GENERA QR
  const confirmPaymentAndInscribe = async (
    registrationId: string
  ): Promise<PersonRegistration | null> => {
    const target = registrations.find((r) => r.id === registrationId);
    if (!target) return null;

    const qrDataUrl = await QRCode.toDataURL(target.id, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let updatedTarget: PersonRegistration | null = null;
    const updated = registrations.map((r) => {
      if (r.id === registrationId) {
        updatedTarget = {
          ...r,
          status: 'inscribed' as const,
          inscribedAt: now,
          qrDataUrl,
        };
        return updatedTarget;
      }
      return r;
    });

    saveRegistrations(updated);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('updateRegistration', {
        id: registrationId,
        updates: {
          status: 'inscribed',
          inscribedAt: now,
          qrDataUrl,
        },
      });
    } else if (db && isFirebaseConfigured) {
      updateDoc(doc(db, 'registrations', registrationId), {
        status: 'inscribed',
        inscribedAt: now,
        qrDataUrl,
      }).catch((e) => console.warn('Firestore update warning:', e));
    }

    return updatedTarget;
  };

  // 4. AUTORIZAR LECTORES DE QR
  const addAuthorizedScanner = (eventId: string, scannerIdentifier: string) => {
    const cleanId = scannerIdentifier.trim().toLowerCase();
    const updated = events.map((e) => {
      if (e.id === eventId) {
        if (e.authorizedScanners.includes(cleanId)) return e;
        return { ...e, authorizedScanners: [...e.authorizedScanners, cleanId] };
      }
      return e;
    });
    saveEvents(updated);

    const targetEvt = updated.find((e) => e.id === eventId);
    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      if (targetEvt) callSqliteApi('saveEvent', { event: targetEvt });
    } else if (targetEvt && db && isFirebaseConfigured) {
      setDoc(doc(db, 'events', eventId), targetEvt).catch((e) =>
        console.warn('Firestore sync warning:', e)
      );
    }
  };

  const removeAuthorizedScanner = (eventId: string, scannerIdentifier: string) => {
    const updated = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          authorizedScanners: e.authorizedScanners.filter((s) => s !== scannerIdentifier),
        };
      }
      return e;
    });
    saveEvents(updated);

    const targetEvt = updated.find((e) => e.id === eventId);
    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      if (targetEvt) callSqliteApi('saveEvent', { event: targetEvt });
    } else if (targetEvt && db && isFirebaseConfigured) {
      setDoc(doc(db, 'events', eventId), targetEvt).catch((e) =>
        console.warn('Firestore sync warning:', e)
      );
    }
  };

  // 5. VALIDAR QR EN PUERTA
  const verifyAndCheckInQR = async (
    scannedId: string,
    scannerIdentifier: string = 'Staff',
    eventId?: string
  ): Promise<{
    success: boolean;
    code: 'valid' | 'already_attended' | 'not_inscribed' | 'pending_payment' | 'wrong_event' | 'unauthorized_scanner';
    attendee?: PersonRegistration;
    eventName?: string;
    message?: string;
  }> => {
    const rawId = (scannedId || '').trim();
    // Si el QR contenía una URL, extraer el folio final
    const cleanId = rawId.includes('/') ? rawId.split('/').pop()!.trim() : rawId;

    if (!cleanId) {
      return { success: false, code: 'not_inscribed', message: 'Código QR no legible o vacío' };
    }

    // 1. Buscar en registros locales
    let reg = registrations.find(
      (r) => r.id.trim().toUpperCase() === cleanId.toUpperCase()
    );

    // 2. Si no está en memoria local, consultar SQLite o Firestore
    if (!reg && ACTIVE_DATA_PROVIDER === 'sqlite') {
      try {
        const res = await fetch('/api/data', { cache: 'no-store' });
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.success && fresh.registrations) {
            reg = fresh.registrations.find(
              (r: PersonRegistration) => r.id.trim().toUpperCase() === cleanId.toUpperCase()
            );
            if (reg) {
              setRegistrations(fresh.registrations);
            }
          }
        }
      } catch (err) {
        console.warn('Error consultando SQLite:', err);
      }
    } else if (!reg && db && isFirebaseConfigured) {
      try {
        const docSnap = await getDoc(doc(db, 'registrations', cleanId));
        if (docSnap.exists()) {
          reg = docSnap.data() as PersonRegistration;
          setRegistrations((prev) => [reg!, ...prev.filter((p) => p.id !== reg!.id)]);
        }
      } catch (err) {
        console.warn('Error consultando Firestore:', err);
      }
    }

    if (!reg) {
      return {
        success: false,
        code: 'not_inscribed',
        message: 'Boleto no encontrado en el sistema',
      };
    }

    // 3. Buscar el evento correspondiente
    let targetEvent = events.find((e) => e.id === reg!.eventId);
    if (!targetEvent && db && isFirebaseConfigured) {
      try {
        const evtSnap = await getDoc(doc(db, 'events', reg!.eventId));
        if (evtSnap.exists()) {
          targetEvent = evtSnap.data() as Event;
        }
      } catch (err) {
        console.warn('Error consultando evento:', err);
      }
    }

    // 4. Si el staff seleccionó un evento específico y este boleto es de otro evento:
    if (eventId && eventId !== 'all' && reg.eventId !== eventId) {
      return {
        success: false,
        code: 'wrong_event',
        attendee: reg,
        eventName: targetEvent?.title,
        message: `Este boleto pertenece al evento "${targetEvent?.title || 'otro evento'}".`,
      };
    }

    // 5. Validar estado del boleto
    if (reg.status === 'registered') {
      return {
        success: false,
        code: 'pending_payment',
        attendee: reg,
        eventName: targetEvent?.title,
        message: 'Boleto pendiente de verificación de pago.',
      };
    }

    if (reg.status === 'attended') {
      return {
        success: false,
        code: 'already_attended',
        attendee: reg,
        eventName: targetEvent?.title,
        message: `Boleto ya utilizado previamente a las ${reg.attendedAt || 'hoy'}.`,
      };
    }

    // 6. ¡BOLETO VÁLIDO! Marcar como 'attended'
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedAttendee: PersonRegistration = {
      ...reg,
      status: 'attended',
      attendedAt: now,
      attendedByScanner: scannerIdentifier || 'Staff en Puerta',
    };

    const updated = registrations.map((r) =>
      r.id === reg!.id ? updatedAttendee : r
    );
    saveRegistrations(updated);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('updateRegistration', {
        id: reg.id,
        updates: {
          status: 'attended',
          attendedAt: now,
          attendedByScanner: scannerIdentifier || 'Staff en Puerta',
        },
      });
    } else if (db && isFirebaseConfigured) {
      try {
        updateDoc(doc(db, 'registrations', reg.id), {
          status: 'attended',
          attendedAt: now,
          attendedByScanner: scannerIdentifier || 'Staff en Puerta',
        }).catch((e) => console.warn('Firestore check-in warning:', e));
      } catch (e) {
        console.warn('Firestore update exception:', e);
      }
    }

    return {
      success: true,
      code: 'valid',
      attendee: updatedAttendee,
      eventName: targetEvent?.title,
      message: '¡Ingreso Autorizado!',
    };
  };

  // 6. FRECUENCIA POR CELULAR (SUPER ADMIN)
  const getPhoneFrequencyMetrics = () => {
    const phoneMap: Record<
      string,
      { phone: string; fullName: string; email: string; events: Set<string> }
    > = {};

    registrations.forEach((r) => {
      const p = r.phone;
      if (!phoneMap[p]) {
        phoneMap[p] = {
          phone: p,
          fullName: r.fullName,
          email: r.email,
          events: new Set([r.eventTitle]),
        };
      } else {
        phoneMap[p].events.add(r.eventTitle);
      }
    });

    return Object.values(phoneMap).map((item) => ({
      phone: item.phone,
      fullName: item.fullName,
      email: item.email,
      eventsCount: item.events.size,
      eventsList: Array.from(item.events),
    }));
  };

  // 7. CREAR Y ACTUALIZAR EVENTOS
  const createEvent = (eventData: Omit<Event, 'id' | 'active'>) => {
    const newEvent: Event = {
      ...eventData,
      id: `event-${Date.now()}`,
      active: true,
    };
    const updated = [newEvent, ...events];
    saveEvents(updated);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('saveEvent', { event: newEvent });
    } else if (db && isFirebaseConfigured) {
      try {
        setDoc(doc(db, 'events', newEvent.id), sanitizeForFirestore(newEvent)).catch((e) =>
          console.warn('Firestore write event warning:', e)
        );
      } catch (e) {
        console.warn('Firestore write event exception:', e);
      }
    }

    return newEvent;
  };

  const updateEvent = (eventId: string, eventData: Partial<Event>) => {
    const updated = events.map((e) => (e.id === eventId ? { ...e, ...eventData } : e));
    saveEvents(updated);

    const target = updated.find((e) => e.id === eventId);
    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      if (target) callSqliteApi('saveEvent', { event: target });
    } else if (target && db && isFirebaseConfigured) {
      try {
        setDoc(doc(db, 'events', eventId), sanitizeForFirestore(target)).catch((e) =>
          console.warn('Firestore update event warning:', e)
        );
      } catch (e) {
        console.warn('Firestore update event exception:', e);
      }
    }
  };

  // 8. CREAR SOLICITUD DE ORGANIZADOR (Solo Nombre y Celular)
  const submitOrganizerApplication = (userName: string, rawPhone: string) => {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const newApp: OrganizerApplication = {
      id: `app-${Date.now()}`,
      phone: cleanPhone,
      userName: userName.trim(),
      status: 'pending',
      appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [newApp, ...applications];
    saveApplications(updated);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      callSqliteApi('saveApplication', { application: newApp });
    } else if (db && isFirebaseConfigured) {
      setDoc(doc(db, 'applications', newApp.id), newApp).catch((e) =>
        console.warn('Firestore application write warning:', e)
      );
    }

    return newApp;
  };

  // 9. SUPER ADMIN: APROBAR Y ENVIAR CONTRASEÑA POR WHATSAPP
  const approveAndCreateOrganizer = (applicationId: string, customPassword?: string) => {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) return null;

    // Generar contraseña legible si no se especifica
    const generatedPass = customPassword || `Org${Math.floor(1000 + Math.random() * 9000)}`;

    const newAccount: OrganizerAccount = {
      phone: app.phone,
      password: generatedPass,
      name: app.userName,
      approvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Actualizar solicitud a aprobada con su contraseña
    const updatedApps = applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status: 'approved' as const,
            assignedPassword: generatedPass,
            reviewedAt: 'Aprobado',
          }
        : a
    );
    saveApplications(updatedApps);

    // Agregar a la lista de organizadores autorizados
    const updatedOrgs = [newAccount, ...organizers.filter((o) => o.phone !== app.phone)];
    saveOrganizers(updatedOrgs);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      const updatedApp = updatedApps.find((a) => a.id === applicationId);
      callSqliteApi('saveOrganizer', { organizer: newAccount, application: updatedApp });
    } else if (db && isFirebaseConfigured) {
      setDoc(doc(db, 'organizers', newAccount.phone), newAccount).catch((e) =>
        console.warn('Firestore organizer write warning:', e)
      );
      updateDoc(doc(db, 'applications', applicationId), {
        status: 'approved',
        assignedPassword: generatedPass,
        reviewedAt: 'Aprobado',
      }).catch((e) => console.warn('Firestore app update warning:', e));
    }

    // Generar el mensaje pre-cargado de WhatsApp
    const baseUrl = getAppBaseUrl();
    const message = `¡Hola ${app.userName}! 🎉 Tu solicitud para ser Organizador en EventPass ha sido APROBADA.\n\nPuedes ingresar a tu panel en:\n👉 ${baseUrl}/admin\n\nTus credenciales de acceso son:\n📱 Celular: ${app.phone}\n🔑 Contraseña: ${generatedPass}\n\n¡Ya puedes publicar tu evento y configurar tus cobros!`;

    const cleanPhone = formatWhatsAppPhone(app.phone);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return {
      account: newAccount,
      whatsappUrl,
      password: generatedPass,
    };
  };

  const rejectApplication = (applicationId: string) => {
    const updated = applications.map((a) =>
      a.id === applicationId
        ? { ...a, status: 'rejected' as const, reviewedAt: 'Rechazado' }
        : a
    );
    saveApplications(updated);

    if (ACTIVE_DATA_PROVIDER === 'sqlite') {
      const targetApp = updated.find((a) => a.id === applicationId);
      if (targetApp) callSqliteApi('saveApplication', { application: targetApp });
    } else if (db && isFirebaseConfigured) {
      updateDoc(doc(db, 'applications', applicationId), {
        status: 'rejected',
        reviewedAt: 'Rechazado',
      }).catch((e) => console.warn('Firestore app reject warning:', e));
    }
  };

  // 10. VALIDAR LOGIN DE ORGANIZADOR (Por Celular y Contraseña)
  const validateOrganizerLogin = (phone: string, pass: string): OrganizerAccount | null => {
    const cleanPhone = phone.replace(/\D/g, '');
    const found = organizers.find(
      (o) => matchPhoneNumbers(o.phone, cleanPhone) && o.password.trim() === pass.trim()
    );
    return found || null;
  };

  return {
    isLoaded,
    isFirebaseOnline,
    activeDataProvider: ACTIVE_DATA_PROVIDER,
    currentRole,
    events,
    registrations,
    applications,
    organizers,
    registerPerson,
    attachPaymentReceipt,
    confirmPaymentAndInscribe,
    addAuthorizedScanner,
    removeAuthorizedScanner,
    verifyAndCheckInQR,
    getPhoneFrequencyMetrics,
    createEvent,
    updateEvent,
    submitOrganizerApplication,
    approveAndCreateOrganizer,
    rejectApplication,
    validateOrganizerLogin,
    clearRegistrations,
    clearAllData,
  };
}
