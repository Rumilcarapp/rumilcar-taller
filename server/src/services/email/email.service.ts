import { IEmailProvider, EmailResult } from './email.types';
import { GmailEmailProvider } from './gmail.provider';
import { ResendEmailProvider } from './resend.provider';
import { buildPasswordResetEmail, buildPasswordChangedConfirmationEmail } from './email.templates';

export class EmailService {
  private provider: IEmailProvider;

  constructor() {
    // If RESEND_API_KEY is configured, use Resend HTTP API (bypasses Render cloud SMTP blocks)
    if (process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER === 'resend') {
      this.provider = new ResendEmailProvider();
    } else {
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

  public async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    expiresInMinutes: number = 15,
    userName?: string
  ): Promise<EmailResult> {
    const { subject, html, text } = buildPasswordResetEmail(resetUrl, expiresInMinutes, userName);
    return this.provider.sendEmail({
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
    return this.provider.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
