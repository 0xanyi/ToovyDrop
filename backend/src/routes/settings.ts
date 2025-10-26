import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  uploadLoginBackground,
  getLoginBackground,
  serveLoginBackground,
  deleteLoginBackground,
  uploadLoginBackgroundMiddleware,
} from '../controllers/settingsController';

const router = Router();

/**
 * Public routes
 */

/**
 * GET /api/settings/login-background
 * Get current login background image metadata (public)
 */
router.get('/login-background', getLoginBackground);

/**
 * GET /api/settings/login-background/image
 * Serve the login background image file (public)
 */
router.get('/login-background/image', serveLoginBackground);

/**
 * Admin-only routes
 */

/**
 * POST /api/settings/login-background
 * Upload a new login background image (admin only)
 */
router.post(
  '/login-background',
  authenticate,
  authorize(['ADMIN']),
  uploadLoginBackgroundMiddleware,
  uploadLoginBackground
);

/**
 * DELETE /api/settings/login-background
 * Delete the current login background image (admin only)
 */
router.delete('/login-background', authenticate, authorize(['ADMIN']), deleteLoginBackground);

export default router;
