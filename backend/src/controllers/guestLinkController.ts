import { Request, Response } from 'express';
import { GuestLinkService, GuestLinkConfig } from '../services/guestLinkService';
import { prisma } from '../app';
import { ApiResponse } from '../types';

// Initialize service after prisma is available
let guestLinkService: GuestLinkService;

function getGuestLinkService() {
  if (!guestLinkService) {
    guestLinkService = new GuestLinkService(prisma);
  }
  return guestLinkService;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Create a new guest upload link (Admin only)
 */
export const createGuestLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const { description, expiresAt, maxUploads, guestFolder } = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      } as ApiResponse);
      return;
    }

    // Validate required fields
    if (!channelId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Channel ID is required'
        }
      } as ApiResponse);
      return;
    }

    const config: GuestLinkConfig = {
      description: description?.trim(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUploads: maxUploads ? parseInt(maxUploads, 10) : undefined,
      guestFolder: guestFolder?.trim()
    };

    // Validate expiration date format
    if (config.expiresAt && isNaN(config.expiresAt.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid expiration date format'
        }
      } as ApiResponse);
      return;
    }

    // Validate max uploads
    if (config.maxUploads !== undefined && (isNaN(config.maxUploads) || config.maxUploads <= 0)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum uploads must be a positive number'
        }
      } as ApiResponse);
      return;
    }

    const result = await getGuestLinkService().createLink(channelId, config, createdBy);

    if (result.success) {
      res.status(201).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Create guest link error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get all guest links for a channel (Admin only)
 */
export const getChannelGuestLinks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;

    if (!channelId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Channel ID is required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getGuestLinkService().getChannelLinks(channelId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get channel guest links error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Update a guest link (Admin only)
 */
export const updateGuestLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { linkId } = req.params;
    const { description, expiresAt, maxUploads, guestFolder, isActive } = req.body;

    if (!linkId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Link ID is required'
        }
      } as ApiResponse);
      return;
    }

    const updates: Partial<GuestLinkConfig & { isActive?: boolean }> = {};

    if (description !== undefined) {
      updates.description = description?.trim();
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        (updates as Record<string, unknown>).expiresAt = null;
      } else {
        const parsedDate = new Date(expiresAt);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid expiration date format'
            }
          } as ApiResponse);
          return;
        }
        updates.expiresAt = parsedDate;
      }
    }

    if (maxUploads !== undefined) {
      if (maxUploads === null) {
        (updates as Record<string, unknown>).maxUploads = null;
      } else {
        const parsedMaxUploads = parseInt(maxUploads, 10);
        if (isNaN(parsedMaxUploads) || parsedMaxUploads <= 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Maximum uploads must be a positive number'
            }
          } as ApiResponse);
          return;
        }
        updates.maxUploads = parsedMaxUploads;
      }
    }

    if (guestFolder !== undefined) {
      updates.guestFolder = guestFolder?.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one field must be provided for update'
        }
      } as ApiResponse);
      return;
    }

    const result = await getGuestLinkService().updateLink(linkId, updates);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Update guest link error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Delete a guest link (Admin only)
 */
