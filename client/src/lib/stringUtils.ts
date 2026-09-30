/**
 * Utility functions for string formatting and input normalization.
 */

/**
 * Capitalizes the first letter of each word in a name/text (Title Case).
 * Works in real-time while typing: if the keyboard is in lowercase,
 * each word automatically begins with an uppercase letter.
 * Supports Unicode accents (á, é, í, ó, ú, ñ, etc.) and hyphens.
 *
 * Example:
 * 'r' -> 'R'
 * 'roberto perez' -> 'Roberto Perez'
 * 'ana-maria gomez' -> 'Ana-Maria Gomez'
 * 'ángel ñáñez' -> 'Ángel Ñáñez'
 */
export const capitalizeWords = (value: string): string => {
  if (!value) return '';
  return value.replace(/(?:^|[\s\-])\p{L}/gu, (char) => char.toUpperCase());
};
