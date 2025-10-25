import { Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { FileService } from '../services/fileService';
import { UploadService } from '../services/uploadService';
import { websocketService } from '../services/websocketService';
import malwareScanner from '../services/malwareScanner';
import auditService from '../services/auditService';
import logger from '../utils/logger';
import Joi from 'joi';
import { AuthenticatedRequest } from '../middleware/auth';

// Lazy-load services to avoid circular dependency issues
let fileService: FileService;
let uploadService: UploadService;

const getFileService = async () => {
  if (!fileService) {
    const { prisma } = await import('../app');
    fileService = new FileService(prisma);
  }
  return fileService;
};

const getUploadService = () => {
  if (!uploadService) {
    uploadService = new UploadService();
  }
  return uploadService;
};

// Configure multer for chunked uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per chunk
  },
});

// Validation schemas
const initializeUploadSchema = Joi.object({
  filename: Joi.string().required().max(255),
  mimeType: Joi.string().required(),
  size: Joi.number().integer().positive().required().max(5 * 1024 * 1024 * 1024), // 5GB
  channelId: Joi.string().uuid().required(),
});

const chunkUploadSchema = Joi.object({
  uploadId: Joi.string().uuid().required(),
  chunkIndex: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
  ).required(),
  totalChunks: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
  ).required(),
  chunkSize: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
  ).required(),
  totalSize: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
  ).required(),
  filename: Joi.string().required().max(255),
  mimeType: Joi.string().required(),
  channelId: Joi.string().uuid().required(),
});

const listFilesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  channelId: Joi.string().uuid().required(),
});

const searchFilesSchema = Joi.object({
  query: Joi.string().min(1).max(100).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  channelId: Joi.string().uuid().required(),
});

const renameFileSchema = Joi.object({
  newName: Joi.string().required().max(255).min(1),
});

/**
 * Initialize a new file upload session
 */
export const initializeUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = initializeUploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { filename, mimeType, size, channelId } = value;
    const userId = req.user!.id;

    // Import prisma dynamically
    const { prisma } = await import('../app');

    // Verify channel exists and user has access
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || !channel.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found or inactive',
      });
    }

    // Check user permissions (simplified check)
    const userChannel = await prisma.userChannel.findFirst({
      where: { userId, channelId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userChannel && user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this channel',
      });
    }

    const uploadSvc = getUploadService();
    const result = await uploadSvc.initializeUpload(
      filename,
      mimeType,
      size,
      channelId,
      userId
    );

    logger.info(`Upload initialized: ${result.uploadId} by user ${userId}`);

    // Broadcast WebSocket notification
    websocketService.broadcastUploadProgress(userId, result.uploadId, {
      status: 'initialized',
      filename,
      size,
      totalChunks: result.totalChunks,
      progress: 0,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error initializing upload:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize upload',
    });
  }
};

/**
 * Upload a file chunk
 */
export const uploadChunk = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = chunkUploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file chunk provided',
      });
    }

    const {
      uploadId,
      chunkIndex,
      totalChunks,
      chunkSize,
      totalSize,
      filename,
      mimeType,
      channelId,
    } = value;

    const userId = req.user!.id;

    // Import prisma dynamically
    const { prisma } = await import('../app');

    // Verify channel access (simplified)
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || !channel.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found or inactive',
      });
    }

    const uploadSvc = getUploadService();
    
    // Log the upload ID being used for chunk upload
    logger.info(`Processing chunk upload for upload ID: ${uploadId}, chunk ${chunkIndex}/${totalChunks}`);
    
    const result = await uploadSvc.uploadChunk(
      req.file.buffer,
      uploadId,
      chunkIndex,
      totalChunks,
      chunkSize,
      totalSize,
      filename,
      mimeType,
      channelId,
      userId
    );

    if (result.uploadComplete) {
      // Upload is complete, now transfer to FTP
      const uploadData = await uploadSvc.completeUpload(uploadId);

      // Perform malware scanning before transferring to FTP
      const scanResult = await malwareScanner.scanFile(
        uploadData.tempFilePath,
        uploadData.originalFilename
      );

      if (!scanResult.clean) {
        logger.warn('Upload blocked by malware scan', {
          uploadId,
          userId,
          signature: scanResult.signature,
          details: scanResult.details,
        });

        // Clean up the upload session and temporary file
        await uploadSvc.cancelUpload(uploadId);

        await auditService.recordEvent({
          action: 'UPLOAD_BLOCKED_MALWARE',
          actorId: req.user?.id,
          actorEmail: req.user?.email,
          entityType: 'FILE_UPLOAD',
          entityId: uploadId,
          metadata: {
            filename: uploadData.originalFilename,
            signature: scanResult.signature,
            details: scanResult.details,
          },
          ipAddress: req.ip,
        });

        websocketService.broadcastUploadError(
          userId,
          uploadId,
          'File failed security scan'
        );

        res.status(400).json({
          success: false,
          error: 'File failed security scan',
          details: scanResult.details || 'Potential malware detected in uploaded file.',
        });
        return;
      }
      
      // Broadcast completion status
      websocketService.broadcastUploadProgress(userId, uploadId, {
        status: 'processing',
        progress: 100,
        message: 'Upload complete, transferring to FTP...',
      });
      
      try {
        const fileSvc = await getFileService();
        const fileId = await fileSvc.uploadToFtp({
          filename: uploadData.originalFilename,
          mimeType: uploadData.mimeType,
          size: uploadData.size,
          totalBytes: uploadData.size,
          channelId: uploadData.channelId,
          uploadedBy: uploadData.uploadedBy,
          tempFilePath: uploadData.tempFilePath,
        });

        logger.info(`File uploaded successfully: ${fileId}`);

        // Broadcast successful completion
        websocketService.broadcastUploadComplete(userId, uploadId, fileId);

        res.json({
          success: true,
          uploadComplete: true,
          fileId,
          message: 'File uploaded and transferred to FTP successfully',
        });

        await auditService.recordEvent({
          action: 'FILE_UPLOAD_SUCCESS',
          actorId: req.user?.id,
          actorEmail: req.user?.email,
          entityType: 'FILE',
          entityId: fileId,
          metadata: {
            channelId: uploadData.channelId,
            filename: uploadData.originalFilename,
            size: uploadData.size,
          },
          ipAddress: req.ip,
        });
      } catch (ftpError) {
        logger.error('Error transferring file to FTP:', ftpError);
        
        // Broadcast error
        websocketService.broadcastUploadError(userId, uploadId, 
          ftpError instanceof Error ? ftpError.message : 'FTP transfer failed'
        );
        
        res.status(500).json({
          success: false,
          error: 'Upload completed but FTP transfer failed',
          details: ftpError instanceof Error ? ftpError.message : 'Unknown FTP error',
        });
      }
    } else {
      // Broadcast chunk upload progress
      const progress = ((chunkIndex + 1) / totalChunks) * 100;
      websocketService.broadcastUploadProgress(userId, uploadId, {
        status: 'uploading',
        chunkIndex: chunkIndex + 1,
        totalChunks,
        progress,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
      });

      res.json({
        success: true,
        uploadComplete: false,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      });
    }
  } catch (error) {
    logger.error('Error uploading chunk:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload chunk',
    });
  }
};

