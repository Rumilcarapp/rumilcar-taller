import { IEmailProvider, SendEmailOptions, EmailResult } from './email.types';

/**
 * Resend Email Provider (HTTP REST API over port 443 HTTPS)
 * Bypasses cloud provider SMTP port blocks (such as Render Free tier 25/465/587 blocks).
 */
export class ResendEmailProvider implements IEmailProvider {
  public readonly name = 'resend';
  private readonly apiKey?: string;
  private readonly from: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY?.trim();
    this.from = process.env.MAIL_FROM?.trim() || 'Rumilcar App <onboarding@resend.dev>';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith('re_'));
  }

  public async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Servicio no configurado: falta RESEND_API_KEY' };
    }

    try {
      const res = await fetch('https://api.resend.com/api-keys', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (res.ok) return { success: true };
      const err = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: err.message || `Error de Resend: ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al conectar con la API de Resend' };
    }
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: 'Servicio de correo Resend no configurado: falta RESEND_API_KEY',
      };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const errorMsg = data.message || `Error al despachar correo vía Resend (HTTP ${res.status})`;
        console.error(`[RESEND ERROR] ${errorMsg}`);
        return {
          success: false,
          provider: this.name,
          error: errorMsg,
        };
      }

      console.log(`[RESEND SUCCESS] Correo enviado a ${options.to} (ID: ${data.id})`);
      return {
        success: true,
        provider: this.name,
        messageId: data.id,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Error de conexión HTTPS con la API de Resend';
      console.error(`[RESEND CONNECTION ERROR] ${errorMsg}`);
      return {
        success: false,
        provider: this.name,
        error: errorMsg,
      };
    }
  }
}