export const deleteGuestLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { linkId } = req.params;

    if (!linkId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Link ID is required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getGuestLinkService().deleteLink(linkId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Delete guest link error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Validate a guest link token (Public endpoint)
 */
export const validateGuestLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getGuestLinkService().validateToken(token);

    if (result.success) {
      // Transform the data to match frontend expectations
      const transformedData = {
        channel: {
          id: result.data!.channel.id,
          name: result.data!.channel.name,
          // Note: channels don't have descriptions, only guest links do
        },
        link: {
          id: result.data!.guestLink.id,
          description: result.data!.guestLink.description,
          maxUploads: result.data!.guestLink.maxUploads,
          uploadCount: result.data!.guestLink.uploadCount,
          guestFolder: result.data!.guestLink.guestFolder,
          expiresAt: result.data!.guestLink.expiresAt,
        },
        uploadConfig: {
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5368709120', 10), // Use env setting, default 5GB
          allowedMimeTypes: [], // Allow all mime types for now
          chunkSize: parseInt(process.env.CHUNK_SIZE || '5242880', 10), // Use env setting, default 5MB
        }
      };

      res.status(200).json({
        success: true,
        data: transformedData
      });
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                        result.error?.code === 'AUTHORIZATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Validate guest link error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Upload file via guest link (Public endpoint)
 */
export const uploadViaGuestLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required'
        }
      } as ApiResponse);
      return;
    }

    // Validate the token first
    const validationResult = await getGuestLinkService().validateToken(token);

    if (!validationResult.success) {
      const statusCode = validationResult.error?.code === 'NOT_FOUND' ? 404 :
                        validationResult.error?.code === 'AUTHORIZATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(validationResult);
      return;
    }

    const { guestLink, channel } = validationResult.data!;

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file provided'
        }
      } as ApiResponse);
      return;
    }

    // Import required services
    const { FileService } = await import('../services/fileService');
    const malwareScanner = (await import('../services/malwareScanner')).default;
    const auditService = (await import('../services/auditService')).default;

    const fileService = new FileService(prisma);

    // Get file information from multer
    const originalFilename = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    const fileBuffer = req.file.buffer;

    // Validate file size using environment setting
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5368709120', 10); // Default 5GB
    if (fileSize > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds ${maxSizeMB}MB limit for guest uploads`
        }
      } as ApiResponse);
      return;
    }

    // Create temporary file for processing
    const fs = await import('fs-extra');
    const path = await import('path');
    const { v4: uuidv4 } = await import('uuid');

    const tempDir = path.join(process.cwd(), 'temp', 'uploads');
    await fs.ensureDir(tempDir);
    
    const tempFileId = uuidv4();
    const tempFilePath = path.join(tempDir, `${tempFileId}_${originalFilename}`);
    
    // Write buffer to temporary file
    await fs.writeFile(tempFilePath, fileBuffer);

    try {
      // Perform malware scanning
      const scanResult = await malwareScanner.scanFile(tempFilePath, originalFilename);

      if (!scanResult.clean) {
        console.warn('Guest upload blocked by malware scan', {
          token,
          filename: originalFilename,
          signature: scanResult.signature,
          details: scanResult.details,
        });

        // Clean up temporary file
        await fs.remove(tempFilePath);

        await auditService.recordEvent({
          action: 'GUEST_UPLOAD_BLOCKED_MALWARE',
          actorId: undefined,
          actorEmail: undefined,
          entityType: 'GUEST_UPLOAD',
          entityId: guestLink.id,
          metadata: {
            token,
            filename: originalFilename,
            signature: scanResult.signature,
            details: scanResult.details,
          },
          ipAddress: req.ip,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File failed security scan',
            details: scanResult.details || 'Potential malware detected in uploaded file.'
          }
        } as ApiResponse);
        return;
      }

      // Upload to FTP with guest attribution
      const fileId = await fileService.uploadToFtp({
        filename: originalFilename,
        mimeType,
        size: fileSize,
        totalBytes: fileSize,
        channelId: channel.id,
        uploadedBy: 'guest', // Mark as guest upload
        tempFilePath,
        isGuestUpload: true,
        guestUploadLinkId: guestLink.id,
      });

      // Increment upload count for the guest link
      await getGuestLinkService().incrementUploadCount(guestLink.id);

      // Check if upload limit is reached and deactivate if necessary
      if (guestLink.maxUploads && (guestLink.uploadCount + 1) >= guestLink.maxUploads) {
        await getGuestLinkService().deactivateLink(guestLink.id);
      }

      console.info(`Guest file uploaded successfully: ${fileId} via token ${token}`);

      await auditService.recordEvent({
        action: 'GUEST_UPLOAD_SUCCESS',
        actorId: undefined,
        actorEmail: undefined,
        entityType: 'FILE',
        entityId: fileId,
        metadata: {
          token,
          channelId: channel.id,
          filename: originalFilename,
          size: fileSize,
          guestLinkId: guestLink.id,
        },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          fileId,
          filename: originalFilename,
          size: fileSize,
          uploadedAt: new Date().toISOString(),
          message: 'File uploaded successfully'
        }
      } as ApiResponse);

    } catch (uploadError) {
      console.error('Error uploading guest file:', uploadError);
      
      // Clean up temporary file
      await fs.remove(tempFilePath).catch(() => {});

      await auditService.recordEvent({
        action: 'GUEST_UPLOAD_FAILED',
        actorId: undefined,
        actorEmail: undefined,
        entityType: 'GUEST_UPLOAD',
        entityId: guestLink.id,
        metadata: {
          token,
          filename: originalFilename,
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        },
        ipAddress: req.ip,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload file',
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        }
      } as ApiResponse);
    }
  } catch (error) {
    console.error('Upload via guest link error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};