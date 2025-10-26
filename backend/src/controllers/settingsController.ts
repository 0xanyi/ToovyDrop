import { Response } from 'express';
import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import auditService from '../services/auditService';
import logger from '../utils/logger';
import Joi from 'joi';

// Define upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'system');
const LOGIN_BG_KEY = 'login_background_image';

// Ensure upload directory exists
const ensureUploadDir = async () => {
  if (!existsSync(UPLOAD_DIR)) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
};

// Configure multer for login background image upload
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `login-bg-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

export const uploadLoginBackgroundMiddleware = upload.single('image');

// Validation schema
const uploadBackgroundSchema = Joi.object({
  filename: Joi.string().required(),
  mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
  size: Joi.number().max(10 * 1024 * 1024).required(),
});

/**
 * Upload login background image (Admin only)
 */
export const uploadLoginBackground = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400, 'NO_FILE');
    }

    // Validate file
    const { error } = uploadBackgroundSchema.validate({
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (error) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      throw new AppError(
        `Validation failed: ${error.details.map((d) => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Get existing background to delete it later
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { key: LOGIN_BG_KEY },
    });

    // Save new background path to database
    await prisma.systemSetting.upsert({
      where: { key: LOGIN_BG_KEY },
      update: {
        value: req.file.filename,
        updatedBy: req.user!.id,
      },
      create: {
        key: LOGIN_BG_KEY,
        value: req.file.filename,
        updatedBy: req.user!.id,
      },
    });

    // Delete old background file if it exists
    if (existingSetting?.value) {
      const oldFilePath = path.join(UPLOAD_DIR, existingSetting.value);
      await fs.unlink(oldFilePath).catch((err) => {
        logger.warn(`Failed to delete old background image: ${err.message}`);
      });
    }

    // Log the action
    await auditService.recordEvent({
      action: 'UPLOAD_LOGIN_BACKGROUND',
      entityType: 'SYSTEM_SETTING',
      entityId: LOGIN_BG_KEY,
      actorId: req.user!.id,
      metadata: {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

    logger.info(`Login background image uploaded: ${req.file.filename}`);

    const response: ApiResponse = {
      success: true,
      data: {
        filename: req.file.filename,
        message: 'Login background image uploaded successfully',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error uploading login background:', error);
    throw new AppError('Failed to upload login background image', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get current login background image (Public)
 */
export const getLoginBackground = async (_req: Request, res: Response): Promise<void> => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: LOGIN_BG_KEY },
    });

    if (!setting || !setting.value) {
      const response: ApiResponse = {
        success: true,
        data: null,
      };
      res.status(200).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        filename: setting.value,
        url: `/api/settings/login-background/image`,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching login background:', error);
    throw new AppError('Failed to fetch login background image', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Serve login background image file (Public)
 */
export const serveLoginBackground = async (_req: Request, res: Response): Promise<void> => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: LOGIN_BG_KEY },
    });

    if (!setting || !setting.value) {
      throw new AppError('No login background image configured', 404, 'NOT_FOUND');
    }

    const filePath = path.join(UPLOAD_DIR, setting.value);

    // Check if file exists
    if (!existsSync(filePath)) {
      logger.error(`Login background file not found: ${filePath}`);
      throw new AppError('Login background image file not found', 404, 'NOT_FOUND');
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.setHeader('Content-Type', 'image/jpeg'); // Default, will be overridden by sendFile

    res.sendFile(filePath);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error serving login background:', error);
    throw new AppError('Failed to serve login background image', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Delete login background image (Admin only)
 */
export const deleteLoginBackground = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: LOGIN_BG_KEY },
    });

    if (!setting || !setting.value) {
      throw new AppError('No login background image to delete', 404, 'NOT_FOUND');
    }

    const filePath = path.join(UPLOAD_DIR, setting.value);
    const filename = setting.value;

    // Delete from database
    await prisma.systemSetting.delete({
      where: { key: LOGIN_BG_KEY },
    });

    // Delete file
    await fs.unlink(filePath).catch((err) => {
      logger.warn(`Failed to delete background image file: ${err.message}`);
    });

    // Log the action
    await auditService.recordEvent({
      action: 'DELETE_LOGIN_BACKGROUND',
      entityType: 'SYSTEM_SETTING',
      entityId: LOGIN_BG_KEY,
      actorId: req.user!.id,
      metadata: {
        filename,
      },
    });

    logger.info(`Login background image deleted: ${filename}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Login background image deleted successfully',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error deleting login background:', error);
    throw new AppError('Failed to delete login background image', 500, 'INTERNAL_ERROR');
  }
};
