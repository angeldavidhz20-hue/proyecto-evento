export type UserRole =
  | 'attendee'
  | 'superadmin'
  | 'organizer'
  | 'scanner_staff';

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  clabe: string;
  accountNumber?: string;
  customPaymentMessage?: string; // Mensaje personalizado con cuenta, referencia y cómo mandar comprobante
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  locationUrl?: string; // Enlace opcional a Google Maps o Waze
  capacity: number;
  isFree: boolean;
  price: number;
  currency: string;
  bannerUrl?: string; // Imagen personalizada del evento (Base64 o URL)
  organizerPhone: string; // WhatsApp oficial del organizador para recibir comprobantes
  organizerContactEmail?: string; // Correo de contacto del organizador (Reply-To de los correos de boletos)
  bankDetails?: BankDetails;
  authorizedScanners: string[]; // Lista de Celulares o Gmails autorizados para escanear en puerta
  staffPin: string; // PIN opcional de respaldo
  active: boolean;
  creatorId: string; // Número celular o ID del organizador
  creatorName: string;
}

export type RegistrationStatus =
  | 'registered' // Pre-registrado (esperando pago)
  | 'inscribed'   // Pagado y confirmado (con QR emitido)
  | 'attended';   // Ya ingresó al evento (escaneado en puerta)

export interface PersonRegistration {
  id: string; // ID único del registro / Token del QR
  eventId: string;
  eventTitle: string;
  phone: string; // ANCLA PRINCIPAL IDENTIFICADORA
  fullName: string;
  email: string;
  preferredChannel: 'whatsapp' | 'email';
  status: RegistrationStatus;
  paymentReference: string; // ej. REF-TECH-8921
  paymentReceiptImage?: string; // Foto o captura del comprobante (Base64)
  qrDataUrl?: string; // Imagen del código QR
  registeredAt: string;
  inscribedAt?: string;
  attendedAt?: string;
  attendedByScanner?: string; // Celular o Gmail del staff que escaneó
}

export interface OrganizerApplication {
  id: string;
  phone: string; // Celular del solicitante
  userName: string; // Nombre del solicitante
  assignedPassword?: string; // Contraseña generada al aprobar
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
}

export interface OrganizerAccount {
  phone: string; // Celular (Identificador de acceso)
  password: string; // Contraseña enviada por WhatsApp
  name: string;
  approvedAt: string;
}
