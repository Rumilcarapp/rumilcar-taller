import { IEmailProvider, EmailResult } from './email.types';
import { GmailEmailProvider } from './gmail.provider';
import { buildPasswordResetEmail, buildPasswordChangedConfirmationEmail } from './email.templates';

export class EmailService {
  private provider: IEmailProvider;

  constructor() {
    // Allows switching provider via EMAIL_PROVIDER if needed
    const providerName = process.env.EMAIL_PROVIDER || 'gmail';
    if (providerName === 'gmail') {
      this.provider = new GmailEmailProvider();
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
