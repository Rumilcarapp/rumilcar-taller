import { IEmailProvider, SendEmailOptions, EmailResult } from './email.types';

export class VercelRelayEmailProvider implements IEmailProvider {
  readonly name = 'Vercel Relay (Gmail)';
  private relayUrl: string;
  private relaySecret: string;

  constructor() {
    this.relayUrl =
      process.env.EMAIL_RELAY_URL || 'https://rumilcarapp.vercel.app/api/send-email';
    this.relaySecret = process.env.EMAIL_RELAY_SECRET || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.relayUrl && this.relaySecret);
  }

  public async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(this.relayUrl, {
        method: 'OPTIONS',
      });
      if (res.status === 200 || res.status === 204 || res.status === 405) {
        return { success: true };
      }
      return {
        success: false,
        error: `Relay respondió con estado HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `No se pudo conectar con el servicio de relay en ${this.relayUrl}: ${err.message}`,
      };
    }
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const res = await fetch(this.relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.relaySecret}`,
        },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      const data: any = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg =
          data?.error || `HTTP ${res.status}: ${res.statusText || 'Error desconocido'}`;
        console.error(`[VercelRelay] Error enviando correo a ${options.to}:`, errorMsg);
        return {
          success: false,
          error: errorMsg,
          provider: this.name,
        };
      }

      console.log(
        `[VercelRelay] Correo enviado exitosamente a ${options.to}. MessageId: ${data.messageId}`
      );

      return {
        success: true,
        messageId: data.messageId,
        provider: this.name,
      };
    } catch (err: any) {
      console.error(`[VercelRelay] Error de red hacia ${this.relayUrl}:`, err);
      return {
        success: false,
        error: err.message || 'Error de conexión con el servicio de retransmisión de Vercel',
        provider: this.name,
      };
    }
  }
}
