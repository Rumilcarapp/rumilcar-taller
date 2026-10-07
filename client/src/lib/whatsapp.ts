/**
 * Rumilcarapp - Módulo Profesional de Integración WhatsApp (Método 1: Cero Riesgo de Baneo)
 * 
 * - Sanitización y normalización precisa de números telefónicos (Venezuela e internacional).
 * - Generador de enlaces oficiales wa.me y web.whatsapp.com.
 * - Plantillas inteligentes con cálculo en USD, Bolívares (VES) a tasa del día y datos de Pago Móvil.
 * - Copia rápida a portapapeles y protección contra popup blockers.
 */

export interface PhoneValidationResult {
  valid: boolean;
  e164: string; // Sin símbolo +, ideal para wa.me (ej: "584141234567")
  display: string; // Formateado para vista humana (ej: "+58 414 123-4567")
  reason?: string;
}

/**
 * Normaliza números telefónicos, corrigiendo el error clásico de Venezuela
 * donde se añade 58 antes del 0 (ej: 0414... -> 58414... y NO 580414...)
 */
export function normalizePhoneNumber(raw: string | undefined | null): PhoneValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, e164: '', display: '', reason: 'Número de teléfono no provisto' };
  }

  // Quitar espacios, guiones, paréntesis y signos
  let digits = raw.replace(/[^0-9]/g, '');

  if (!digits) {
    return { valid: false, e164: '', display: raw, reason: 'No contiene dígitos válidos' };
  }

  // Caso Venezuela: Si empieza por 0 y tiene 11 dígitos (ej: 04141234567, 0424..., 0412..., 0416..., 0426...)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '58' + digits.substring(1);
  }
  // Caso Venezuela: Si tiene 10 dígitos y empieza por 414, 424, 412, 416, 426 (le falta el 0 y el 58)
  else if (digits.length === 10 && (digits.startsWith('41') || digits.startsWith('42'))) {
    digits = '58' + digits;
  }
  // Caso Venezuela: Si por error guardaron 5804141234567 (13 dígitos con el 0 incluido)
  else if (digits.startsWith('580') && digits.length === 13) {
    digits = '58' + digits.substring(3);
  }

  // Validación básica de longitud internacional (mínimo 8 dígitos, máximo 15 según estándar ITU E.164)
  if (digits.length < 8 || digits.length > 15) {
    return {
      valid: false,
      e164: digits,
      display: raw,
      reason: `Longitud inusual de número (${digits.length} dígitos)`
    };
  }

  // Formateo visual
  let display = `+${digits}`;
  if (digits.startsWith('58') && digits.length === 12) {
    // Formato Venezuela: +58 414 123-4567
    display = `+58 ${digits.substring(2, 5)} ${digits.substring(5, 8)}-${digits.substring(8)}`;
  }

  return {
    valid: true,
    e164: digits,
    display
  };
}

/**
 * Genera la URL de WhatsApp lista para abrir
 */
export function generateWhatsAppUrl(phone: string, message: string, preferWeb: boolean = false): string {
  const norm = normalizePhoneNumber(phone);
  const targetPhone = norm.valid ? norm.e164 : phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);

  if (preferWeb) {
    return `https://web.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
  }
  return `https://wa.me/${targetPhone}?text=${encodedText}`;
}

/**
 * Abre WhatsApp de manera segura
 */
export function openWhatsApp(phone: string, message: string, preferWeb: boolean = false): boolean {
  const url = generateWhatsAppUrl(phone, message, preferWeb);
  const win = window.open(url, '_blank');
  return !!win;
}

/**
 * Copia texto al portapapeles con fallback robusto
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continuar con fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    textArea.remove();
    return successful;
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
    return false;
  }
}

export type WhatsAppTemplateType =
  | 'VEHICULO_LISTO'
  | 'PRESUPUESTO'
  | 'PRESUPUESTO_TALLER'
  | 'COBRANZA'
  | 'AVANCE'
  | 'POST_VENTA'
  | 'LIBRE';

export interface WhatsAppContextData {
  clientName?: string;
  clientPhone?: string;
  workshopPhone?: string;
  vehicle?: {
    marca?: string;
    modelo?: string;
    placa?: string;
    year?: number | string;
    color?: string;
  };
  orderId?: string;
  status?: string;
  totalUSD?: number;
  paidUSD?: number;
  balancePendingUSD?: number;
  exchangeRateVES?: number;
  services?: Array<{ name: string; price: number }>;
  parts?: Array<{ name: string; quantity: number; price: number }>;
  customNote?: string;
  workshopName?: string;
  trackingUrl?: string;
  googleReviewUrl?: string;
  pagoMovil?: {
    banco: string;
    telefono: string;
    cedulaRif: string;
    titular: string;
  };
}

export const DEFAULT_PAGO_MOVIL = {
  banco: 'Banesco (0134)',
  telefono: '0414-1234567',
  cedulaRif: 'J-12345678-0',
  titular: 'Rumilcar Taller Mecánico C.A.'
};

/**
 * Construye mensajes enriquecidos con emojis, formato legible y variables dinámicas
 */
