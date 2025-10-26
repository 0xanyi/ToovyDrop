import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import {
  parseAllowedOrigins,
  isOriginAllowed,
  buildConnectSrcDirectives,
} from './utils/cors';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import channelRoutes from './routes/channels';
import fileRoutes from './routes/files';
import adminRoutes from './routes/admin';
import performanceRoutes from './routes/performance';
import securityRoutes from './routes/security';
import guestLinkRoutes from './routes/guestLinks';
import settingsRoutes from './routes/settings';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { generalRateLimit, uploadRateLimit, authRateLimit, downloadRateLimit, adminRateLimit } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrfProtection';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Initialize Redis client
export const redis = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD || undefined,
});

// Create Express app
export const app = express();

const allowedOrigins = parseAllowedOrigins(
  process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN,
);
const allowAllOrigins = allowedOrigins.includes('*');
const connectSrcDirectives = buildConnectSrcDirectives(
  allowedOrigins,
  process.env.CSP_ADDITIONAL_CONNECT_SRC,
);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'connect-src': connectSrcDirectives,
    },
  },
}));

// CORS middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowAllOrigins || isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing middleware - use larger limits for file uploads
const bodyLimit = process.env.NODE_ENV === 'production' ? '50mb' : '100mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Request logging middleware
app.use(requestLogger);

// Apply general rate limiting to all API routes
app.use('/api', generalRateLimit);

// Security utility routes (e.g., CSRF token)
app.use('/api/security', securityRoutes);

// Public settings routes (login background, etc.) - before CSRF protection
app.use('/api/settings', settingsRoutes);

// Public guest upload routes (before CSRF protection)
app.use('/api/guest-links', uploadRateLimit, guestLinkRoutes);

// Apply CSRF protection to state-changing requests
app.use(csrfProtection);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/files', uploadRateLimit, fileRoutes);
app.use('/api/files/:fileId/download', downloadRateLimit);
app.use('/api/admin', adminRateLimit, adminRoutes);
app.use('/api/performance', performanceRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export { PrismaClient };

export default app;
