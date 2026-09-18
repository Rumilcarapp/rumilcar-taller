import { IEmailProvider, SendEmailOptions, EmailResult } from './email.types';

/**
 * Brevo Email Provider (HTTP REST API over port 443 HTTPS)
 * Sends transactional emails to ANY recipient without requiring custom domain verification.
 * 300 free emails/day, completely unblocked by Render.
 */
export class BrevoEmailProvider implements IEmailProvider {
  public readonly name = 'brevo';
  private readonly apiKey?: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY?.trim();
    this.senderEmail = process.env.SMTP_USER?.trim() || 'redesmultiserviciosrumilcar@gmail.com';
    this.senderName = 'Rumilcar App';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith('xkeysib-'));
  }

  public async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Falta configurar BREVO_API_KEY' };
    }

    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': this.apiKey! },
      });

      if (res.ok) return { success: true };
      const err = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: err.message || `Error Brevo: HTTP ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error de conexión con Brevo' };
    }
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: 'Servicio Brevo no configurado: falta BREVO_API_KEY',
      };
    }

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey!,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const msg = data.message || `Error al despachar correo vía Brevo (HTTP ${res.status})`;
        console.error(`[BREVO ERROR] ${msg}`);
        return {
          success: false,
          provider: this.name,
          error: msg,
        };
      }

      console.log(`[BREVO SUCCESS] Correo enviado a ${options.to} (ID: ${data.messageId})`);
      return {
        success: true,
        provider: this.name,
        messageId: data.messageId,
      };
    } catch (e: any) {
      const errorMsg = e.message || 'Error de conexión HTTPS con la API de Brevo';
      console.error(`[BREVO CONNECTION ERROR] ${errorMsg}`);
      return {
        success: false,
        provider: this.name,
        error: errorMsg,
      };
    }
  }
}
