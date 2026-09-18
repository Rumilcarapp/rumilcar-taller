import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore in older Node environments
}
import nodemailer, { Transporter } from 'nodemailer';
import { IEmailProvider, SendEmailOptions, EmailResult } from './email.types';

export class GmailEmailProvider implements IEmailProvider {
  public readonly name = 'gmail';

  private transporter: Transporter | null = null;
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly user?: string;
  private readonly password?: string;
  private readonly from: string;

  constructor() {
    this.host = process.env.SMTP_HOST || 'smtp.gmail.com';
    this.port = parseInt(process.env.SMTP_PORT || '587', 10);
    this.secure = process.env.SMTP_SECURE === 'true';
    this.user = process.env.SMTP_USER?.trim();
    // Strip any accidental spaces from the 16-character Google App Password
    this.password = process.env.SMTP_PASSWORD?.replace(/\s+/g, '').trim();
    this.from = process.env.MAIL_FROM?.trim() || `Rumilcar App <${this.user || 'soporte@rumilcar.com'}>`;

    if (this.isConfigured()) {
      // Force IPv4 (family: 4) to eliminate ENETUNREACH IPv6 routing errors on cloud hosts like Render
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        family: 4,
        auth: {
          user: this.user,
          pass: this.password,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      } as any);
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.user && this.password && this.user.includes('@'));
  }

  public async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured() || !this.transporter) {
      return {
        success: false,
        error: 'Servicio de correo no configurado: faltan credenciales SMTP.',
      };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (err: any) {
      // Try fallback to port 587 STARTTLS
      try {
        const fallback = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          requireTLS: true,
          family: 4,
          auth: {
            user: this.user,
            pass: this.password,
          },
          connectionTimeout: 10000,
        } as any);
        await fallback.verify();
        this.transporter = fallback;
        return { success: true };
      } catch (fallbackErr: any) {
        return {
          success: false,
          error: fallbackErr.message || err.message || 'Error al conectar con el servidor SMTP de Gmail',
        };
      }
    }
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.isConfigured() || !this.transporter) {
      const missing = [];
      if (!this.user) missing.push('SMTP_USER');
      if (!this.password) missing.push('SMTP_PASSWORD');
      const err = `Servicio de correo no configurado: faltan variables de entorno (${missing.join(', ')})`;
      console.error(`[EMAIL ERROR] ${err}`);
      return {
        success: false,
        provider: this.name,
        error: err,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`[EMAIL SUCCESS] Correo enviado a ${options.to} (ID: ${info.messageId})`);

      return {
        success: true,
        provider: this.name,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.warn(`[EMAIL WARN] Falló envío primario (${err.message}). Intentando fallback con puerto 587 STARTTLS...`);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          requireTLS: true,
          family: 4,
          auth: {
            user: this.user,
            pass: this.password,
          },
          connectionTimeout: 15000,
        } as any);

        const fallbackInfo = await fallbackTransporter.sendMail({
          from: this.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        console.log(`[EMAIL SUCCESS (FALLBACK)] Correo enviado a ${options.to} (ID: ${fallbackInfo.messageId})`);

        return {
          success: true,
          provider: this.name,
          messageId: fallbackInfo.messageId,
        };
      } catch (fallbackErr: any) {
        const errorMsg = fallbackErr.message || err.message || 'Error desconocido al enviar correo vía Gmail SMTP';
        console.error(`[EMAIL SMTP ERROR] Falló el envío a ${options.to}: ${errorMsg}`);
        return {
          success: false,
          provider: this.name,
          error: errorMsg,
        };
      }
    }
  }
}
