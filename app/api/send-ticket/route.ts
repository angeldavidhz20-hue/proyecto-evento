import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      toEmail,
      fullName,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      eventLocationUrl,
      ticketId,
      qrDataUrl,
      priceInfo,
      replyToEmail,
    } = body;

    if (!toEmail || !ticketId || !eventTitle) {
      return NextResponse.json(
        { success: false, message: 'Faltan datos requeridos (correo, ticketId o evento).' },
        { status: 400 }
      );
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465;
    
    // Remitente personalizado con el nombre del evento + correo del sistema
    const fromSender = `"${eventTitle} • EventPass" <${smtpUser || 'no-reply@eventpass.com'}>`;

    // Si aún no se configuran credenciales SMTP
    if (!smtpUser || !smtpPass) {
      console.warn(
        `[EventPass Email] Intento de envío a "${toEmail}" pero faltan SMTP_USER / SMTP_PASS en .env.local`
      );
      return NextResponse.json({
        success: false,
        configured: false,
        message:
          'El servidor de correo no está configurado aún en .env.local (Falta SMTP_USER y SMTP_PASS).',
      });
    }

    // Configurar transporte nodemailer
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Extraer base64 del QR para adjuntarlo como CID
    const attachments = [];
    let qrCidHtml = '';

    if (qrDataUrl && qrDataUrl.startsWith('data:image')) {
      const base64Data = qrDataUrl.split(';base64,').pop();
      if (base64Data) {
        attachments.push({
          filename: 'ticket-qr.png',
          content: Buffer.from(base64Data, 'base64'),
          cid: 'ticketqr@eventpass',
        });
        qrCidHtml = `<div style="text-align: center; margin: 25px 0;">
          <div style="display: inline-block; padding: 16px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px;">
            <img src="cid:ticketqr@eventpass" alt="Código QR de Acceso" style="width: 220px; height: 220px; display: block; margin: 0 auto;" />
            <p style="font-family: monospace; font-size: 13px; color: #475569; margin: 10px 0 0 0; font-weight: bold;">ID: ${ticketId}</p>
          </div>
        </div>`;
      }
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Tu Boleto para ${eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.1); border: 1px solid #ede9fe;">
    
    <!-- Encabezado Pastel -->
    <div style="background: linear-gradient(135deg, #ede9fe 0%, #fce7f3 50%, #fef3c7 100%); padding: 36px 30px; text-align: center; border-bottom: 2px solid #ddd6fe;">
      <span style="background-color: #7c3aed; color: #ffffff; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        Boleto Oficial de Acceso
      </span>
      <h1 style="color: #0f172a; margin: 14px 0 6px 0; font-size: 26px; font-weight: 800; line-height: 1.2;">
        ${eventTitle}
      </h1>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        ¡Hola <strong>${fullName}</strong>! Tu registro está confirmado.
      </p>
    </div>

    <!-- Contenido del Boleto -->
    <div style="padding: 30px 35px;">
      
      <!-- QR Code -->
      ${qrCidHtml}

      <!-- Detalles del Evento -->
      <div style="background-color: #faf5ff; border-radius: 20px; padding: 20px; border: 1px solid #f3e8ff; margin-bottom: 25px;">
        <h3 style="color: #6b21a8; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
          📌 Información del Evento
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; width: 30%;">📅 Fecha:</td>
            <td style="padding: 6px 0; color: #0f172a;">${eventDate || 'Por confirmar'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">⏰ Horario:</td>
            <td style="padding: 6px 0; color: #0f172a;">${eventTime || 'Por confirmar'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">📍 Ubicación:</td>
            <td style="padding: 6px 0; color: #0f172a;">
              ${eventLocation || 'Por confirmar'}
              ${eventLocationUrl ? `<br><a href="${eventLocationUrl}" target="_blank" rel="noopener noreferrer" style="color: #7c3aed; font-size: 12px; font-weight: bold; text-decoration: underline;">Abrir en Google Maps / GPS 🗺️</a>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">🎟️ Tipo:</td>
            <td style="padding: 6px 0; color: #059669; font-weight: bold;">${priceInfo || 'Entrada Confirmada'}</td>
          </tr>
        </table>
      </div>

      <!-- Instrucciones de Entrada -->
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 18px; border-left: 4px solid #7c3aed; margin-bottom: 25px;">
        <h4 style="color: #0f172a; margin: 0 0 6px 0; font-size: 14px; font-weight: bold;">
          💡 Instrucciones para tu ingreso
        </h4>
        <p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0;">
          Presenta este código QR desde tu celular o impreso en la mesa de control de acceso. El personal del staff lo escaneará para validar tu entrada.
        </p>
      </div>

      ${replyToEmail ? `
      <!-- Contacto del Organizador (Reply-To) -->
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 14px; padding: 12px 16px; margin: 20px 0 10px 0; text-align: center; font-size: 12px; color: #475569;">
        💬 <strong>¿Dudas o consultas sobre este evento?</strong><br>
        Puedes responder directamente a este correo o escribir a <a href="mailto:${replyToEmail}" style="color: #7c3aed; font-weight: bold; text-decoration: none;">${replyToEmail}</a>.
      </div>
      ` : ''}

      <div style="text-align: center; padding-top: 10px;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Generado automáticamente por EventPass • Sistema de Registro Inteligente
        </p>
      </div>

    </div>

  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: fromSender,
      to: toEmail,
      replyTo: replyToEmail || smtpUser,
      subject: `🎫 Tu boleto para "${eventTitle}"`,
      html: htmlContent,
      attachments,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Correo enviado con éxito.',
    });
  } catch (error: any) {
    console.error('[EventPass Email Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al enviar correo electrónico.',
      },
      { status: 500 }
    );
  }
}
