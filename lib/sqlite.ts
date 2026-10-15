import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  Event,
  PersonRegistration,
  OrganizerApplication,
  OrganizerAccount,
} from './types';

// Directorio y ruta de la base de datos SQLite
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'eventpass.db');

// Singleton para desarrollo y producción en Next.js (evita re-instanciaciones innecesarias)
const globalForSqlite = globalThis as unknown as {
  eventpassDbInstance: Database.Database | undefined;
};

export function getDatabase(): Database.Database {
  if (globalForSqlite.eventpassDbInstance) {
    return globalForSqlite.eventpassDbInstance;
  }

  // Asegurar que exista la carpeta data/
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Modo WAL para alto rendimiento y lecturas concurrentes sin bloqueos
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Inicializar tablas
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      date TEXT,
      time TEXT,
      location TEXT,
      locationUrl TEXT,
      capacity INTEGER DEFAULT 0,
      isFree INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      currency TEXT DEFAULT 'MXN',
      bannerUrl TEXT,
      organizerPhone TEXT,
      organizerContactEmail TEXT,
      bankDetails TEXT,
      authorizedScanners TEXT,
      staffPin TEXT,
      active INTEGER DEFAULT 1,
      creatorId TEXT,
      creatorName TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      eventTitle TEXT,
      phone TEXT NOT NULL,
      fullName TEXT NOT NULL,
      email TEXT,
      preferredChannel TEXT DEFAULT 'whatsapp',
      status TEXT NOT NULL DEFAULT 'registered',
      paymentReference TEXT,
      paymentReceiptImage TEXT,
      qrDataUrl TEXT,
      registeredAt TEXT,
      inscribedAt TEXT,
      attendedAt TEXT,
      attendedByScanner TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_eventId ON registrations(eventId);
    CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations(phone);

    CREATE TABLE IF NOT EXISTS organizer_applications (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      userName TEXT NOT NULL,
      assignedPassword TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      appliedAt TEXT,
      reviewedAt TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organizer_accounts (
      phone TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      approvedAt TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  globalForSqlite.eventpassDbInstance = db;
  return db;
}

// ==========================================
// HELPERS PARA EVENTOS
// ==========================================

export function getAllEvents(): Event[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM events ORDER BY rowid DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    category: r.category || 'General',
    date: r.date || '',
    time: r.time || '',
    location: r.location || '',
    locationUrl: r.locationUrl || undefined,
    capacity: Number(r.capacity) || 0,
    isFree: r.isFree === 1,
    price: Number(r.price) || 0,
    currency: r.currency || 'MXN',
    bannerUrl: r.bannerUrl || undefined,
    organizerPhone: r.organizerPhone || '',
    organizerContactEmail: r.organizerContactEmail || undefined,
    bankDetails: r.bankDetails ? JSON.parse(r.bankDetails) : undefined,
    authorizedScanners: r.authorizedScanners ? JSON.parse(r.authorizedScanners) : [],
    staffPin: r.staffPin || '',
    active: r.active === 1,
    creatorId: r.creatorId || '',
    creatorName: r.creatorName || '',
  }));
}

export function saveEvent(event: Event): Event {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO events (
      id, title, description, category, date, time, location, locationUrl,
      capacity, isFree, price, currency, bannerUrl, organizerPhone,
      organizerContactEmail, bankDetails, authorizedScanners, staffPin,
      active, creatorId, creatorName
    ) VALUES (
      @id, @title, @description, @category, @date, @time, @location, @locationUrl,
      @capacity, @isFree, @price, @currency, @bannerUrl, @organizerPhone,
      @organizerContactEmail, @bankDetails, @authorizedScanners, @staffPin,
      @active, @creatorId, @creatorName
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      category = excluded.category,
      date = excluded.date,
      time = excluded.time,
      location = excluded.location,
      locationUrl = excluded.locationUrl,
      capacity = excluded.capacity,
      isFree = excluded.isFree,
      price = excluded.price,
      currency = excluded.currency,
      bannerUrl = excluded.bannerUrl,
      organizerPhone = excluded.organizerPhone,
      organizerContactEmail = excluded.organizerContactEmail,
      bankDetails = excluded.bankDetails,
      authorizedScanners = excluded.authorizedScanners,
      staffPin = excluded.staffPin,
      active = excluded.active,
      creatorId = excluded.creatorId,
      creatorName = excluded.creatorName
  `);

  stmt.run({
    id: event.id,
    title: event.title,
    description: event.description || '',
    category: event.category || 'General',
    date: event.date || '',
    time: event.time || '',
    location: event.location || '',
    locationUrl: event.locationUrl || null,
    capacity: event.capacity || 0,
    isFree: event.isFree ? 1 : 0,
    price: event.price || 0,
    currency: event.currency || 'MXN',
    bannerUrl: event.bannerUrl || null,
    organizerPhone: event.organizerPhone || '',
    organizerContactEmail: event.organizerContactEmail || null,
    bankDetails: event.bankDetails ? JSON.stringify(event.bankDetails) : null,
    authorizedScanners: JSON.stringify(event.authorizedScanners || []),
    staffPin: event.staffPin || '',
    active: event.active ? 1 : 0,
    creatorId: event.creatorId || '',
    creatorName: event.creatorName || '',
  });

  return event;
}

export function deleteEvent(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  return res.changes > 0;
}

// ==========================================
// HELPERS PARA REGISTROS / BOLETOS
// ==========================================

export function getAllRegistrations(): PersonRegistration[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM registrations ORDER BY rowid DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    eventId: r.eventId,
    eventTitle: r.eventTitle || '',
    phone: r.phone,
    fullName: r.fullName,
    email: r.email || '',
    preferredChannel: r.preferredChannel || 'whatsapp',
    status: r.status,
    paymentReference: r.paymentReference || '',
    paymentReceiptImage: r.paymentReceiptImage || undefined,
    qrDataUrl: r.qrDataUrl || undefined,
    registeredAt: r.registeredAt || '',
    inscribedAt: r.inscribedAt || undefined,
    attendedAt: r.attendedAt || undefined,
    attendedByScanner: r.attendedByScanner || undefined,
  }));
}

export function saveRegistration(reg: PersonRegistration): PersonRegistration {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO registrations (
      id, eventId, eventTitle, phone, fullName, email,
      preferredChannel, status, paymentReference, paymentReceiptImage,
      qrDataUrl, registeredAt, inscribedAt, attendedAt, attendedByScanner
    ) VALUES (
      @id, @eventId, @eventTitle, @phone, @fullName, @email,
      @preferredChannel, @status, @paymentReference, @paymentReceiptImage,
      @qrDataUrl, @registeredAt, @inscribedAt, @attendedAt, @attendedByScanner
    )
    ON CONFLICT(id) DO UPDATE SET
      eventId = excluded.eventId,
      eventTitle = excluded.eventTitle,
      phone = excluded.phone,
      fullName = excluded.fullName,
      email = excluded.email,
      preferredChannel = excluded.preferredChannel,
      status = excluded.status,
      paymentReference = excluded.paymentReference,
      paymentReceiptImage = excluded.paymentReceiptImage,
      qrDataUrl = excluded.qrDataUrl,
      registeredAt = excluded.registeredAt,
      inscribedAt = excluded.inscribedAt,
      attendedAt = excluded.attendedAt,
      attendedByScanner = excluded.attendedByScanner
  `);

  stmt.run({
    id: reg.id,
    eventId: reg.eventId,
    eventTitle: reg.eventTitle || '',
    phone: reg.phone,
    fullName: reg.fullName,
    email: reg.email || '',
    preferredChannel: reg.preferredChannel || 'whatsapp',
    status: reg.status,
    paymentReference: reg.paymentReference || '',
    paymentReceiptImage: reg.paymentReceiptImage || null,
    qrDataUrl: reg.qrDataUrl || null,
    registeredAt: reg.registeredAt || '',
    inscribedAt: reg.inscribedAt || null,
    attendedAt: reg.attendedAt || null,
    attendedByScanner: reg.attendedByScanner || null,
  });

  return reg;
}

