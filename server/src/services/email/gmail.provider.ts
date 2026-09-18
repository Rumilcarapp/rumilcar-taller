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
    this.port = parseInt(process.env.SMTP_PORT || '465', 10);
    this.secure = process.env.SMTP_SECURE === 'true' || this.port === 465;
    this.user = process.env.SMTP_USER?.trim();
    // Strip any accidental spaces from the 16-character Google App Password
    this.password = process.env.SMTP_PASSWORD?.replace(/\s+/g, '').trim();
    this.from = process.env.MAIL_FROM?.trim() || `Rumilcar App <${this.user || 'soporte@rumilcar.com'}>`;

    if (this.isConfigured()) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure, // true for 465, false for 587
        auth: {
          user: this.user,
          pass: this.password,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
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
      return {
        success: false,
        error: err.message || 'Error al conectar con el servidor SMTP de Gmail',
      };
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
      const errorMsg = err.message || 'Error desconocido al enviar correo vía Gmail SMTP';
      console.error(`[EMAIL SMTP ERROR] Falló el envío a ${options.to}: ${errorMsg}`);
      return {
        success: false,
        provider: this.name,
        error: errorMsg,
      };
    }
  }
}
