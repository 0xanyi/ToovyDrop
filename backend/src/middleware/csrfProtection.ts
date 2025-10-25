import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppError } from './errorHandler';
import CsrfService from '../services/csrfService';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXCLUDED_PATHS = new Set([
  '/api/security/csrf-token',
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/files/upload/chunk', // Chunked uploads are already authenticated and rate-limited
  '/api/files/upload/initialize'
]);

/**
 * Middleware enforcing CSRF protection for state-changing requests.
 * Clients must include a valid token in the `x-csrf-token` header.
 */
export const csrfProtection = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (EXCLUDED_PATHS.has(req.path)) {
    next();
    return;
  }

  const headerToken = req.headers['x-csrf-token'] ?? req.headers['csrf-token'];
  const token =
    Array.isArray(headerToken) && headerToken.length > 0
      ? headerToken[0]
      : (headerToken as string | undefined);

  if (!token) {
    next(new AppError('CSRF token is required for this request', 403, 'CSRF_ERROR'));
    return;
  }

  const userId = req.user?.id;
  const isValid = CsrfService.consumeToken(token, userId);

  if (!isValid) {
    next(new AppError('Invalid or expired CSRF token', 403, 'CSRF_ERROR'));
    return;
  }

  next();
};
