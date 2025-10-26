import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  setLoginBackgroundUrl,
  getLoginBackground,
  deleteLoginBackground,
} from '../controllers/settingsController';

const router = Router();

/**
 * Public routes
 */

/**
 * GET /api/settings/login-background
 * Get current login background URL (public)
 */
router.get('/login-background', getLoginBackground);

/**
 * Admin-only routes
 */

/**
 * POST /api/settings/login-background
 * Set login background image URL (admin only)
 * Body: { url: string }
 */
router.post(
  '/login-background',
  authenticate,
  authorize(['ADMIN']),
  setLoginBackgroundUrl
);

/**
 * DELETE /api/settings/login-background
 * Delete the current login background URL (admin only)
 */
router.delete('/login-background', authenticate, authorize(['ADMIN']), deleteLoginBackground);

export default router;
