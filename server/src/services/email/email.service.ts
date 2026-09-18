import { IEmailProvider, EmailResult, SendEmailOptions } from './email.types';
import { GmailEmailProvider } from './gmail.provider';
import { ResendEmailProvider } from './resend.provider';
import { BrevoEmailProvider } from './brevo.provider';
import { VercelRelayEmailProvider } from './vercel-relay.provider';
import { buildPasswordResetEmail, buildPasswordChangedConfirmationEmail } from './email.templates';

export class EmailService {
  private provider: IEmailProvider;

  constructor() {
    // Selección inteligente de proveedor de correo:
    if (process.env.EMAIL_PROVIDER === 'relay' || process.env.EMAIL_RELAY_URL) {
      this.provider = new VercelRelayEmailProvider();
    } else if (process.env.EMAIL_PROVIDER === 'brevo' || process.env.BREVO_API_KEY) {
      this.provider = new BrevoEmailProvider();
    } else if (process.env.EMAIL_PROVIDER === 'resend') {
      this.provider = new ResendEmailProvider();
    } else if (process.env.EMAIL_PROVIDER === 'gmail') {
      // En Render (producción), los puertos SMTP 587/465 están bloqueados físicamente por la capa gratuita.
      // Por ende, en producción se redirige a Vercel Relay vía HTTPS (puerto 443) salvo que se fuerce explícitamente.
      if (process.env.NODE_ENV === 'production' && process.env.FORCE_DIRECT_SMTP !== 'true') {
        console.log(
          '[EmailService] Producción detectada: usando Vercel Relay (Gmail HTTPS) para evitar bloqueo de puertos SMTP en Render.'
        );
        this.provider = new VercelRelayEmailProvider();
      } else {
        this.provider = new GmailEmailProvider();
      }
    } else if (process.env.NODE_ENV === 'production') {
      this.provider = new VercelRelayEmailProvider();
    } else {
      // Desarrollo local: SMTP directo de Gmail
      this.provider = new GmailEmailProvider();
    }
  }

  public isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  public async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    return this.provider.verifyConnection();
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const result = await this.provider.sendEmail(options);
    if (!result.success && !(this.provider instanceof GmailEmailProvider)) {
      console.warn(
        `[EmailService] Proveedor principal (${this.provider.name}) falló: ${result.error}. Intentando fallback directo con Gmail...`
      );
      try {
        const fallback = new GmailEmailProvider();
        if (fallback.isConfigured()) {
          const fallbackRes = await fallback.sendEmail(options);
          if (fallbackRes.success) {
            return fallbackRes;
          }
        }
      } catch (fallbackErr: any) {
        console.error('[EmailService] Fallback directo también falló:', fallbackErr.message);
      }
    }
    return result;
  }

  public async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    expiresInMinutes: number = 15,
    userName?: string
  ): Promise<EmailResult> {
    const { subject, html, text } = buildPasswordResetEmail(resetUrl, expiresInMinutes, userName);
    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  public async sendPasswordChangedConfirmation(
    to: string,
    userName?: string
  ): Promise<EmailResult> {
    const { subject, html, text } = buildPasswordChangedConfirmationEmail(userName);
    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
