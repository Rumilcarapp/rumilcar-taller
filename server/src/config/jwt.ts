const configuredJwtSecret = process.env.JWT_SECRET?.trim();
if (process.env.NODE_ENV === 'production' && !configuredJwtSecret) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}
export const JWT_SECRET = configuredJwtSecret || 'development-only-secret-change-me';
export const JWT_EXPIRES_IN = '7d';
