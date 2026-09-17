import { IWhatsAppProvider, SendOtpParams, SendResult } from './whatsapp.types';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';

export class WhatsAppService {
  private provider: IWhatsAppProvider;

  constructor() {
    const selectedProvider = process.env.WHATSAPP_PROVIDER || 'meta';
    if (selectedProvider === 'meta') {
      this.provider = new MetaWhatsAppProvider();
    } else {
      // Default to Meta provider
      this.provider = new MetaWhatsAppProvider();
    }
  }

  /**
   * Normaliza números telefónicos (especialmente Venezuela) a estándar E.164 sin signo '+'
   * 04141234567 -> 584141234567
   * +58 414 1234567 -> 584141234567
   */
  public static normalizePhone(raw: string | undefined | null): { valid: boolean; e164: string; formatted: string } {
    if (!raw || typeof raw !== 'string') {
      return { valid: false, e164: '', formatted: '' };
    }

    let digits = raw.replace(/\D/g, '');

    if (digits.startsWith('0') && digits.length === 11) {
      digits = '58' + digits.slice(1);
    } else if (digits.length === 10 && (digits.startsWith('41') || digits.startsWith('42'))) {
      digits = '58' + digits;
    } else if (digits.startsWith('580') && digits.length === 13) {
      digits = '58' + digits.slice(3);
    }

    const isValid = digits.length >= 10 && digits.length <= 15;
    const formatted = digits.startsWith('58') && digits.length === 12
      ? `+58 ${digits.slice(2, 5)} ${digits.slice(5, 8)}-${digits.slice(8)}`
      : `+${digits}`;

    return {
      valid: isValid,
      e164: digits,
      formatted,
    };
  }

  /**
   * Enmascara el teléfono para proteger la identidad del usuario en frontend
   * Ej: 584141144532 -> +58 414 ••• 4532
   */
  public static maskPhone(phone: string): string {
    const norm = this.normalizePhone(phone);
    if (!norm.valid) return '•••• ••••';

    const digits = norm.e164;
    if (digits.startsWith('58') && digits.length === 12) {
      const area = digits.slice(2, 5); // ej: 414
      const lastFour = digits.slice(-4); // ej: 4532
      return `+58 ${area} ••• ${lastFour}`;
    }

    return `+${digits.slice(0, 2)} ••• ${digits.slice(-4)}`;
  }

  public isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async sendOtp(params: SendOtpParams): Promise<SendResult> {
    const norm = WhatsAppService.normalizePhone(params.phone);
    if (!norm.valid) {
      return {
        success: false,
        provider: this.provider.name,
        deliveryStatus: 'FAILED',
        error: `El teléfono registrado (${params.phone}) no tiene un formato internacional válido.`,
      };
    }

    return this.provider.sendOtp({
      ...params,
      phone: norm.e164,
    });
  }
}

export const whatsappService = new WhatsAppService();