export function updateRegistrationStatus(
  id: string,
  updates: Partial<PersonRegistration>
): boolean {
  const db = getDatabase();
  const sets: string[] = [];
  const params: Record<string, any> = { id };

  for (const [k, v] of Object.entries(updates)) {
    if (k === 'id') continue;
    sets.push(`${k} = @${k}`);
    params[k] = v === undefined ? null : v;
  }

  if (sets.length === 0) return false;

  const sql = `UPDATE registrations SET ${sets.join(', ')} WHERE id = @id`;
  const res = db.prepare(sql).run(params);
  return res.changes > 0;
}

export function clearAllRegistrations(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM registrations').run();
}

// ==========================================
// HELPERS PARA SOLICITUDES DE ORGANIZADOR
// ==========================================

export function getAllApplications(): OrganizerApplication[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM organizer_applications ORDER BY rowid DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    userName: r.userName,
    assignedPassword: r.assignedPassword || undefined,
    status: r.status,
    appliedAt: r.appliedAt || '',
    reviewedAt: r.reviewedAt || undefined,
  }));
}

export function saveApplication(app: OrganizerApplication): OrganizerApplication {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO organizer_applications (
      id, phone, userName, assignedPassword, status, appliedAt, reviewedAt
    ) VALUES (
      @id, @phone, @userName, @assignedPassword, @status, @appliedAt, @reviewedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      phone = excluded.phone,
      userName = excluded.userName,
      assignedPassword = excluded.assignedPassword,
      status = excluded.status,
      appliedAt = excluded.appliedAt,
      reviewedAt = excluded.reviewedAt
  `);

  stmt.run({
    id: app.id,
    phone: app.phone,
    userName: app.userName,
    assignedPassword: app.assignedPassword || null,
    status: app.status,
    appliedAt: app.appliedAt || '',
    reviewedAt: app.reviewedAt || null,
  });

  return app;
}

// ==========================================
// HELPERS PARA CUENTAS DE ORGANIZADORES
// ==========================================

export function getAllOrganizers(): OrganizerAccount[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM organizer_accounts ORDER BY rowid DESC').all() as any[];
  return rows.map((r) => ({
    phone: r.phone,
    password: r.password,
    name: r.name,
    approvedAt: r.approvedAt || '',
  }));
}

export function saveOrganizer(org: OrganizerAccount): OrganizerAccount {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO organizer_accounts (
      phone, password, name, approvedAt
    ) VALUES (
      @phone, @password, @name, @approvedAt
    )
    ON CONFLICT(phone) DO UPDATE SET
      password = excluded.password,
      name = excluded.name,
      approvedAt = excluded.approvedAt
  `);

  stmt.run({
    phone: org.phone,
    password: org.password,
    name: org.name,
    approvedAt: org.approvedAt || '',
  });

  return org;
}

// ==========================================
// OPERACIONES GLOBALES (VACIAR O IMPORTAR)
// ==========================================

export function clearDatabase(): void {
  const db = getDatabase();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM registrations').run();
    db.prepare('DELETE FROM events').run();
    db.prepare('DELETE FROM organizer_applications').run();
    db.prepare('DELETE FROM organizer_accounts').run();
  });
  tx();
}

export function getAllData() {
  return {
    events: getAllEvents(),
    registrations: getAllRegistrations(),
    applications: getAllApplications(),
    organizers: getAllOrganizers(),
  };
}
