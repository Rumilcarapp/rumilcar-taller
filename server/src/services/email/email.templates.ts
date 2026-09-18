/**
 * Plantillas oficiales de correo para Rumilcar App
 */

export function buildPasswordResetEmail(
  resetUrl: string,
  expiresInMinutes: number = 15,
  userName?: string
): { subject: string; html: string; text: string } {
  const subject = 'Restablece tu contraseña de Rumilcar App';

  const text = `Hola${userName ? ` ${userName}` : ''},

Recibimos una solicitud para restablecer la contraseña de tu cuenta de Rumilcar App.

Haz clic en el siguiente enlace para crear una nueva contraseña:
${resetUrl}

Este enlace expirará en ${expiresInMinutes} minutos y solo puede utilizarse una vez.

Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá protegida.

Atentamente,
Equipo Rumilcar App
`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0f172a;
      padding: 40px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid #334155;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .brand span {
      color: #3b82f6;
    }
    .content {
      padding: 35px 30px;
      line-height: 1.6;
      color: #cbd5e1;
      font-size: 15px;
    }
    .content h2 {
      color: #f8fafc;
      font-size: 19px;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      display: inline-block;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }
    .alt-link {
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #94a3b8;
      word-break: break-all;
    }
    .alt-link a {
      color: #60a5fa;
      text-decoration: underline;
    }
    .notice {
      background-color: rgba(59, 130, 246, 0.08);
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      border-radius: 4px;
      margin: 20px 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .footer {
      background-color: #0f172a;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #1e293b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand">Rumilcar<span>App</span></div>
        <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 13px;">Gestión Integral para Talleres Mecánicos</p>
      </div>
      <div class="content">
        <h2>Recuperación de Contraseña</h2>
        <p>Hola${userName ? ` <strong>${userName}</strong>` : ''},</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de <strong>Rumilcar App</strong>.</p>
        <p>Haz clic en el botón a continuación para crear una nueva contraseña segura:</p>
        
        <div class="btn-container">
          <a href="${resetUrl}" class="btn" target="_blank">Restablecer Contraseña</a>
        </div>

        <div class="notice">
          ⏱️ <strong>Importante:</strong> Este enlace expirará en <strong>${expiresInMinutes} minutos</strong> y solo puede ser utilizado una vez.
        </div>

        <p style="font-size: 13px; color: #94a3b8;">Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá completamente protegida.</p>

        <div class="alt-link">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Rumilcar App. Todos los derechos reservados.<br>
        Este es un mensaje de seguridad automatizado, por favor no respondas a este correo.
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export function buildPasswordChangedConfirmationEmail(userName?: string): { subject: string; html: string; text: string } {
  const subject = 'Tu contraseña de Rumilcar App ha sido actualizada';

  const text = `Hola${userName ? ` ${userName}` : ''},

Te confirmamos que la contraseña de tu cuenta de Rumilcar App ha sido actualizada exitosamente.

Por tu seguridad, todas las sesiones activas anteriores en otros dispositivos han sido cerradas automáticamente.

Si tú realizaste este cambio, no necesitas hacer nada más.
Si NO fuiste tú, por favor comunícate de inmediato con el soporte de tu taller o responde a este correo para proteger tu cuenta.

Atentamente,
Equipo Rumilcar App
`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 15px;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <h2 style="color: #22c55e; margin-top: 0;">✓ Contraseña Actualizada</h2>
    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Hola${userName ? ` <strong>${userName}</strong>` : ''},</p>
    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Te confirmamos que la contraseña de tu cuenta de <strong>Rumilcar App</strong> fue actualizada exitosamente.</p>
    <div style="background-color: rgba(34, 197, 94, 0.08); border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #cbd5e1;">
      🔒 <strong>Medida de seguridad aplicada:</strong> Todas las sesiones activas en otros navegadores o dispositivos han sido cerradas automáticamente.
    </div>
    <p style="color: #94a3b8; font-size: 13px;">Si tú realizaste este cambio, no requieres hacer nada más.<br>Si no lo realizaste, contacta al administrador de tu taller de inmediato.</p>
    <hr style="border: none; border-top: 1px solid #334155; margin: 25px 0;">
    <p style="text-align: center; color: #64748b; font-size: 12px; margin: 0;">Rumilcar App &copy; ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
