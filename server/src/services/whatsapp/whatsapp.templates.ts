/**
 * Plantillas oficiales de WhatsApp para RumilcarApp
 */

export interface MetaTemplatePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: 'body' | 'button' | 'header';
      sub_type?: 'url';
      index?: string;
      parameters: Array<{
        type: 'text';
        text: string;
      }>;
    }>;
  };
}

export function buildMetaAuthTemplatePayload(
  recipientPhone: string,
  templateName: string,
  languageCode: string,
  otp: string,
  expiresInMinutes: number
): MetaTemplatePayload {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode || 'es',
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: otp,
            },
            {
              type: 'text',
              text: expiresInMinutes.toString(),
            },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: otp,
            },
          ],
        },
      ],
    },
  };
}

export function buildMetaFallbackTextPayload(
  recipientPhone: string,
  otp: string,
  expiresInMinutes: number
) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: `Rumilcar: tu código de recuperación es ${otp}. Expira en ${expiresInMinutes} minutos. Si no solicitaste este código, ignora este mensaje.`,
    },
  };
}
