import { Router } from 'express';
import multer from 'multer';
import {
  validateGuestLink,
  uploadViaGuestLink
} from '../controllers/guestLinkController';

const router = Router();

// Configure multer for guest file uploads (single file, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5368709120', 10), // Use env setting, default 5GB
  },
});

/**
 * GET /api/guest-links/:token/validate
 * Validate a guest link token and return link details
 */
router.get('/:token/validate', validateGuestLink);

/**
 * POST /api/guest-links/:token/upload
 * Upload file via guest link
 */
router.post('/:token/upload', upload.single('file'), uploadViaGuestLink);

export default router;