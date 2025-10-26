import { Router } from 'express';
import {
  parseAllowedOrigins,
  isOriginAllowed,
  buildConnectSrcDirectives,
} from '../utils/cors';

const router = Router();

/**
 * GET /api/debug/cors
 * Debug CORS configuration to troubleshoot issues
 */
router.get('/cors', (req, res) => {
  const origin = req.headers.origin as string | undefined;
  
  const originCandidates = [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.CORS_ADDITIONAL_ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
  ].filter((value): value is string => {
    if (typeof value !== 'string') {
      return false;
    }
    return value.trim().length > 0;
  });

  const allowedOrigins = parseAllowedOrigins(
    originCandidates.length > 0 ? originCandidates : undefined,
  );
  const allowAllOrigins = allowedOrigins.includes('*');
  const connectSrcDirectives = buildConnectSrcDirectives(
    allowedOrigins,
    process.env.CSP_ADDITIONAL_CONNECT_SRC,
  );

  const isAllowed = isOriginAllowed(origin, allowedOrigins);

  res.json({
    success: true,
    data: {
      environment: {
        CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        CORS_ADDITIONAL_ALLOWED_ORIGINS: process.env.CORS_ADDITIONAL_ALLOWED_ORIGINS,
        FRONTEND_URL: process.env.FRONTEND_URL,
        FRONTEND_URLS: process.env.FRONTEND_URLS,
        CSP_ADDITIONAL_CONNECT_SRC: process.env.CSP_ADDITIONAL_CONNECT_SRC,
      },
      parsed: {
        allowedOrigins,
        allowAllOrigins,
        connectSrcDirectives,
      },
      request: {
        origin,
        isAllowed,
        userAgent: req.headers['user-agent'],
      },
      headers: {
        'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
        'access-control-allow-credentials': res.getHeader('access-control-allow-credentials'),
      },
    },
  });
});

export default router;
