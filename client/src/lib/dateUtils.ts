/**
 * Rumilcar App - Safe Date Formatting and Timezone Utilities
 * Prevents "RangeError: Invalid time value" across mobile browsers and ensures
 * dates do not shift to the previous day due to UTC midnight conversion.
 */

/**
 * Returns a valid Date instance or a safe fallback (today).
 */
export function safeDate(val: any, fallback: Date = new Date()): Date {
  if (!val) return fallback;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback : val;
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

/**
 * Formats a Date or date string to 'YYYY-MM-DD' using local calendar parts.
 * This avoids the classic UTC shift where local midnight (e.g. UTC-4 in Venezuela)
 * drops to the previous day when calling .toISOString().
 */
export function formatLocalDateStr(val: any): string {
  const d = safeDate(val);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safe wrapper around .toISOString() that never throws RangeError.
 */
export function safeToISOString(val: any, fallback?: string): string {
  try {
    const d = safeDate(val);
    return d.toISOString();
  } catch {
    return fallback || new Date().toISOString();
  }
}

/**
 * Formats a human-readable title for the Agenda header.
 */
export function formatAgendaTitle(val: any): string {
  const d = safeDate(val);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayName = days[d.getDay()] || 'Hoy';
  const monthName = months[d.getMonth()] || '';
  return `Agenda del ${dayName}, ${d.getDate()} de ${monthName}`;
}
