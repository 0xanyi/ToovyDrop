import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token for guest upload links
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a complete guest upload URL from a token
 */
export function generateGuestUploadUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/guest-upload/${token}`;
}

/**
 * Validate token format (basic validation)
 */
export function isValidTokenFormat(token: string): boolean {
  // Token should be a hex string of at least 32 characters
  return /^[a-f0-9]{32,}$/i.test(token);
}