/**
 * Get upload progress
 */
export const getUploadProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uploadId } = req.params;

    const uploadSvc = getUploadService();
    const progress = await uploadSvc.getUploadProgress(uploadId);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Upload session not found or expired',
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    logger.error('Error getting upload progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upload progress',
    });
  }
};

/**
 * Cancel an upload
 */
export const cancelUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uploadId } = req.params;

    const uploadSvc = getUploadService();
    await uploadSvc.cancelUpload(uploadId);

    logger.info(`Upload cancelled: ${uploadId} by user ${req.user!.id}`);

    res.json({
      success: true,
      message: 'Upload cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling upload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel upload',
    });
  }
};

/**
 * List files in a channel
 */
export const listFiles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = listFilesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { page, limit, channelId } = value;
    const userId = req.user!.id;

    const fileSvc = await getFileService();
    const result = await fileSvc.listChannelFiles(channelId, page, limit, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files',
    });
  }
};

/**
 * Search files in a channel
 */
export const searchFiles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = searchFilesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { query, page, limit, channelId } = value;
    const userId = req.user!.id;

    const fileSvc = await getFileService();
    const result = await fileSvc.searchChannelFiles(channelId, query, page, limit, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search files',
    });
  }
};

/**
 * Download a file
 */
export const downloadFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    const fileSvc = await getFileService();
    const fileInfo = await fileSvc.downloadFromFtp(fileId, userId);

    res.download(fileInfo.filePath, fileInfo.filename, (err) => {
      if (err) {
        logger.error('Error sending file to client:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error downloading file',
          });
        }
      } else {
        // Clean up temporary file after download
        fs.unlink(fileInfo.filePath, (unlinkErr) => {
          if (unlinkErr) {
            logger.error('Error cleaning up temporary file:', unlinkErr);
          }
        });
      }
    });
  } catch (error) {
    logger.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download file',
    });
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    const fileSvc = await getFileService();
    await fileSvc.deleteFile(fileId, userId);

    logger.info(`File deleted: ${fileId} by user ${userId}`);

    await auditService.recordEvent({
      action: 'FILE_DELETE',
      actorId: userId,
      actorEmail: req.user?.email,
      entityType: 'FILE',
      entityId: fileId,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    });
  }
};

/**
 * Rename a file
 */
export const renameFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const { error, value } = renameFileSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { newName } = value;
    const userId = req.user!.id;

    const fileSvc = await getFileService();
    await fileSvc.renameFile(fileId, newName, userId);

    logger.info(`File renamed: ${fileId} to ${newName} by user ${userId}`);

    await auditService.recordEvent({
      action: 'FILE_RENAME',
      actorId: userId,
      actorEmail: req.user?.email,
      entityType: 'FILE',
      entityId: fileId,
      metadata: { newName },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'File renamed successfully',
    });
  } catch (error) {
    logger.error('Error renaming file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename file',
    });
  }
};

// Export upload middleware
export const uploadMiddleware = upload.single('chunk');
