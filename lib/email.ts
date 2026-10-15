export interface SendTicketParams {
  toEmail: string;
  fullName: string;
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventLocationUrl?: string;
  ticketId: string;
  qrDataUrl?: string;
  priceInfo?: string;
  replyToEmail?: string;
}

export async function sendTicketEmail(params: SendTicketParams): Promise<{
  success: boolean;
  configured?: boolean;
  message: string;
}> {
  try {
    const res = await fetch('/api/send-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        configured: false,
        message: 'El endpoint de correo no está disponible en entorno estático sin servidor backend.',
      };
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'No se pudo comunicar con el servicio de correo.',
    };
  }
}
