import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-relay-secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido. Solo se admite POST.'
    });
  }

  // Verificación de seguridad por secreto compartido
  const expectedSecret = process.env.EMAIL_RELAY_SECRET || 'rumilcar_relay_secret_2026';
  const authHeader = req.headers['authorization'] || req.headers['x-relay-secret'];

  const isValidSecret =
    authHeader === `Bearer ${expectedSecret}` ||
    authHeader === expectedSecret;

  if (!isValidSecret) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado. Secreto de retransmisión no válido.'
    });
  }

  const { to, subject, html, text } = req.body || {};

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      success: false,
      error: 'Faltan parámetros requeridos: to, subject, html o text.'
    });
  }

  try {
    const user = process.env.GMAIL_USER || 'redesmultiserviciosrumilcar@gmail.com';
    const pass = process.env.GMAIL_PASS || 'niniqoeiqncyuwsh';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    const info = await transporter.sendMail({
      from: `"Rumilcar App" <${user}>`,
      to,
      subject,
      text: text || '',
      html: html || text
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      deliveredTo: to
    });
  } catch (error) {
    console.error('Error al enviar correo vía Vercel Relay:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error interno al enviar correo por relay.'
    });
  }
}
