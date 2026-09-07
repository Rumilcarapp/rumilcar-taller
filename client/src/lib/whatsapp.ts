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
  | 'COBRANZA'
  | 'AVANCE'
  | 'POST_VENTA'
  | 'LIBRE';

export interface WhatsAppContextData {
  clientName?: string;
  clientPhone?: string;
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

      let msg = `¡Hola *${client}*! 👋🚗\n\n` +
        `Te saludamos de *${workshop}* para informarte que tu vehículo *${vehDesc}*${orderTag} ya se encuentra *COMPLETAMENTE LISTO* para su retiro en nuestras instalaciones. ✅\n\n`;

      if (pending > 0) {
        msg += `💰 *Saldo pendiente a cancelar:* *$${pending.toFixed(2)} USD*${formatVES(pending)}\n` +
          `Métodos de pago recibidos: Divisas en efectivo, Zelle, USDT o Pago Móvil.\n\n`;
      } else {
        msg += `✨ Tu orden se encuentra *100% saldada*.\n\n`;
      }

      if (ctx.customNote) {
        msg += `📝 *Nota del taller:* ${ctx.customNote}\n\n`;
      }

      msg += `📍 Horario de entrega: Lunes a Viernes de 8:00 AM a 5:00 PM.\n` +
        `¡Gracias por confiar en el equipo de ${workshop}!`;
      return msg;
    }

    case 'PRESUPUESTO': {
      let msg = `Estimado(a) *${client}*,\n\n` +
        `Le saludamos de *${workshop}*. Le compartimos el presupuesto detallado para su vehículo *${vehDesc}*${orderTag}:\n\n`;

      if (ctx.services && ctx.services.length > 0) {
        msg += `🔧 *SERVICIOS Y MANO DE OBRA:*\n`;
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

      if (ctx.trackingUrl) {
        msg += `📱 Puede consultar la orden en vivo aquí:\n${ctx.trackingUrl}\n\n`;
      }

      if (ctx.customNote) {
        msg += `ℹ️ *Observaciones:* ${ctx.customNote}\n\n`;
      }

      msg += `Por favor responda este mensaje para autorizar el inicio de los trabajos. ¡Estamos a su orden!`;
      return msg;
    }

    case 'COBRANZA': {
      const pending = ctx.balancePendingUSD !== undefined
        ? ctx.balancePendingUSD
        : Math.max(0, (ctx.totalUSD || 0) - (ctx.paidUSD || 0));

      let msg = `Hola *${client}*, un cordial saludo de *${workshop}* 🚗.\n\n` +
        `Le recordamos amablemente que mantiene un saldo pendiente de *$${pending.toFixed(2)} USD*${formatVES(pending)} ` +
        `correspondiente a los servicios prestados a su vehículo *${vehDesc}*${orderTag}.\n\n` +
        `📲 *DATOS PARA PAGO MÓVIL:*\n` +
        `• Banco: *${pm.banco}*\n` +
        `• Teléfono: *${pm.telefono}*\n` +
        `• Cédula / RIF: *${pm.cedulaRif}*\n` +
        `• Titular: *${pm.titular}*\n\n` +
        `Si realiza el pago en Bolívares o vía Zelle/USDT, por favor envíenos el capture por este medio para registrar su abono. ¡Muchas gracias! 🙏`;
      return msg;
    }

    case 'AVANCE': {
      let msg = `Hola *${client}*! 🛠️ Le informamos sobre el avance de su vehículo *${vehDesc}*${orderTag}:\n\n` +
        `Estado actual: *${ctx.status || 'En Reparación'}*\n\n`;

      if (ctx.customNote) {
        msg += `Detalles: ${ctx.customNote}\n\n`;
      } else {
        msg += `Los trabajos continúan según el cronograma acordado. Le mantendremos informado tan pronto concluyan las pruebas.\n\n`;
      }

      msg += `Cualquier consulta no dude en escribirnos por este chat. Saludos, equipo *${workshop}*.`;
      return msg;
    }

    case 'POST_VENTA': {
      return `Hola *${client}*, esperamos que estés excelente. 👋\n\n` +
        `Te escribimos de *${workshop}* para saber cómo se ha comportado tu *${vehDesc}* tras los trabajos realizados recientemente.\n\n` +
        `Tu satisfacción y la seguridad de tu auto son nuestra prioridad número 1. Si sientes algún detalle o requieres una revisión preventiva de cortesía, ¡las puertas del taller están abiertas!\n\n` +
        `¡Que tengas un excelente día!`;
    }

    case 'LIBRE':
    default: {
      return `Hola *${client}*, le saludamos de *${workshop}* referente a su vehículo *${vehDesc}*${orderTag}. ${ctx.customNote || '¿En qué podemos ayudarle el día de hoy?'}`;
    }
  }
}