export function buildWhatsAppMessage(type: WhatsAppTemplateType, ctx: WhatsAppContextData): string {
  const workshop = ctx.workshopName || 'Rumilcar Taller Mecánico';
  const client = ctx.clientName ? ctx.clientName.trim() : 'Estimado cliente';
  const vehDesc = ctx.vehicle
    ? `${ctx.vehicle.marca || ''} ${ctx.vehicle.modelo || ''} (Placa: *${ctx.vehicle.placa || 'N/A'}*)`.trim()
    : 'su vehículo';
  const orderTag = ctx.orderId ? ` *[Orden #${ctx.orderId}]*` : '';
  const rate = ctx.exchangeRateVES || 0;
  const pm = ctx.pagoMovil || DEFAULT_PAGO_MOVIL;

  const formatVES = (usd: number) => {
    if (!rate || rate <= 0) return '';
    const ves = usd * rate;
    return ` (≈ Bs. ${ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ ${rate} Bs)`;
  };

  switch (type) {
    case 'VEHICULO_LISTO': {
      const pending = ctx.balancePendingUSD !== undefined
        ? ctx.balancePendingUSD
        : Math.max(0, (ctx.totalUSD || 0) - (ctx.paidUSD || 0));

      let msg = `¡Hola, *${client}*! 👋🚗\n\n` +
        `Te saludamos de *${workshop}*. Nos alegra informarte que los trabajos en tu *${vehDesc}*${orderTag} han concluido exitosamente y tu auto ya se encuentra *LISTO PARA RETIRO*. ✅\n\n`;

      if (pending > 0) {
        msg += `💳 *Estado de cuenta:*\n` +
          `• Saldo pendiente: *$${pending.toFixed(2)} USD*${formatVES(pending)}\n` +
          `• Métodos aceptados: Efectivo, Pago Móvil, Zelle o USDT.\n\n`;
      } else {
        msg += `✨ Tu orden se encuentra *100% saldada*.\n\n`;
      }

      if (ctx.customNote) {
        msg += `📝 *Nota del taller:* ${ctx.customNote}\n\n`;
      }

      if (ctx.trackingUrl) {
        msg += `📱 *Revisión digital:* ${ctx.trackingUrl}\n\n`;
      }

      msg += `📍 *Horario de entrega:* Lunes a Viernes de 8:00 AM a 5:00 PM.\n` +
        `Si deseas coordinar tu hora de llegada o requieres asistencia adicional, por favor respóndenos a este mensaje. ¡Gracias por confiar en *${workshop}*! 🙌`;
      return msg;
    }

    case 'PRESUPUESTO': {
      let msg = `Estimado(a) *${client}*, un cordial saludo de *${workshop}* 🔧\n\n` +
        `Compartimos contigo la propuesta de servicio y cotización para tu *${vehDesc}*${orderTag}:\n\n`;

      if (ctx.services && ctx.services.length > 0) {
        msg += `🛠️ *SERVICIOS Y MANO DE OBRA:*\n`;
        ctx.services.forEach(s => {
          msg += `• ${s.name}: $${(s.price || 0).toFixed(2)}\n`;
        });
        msg += `\n`;
      }

      if (ctx.parts && ctx.parts.length > 0) {
        msg += `🔩 *REPUESTOS E INSUMOS:*\n`;
        ctx.parts.forEach(p => {
          const sub = (p.price || 0) * (p.quantity || 1);
          msg += `• ${p.quantity}x ${p.name}: $${sub.toFixed(2)}\n`;
        });
        msg += `\n`;
      }

      const total = ctx.totalUSD || 0;
      msg += `💵 *TOTAL ESTIMADO: $${total.toFixed(2)} USD*${formatVES(total)}\n\n`;

      if (ctx.customNote) {
        msg += `ℹ️ *Observaciones:* ${ctx.customNote}\n\n`;
      }

      msg += `🛡️ _Todos nuestros trabajos cuentan con garantía de servicio y repuestos certificados._\n\n`;

      if (ctx.trackingUrl) {
        msg += `📱 *Ver detalle y fotos en vivo:* ${ctx.trackingUrl}\n\n`;
      }

      msg += `✅ *Para autorizar el inicio de los trabajos*, solo respóndenos a este mensaje confirmando tu aprobación. ¡Estamos a tu orden!`;
      return msg;
    }

    case 'PRESUPUESTO_TALLER': {
      let msg = `📋 *PRESUPUESTO DE SERVICIO - ${workshop.toUpperCase()}*\n` +
        `_Copia para Taller / Registro interno de cotización_${orderTag}\n\n` +
        `👤 *Cliente:* ${client}\n` +
        `📞 *Teléfono Cliente:* ${ctx.clientPhone || 'No registrado'}\n` +
        `🚗 *Vehículo:* ${vehDesc}\n\n`;

      if (ctx.services && ctx.services.length > 0) {
        msg += `🛠️ *SERVICIOS Y MANO DE OBRA:*\n`;
        ctx.services.forEach(s => {
          msg += `• ${s.name}: $${(s.price || 0).toFixed(2)}\n`;
        });
        msg += `\n`;
      }

      if (ctx.parts && ctx.parts.length > 0) {
        msg += `🔩 *REPUESTOS E INSUMOS:*\n`;
        ctx.parts.forEach(p => {
          const sub = (p.price || 0) * (p.quantity || 1);
          msg += `• ${p.quantity}x ${p.name}: $${sub.toFixed(2)}\n`;
        });
        msg += `\n`;
      }

      const total = ctx.totalUSD || 0;
      msg += `💵 *TOTAL ESTIMADO: $${total.toFixed(2)} USD*${formatVES(total)}\n\n`;

      if (ctx.customNote) {
        msg += `ℹ️ *Observaciones:* ${ctx.customNote}\n\n`;
      }

      if (ctx.trackingUrl) {
        msg += `📱 *Portal Digital / Seguimiento:* ${ctx.trackingUrl}\n\n`;
      }

      msg += `📌 _Presupuesto listo para validación, compra de repuestos o contacto con el cliente._`;
      return msg;
    }

    case 'COBRANZA': {
      const pending = ctx.balancePendingUSD !== undefined
        ? ctx.balancePendingUSD
        : Math.max(0, (ctx.totalUSD || 0) - (ctx.paidUSD || 0));

      let msg = `Hola, *${client}*, esperamos te encuentres muy bien. Te contactamos del equipo de *${workshop}* 🚗\n\n` +
        `Te compartimos el balance actualizado correspondiente a los servicios realizados a tu *${vehDesc}*${orderTag}:\n\n` +
        `💰 *Monto pendiente:* *$${pending.toFixed(2)} USD*${formatVES(pending)}\n\n` +
        `📲 *DATOS PARA PAGO MÓVIL:*\n` +
        `• Banco: *${pm.banco}*\n` +
        `• Teléfono: *${pm.telefono}*\n` +
        `• Cédula / RIF: *${pm.cedulaRif}*\n` +
        `• Titular: *${pm.titular}*\n\n` +
        `_(Si prefieres cancelar vía Zelle, USDT o Efectivo en taller, avísanos para darte los datos correspondientes)._\n\n` +
        `📸 Una vez realizado el pago, por favor compártenos el comprobante o captura por este mismo chat para procesarlo en tu cuenta. ¡Muchas gracias por tu puntualidad! 🙏`;
      return msg;
    }

    case 'AVANCE': {
      let msg = `¡Hola, *${client}*! 🛠️ Te saludamos de *${workshop}*.\n\n` +
        `Queremos ponerte al día sobre los avances de tu *${vehDesc}*${orderTag}:\n\n` +
        `🔄 *Estado actual:* *${ctx.status || 'En Reparación'}*\n\n`;

      if (ctx.customNote) {
        msg += `📝 *Detalle del avance:* ${ctx.customNote}\n\n`;
      } else {
        msg += `Los trabajos técnicos continúan avanzando según el plan de servicio establecido.\n\n`;
      }

      if (ctx.trackingUrl) {
        msg += `📱 *Sigue el proceso en tiempo real (fotos y fases):*\n${ctx.trackingUrl}\n\n`;
      }

      msg += `Nuestro equipo técnico continúa trabajando para garantizar el mejor rendimiento y seguridad de tu auto. Cualquier consulta, estamos a tu orden. 👨‍🔧`;
      return msg;
    }

    case 'POST_VENTA': {
      let msg = `¡Hola, *${client}*! Esperamos que estés teniendo un excelente día. 👋\n\n` +
        `Te escribimos de *${workshop}* para saber cómo ha respondido tu *${vehDesc}* tras el servicio realizado recientemente.\n\n` +
        `Tu tranquilidad y seguridad en la vía son nuestra máxima prioridad. Recuerda que cuentas con nuestra garantía de servicio; si necesitas cualquier ajuste o chequeo preventivo, ¡las puertas de nuestro taller están abiertas para ti! 🚘\n\n`;

      if (ctx.googleReviewUrl) {
        msg += `⭐ *¿Nos regalarías 1 minuto de tu opinión?*\n` +
          `Si tu experiencia fue positiva, una calificación de 5 estrellas en Google nos ayuda enormemente a seguir creciendo como taller de confianza:\n` +
          `👉 ${ctx.googleReviewUrl}\n\n`;
      }

      msg += `¡Gracias por formar parte de la familia *${workshop}*! Que tengas una excelente semana.`;
      return msg;
    }

    case 'LIBRE':
    default: {
      return `¡Hola, *${client}*! Te saludamos de *${workshop}* referente a tu vehículo *${vehDesc}*${orderTag}.\n\n${ctx.customNote || '¿En qué podemos ayudarte el día de hoy? Estamos a tu orden.'}`;
    }
  }
}
