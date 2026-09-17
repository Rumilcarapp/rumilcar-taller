export interface SendOtpParams {
  phone: string;              // E.164 formatted without '+' (e.g. '584141144532')
  otp: string;                // 6 digits
  expiresInMinutes: number;   // e.g. 15
  userName?: string;
  workshopName?: string;
}

export interface SendResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  deliveryStatus: 'SENT' | 'DELIVERED' | 'FAILED';
  error?: string;
}

export interface IWhatsAppProvider {
  name: string;
  isConfigured(): boolean;
  sendOtp(params: SendOtpParams): Promise<SendResult>;
}

export interface WhatsAppConfig {
  provider: string; // 'meta' | 'none'
  apiUrl: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  authTemplateName?: string;
  templateLanguage?: string;
}
