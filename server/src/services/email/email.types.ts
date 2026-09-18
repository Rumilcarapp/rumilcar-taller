export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface IEmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  verifyConnection(): Promise<{ success: boolean; error?: string }>;
  sendEmail(options: SendEmailOptions): Promise<EmailResult>;
}

export interface EmailConfig {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}
