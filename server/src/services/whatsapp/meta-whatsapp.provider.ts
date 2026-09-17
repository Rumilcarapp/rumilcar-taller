import { IWhatsAppProvider, SendOtpParams, SendResult } from './whatsapp.types';
import { buildMetaAuthTemplatePayload, buildMetaFallbackTextPayload } from './whatsapp.templates';

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  public readonly name = 'meta';

  private readonly apiUrl: string;
  private readonly phoneNumberId?: string;
  private readonly accessToken?: string;
  private readonly templateName?: string;
  private readonly templateLanguage: string;

  constructor() {
    this.apiUrl = (process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0').replace(/\/$/, '');
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.templateName = process.env.WHATSAPP_AUTH_TEMPLATE_NAME;
    this.templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
  }

  public isConfigured(): boolean {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  public async sendOtp(params: SendOtpParams): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        deliveryStatus: 'FAILED',
        error: 'Proveedor Meta WhatsApp no configurado: faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN.',
      };
    }

    const endpoint = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    // Try template payload first if template name is configured, otherwise text payload
    const payload = this.templateName
      ? buildMetaAuthTemplatePayload(
          params.phone,
          this.templateName,
          this.templateLanguage,
          params.otp,
          params.expiresInMinutes
        )
      : buildMetaFallbackTextPayload(params.phone, params.otp, params.expiresInMinutes);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.error(`[WHATSAPP META ERROR] Error al enviar mensaje a ${params.phone.slice(-4)}: ${errorMsg}`);
        return {
          success: false,
          provider: this.name,
          deliveryStatus: 'FAILED',
          error: errorMsg,
        };
      }

      const providerMessageId = data?.messages?.[0]?.id;

      return {
        success: true,
        provider: this.name,
        providerMessageId,
        deliveryStatus: 'SENT',
      };
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout
        ? 'Tiempo de espera agotado al conectar con Meta WhatsApp API'
        : err.message || 'Error de conexión con Meta WhatsApp API';

      console.error(`[WHATSAPP META EXCEPTION] ${msg}`);

      return {
        success: false,
        provider: this.name,
        deliveryStatus: 'FAILED',
        error: msg,
      };
    }
  }
}
