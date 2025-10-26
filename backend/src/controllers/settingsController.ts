import { Response } from 'express';
import { Request } from 'express';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import auditService from '../services/auditService';
import logger from '../utils/logger';
import Joi from 'joi';

const LOGIN_BG_KEY = 'login_background_image';

// Validation schema for URL
const setBackgroundUrlSchema = Joi.object({
  url: Joi.string().uri().required().max(2048),
});

/**
 * Set login background image URL (Admin only)
 */
export const setLoginBackgroundUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { error, value } = setBackgroundUrlSchema.validate(req.body);

    if (error) {
      throw new AppError(
        `Validation failed: ${error.details.map((d) => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { url } = value;

    // Save background URL to database
    await prisma.systemSetting.upsert({
      where: { key: LOGIN_BG_KEY },
      update: {
        value: url,
        updatedBy: req.user!.id,
      },
      create: {
        key: LOGIN_BG_KEY,
        value: url,
        updatedBy: req.user!.id,
      },
    });

    // Log the action
    await auditService.recordEvent({
      action: 'SET_LOGIN_BACKGROUND_URL',
      entityType: 'SYSTEM_SETTING',
      entityId: LOGIN_BG_KEY,
      actorId: req.user!.id,
      metadata: {
        url,
      },
    });

    logger.info(`Login background URL set: ${url}`);

    const response: ApiResponse = {
      success: true,
      data: {
        url,
        message: 'Login background URL set successfully',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error setting login background URL:', error);
    throw new AppError('Failed to set login background URL', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get current login background URL (Public)
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
        url: setting.value,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error fetching login background:', error);
    throw new AppError('Failed to fetch login background URL', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Delete login background URL (Admin only)
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
      throw new AppError('No login background URL to delete', 404, 'NOT_FOUND');
    }

    const url = setting.value;

    // Delete from database
    await prisma.systemSetting.delete({
      where: { key: LOGIN_BG_KEY },
    });

    // Log the action
    await auditService.recordEvent({
      action: 'DELETE_LOGIN_BACKGROUND_URL',
      entityType: 'SYSTEM_SETTING',
      entityId: LOGIN_BG_KEY,
      actorId: req.user!.id,
      metadata: {
        url,
      },
    });

    logger.info(`Login background URL deleted: ${url}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Login background URL deleted successfully',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error deleting login background:', error);
    throw new AppError('Failed to delete login background URL', 500, 'INTERNAL_ERROR');
  }
};
