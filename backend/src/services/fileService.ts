import { PrismaClient } from '@prisma/client';
import * as ftp from 'basic-ftp';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import logger from '../utils/logger';
import { validateDirectoryPath, sanitizeFilename } from '../utils/fileValidation';

// Global declarations
// eslint-disable-next-line no-undef
declare const setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;

export interface UploadProgress {
  uploadId: string;
  filename: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface FileUploadOptions {
  filename: string;
  mimeType: string;
  size: number;
  totalBytes: number;
  channelId: string;
  uploadedBy: string;
  tempFilePath: string;
  isGuestUpload?: boolean;
  guestUploadLinkId?: string;
}

export class FileService {
  private ftpClient: ftp.Client;
  private activeUploads: Map<string, UploadProgress> = new Map();

  constructor(private prisma: PrismaClient) {
    this.ftpClient = new ftp.Client();
    this.ftpClient.ftp.verbose = process.env.NODE_ENV === 'development';
  }

  /**
   * Get FTP client for advanced operations
   */
  get ftpClientInstance(): ftp.Client {
    return this.ftpClient;
  }

  /**
   * Determines the FTP path for file upload, handling guest folder organization
   */
  private async determineFtpPath(
    channelFtpPath: string, 
    sanitizedFilename: string, 
    options: FileUploadOptions
  ): Promise<string> {
    let ftpPath = path.posix.join(channelFtpPath, sanitizedFilename);
    
    // Handle guest folder if this is a guest upload
    if (options.isGuestUpload && options.guestUploadLinkId) {
      const guestLink = await this.prisma.guestUploadLink.findUnique({
        where: { id: options.guestUploadLinkId },
        select: { guestFolder: true }
      });
      
      if (guestLink && guestLink.guestFolder) {
        ftpPath = path.posix.join(channelFtpPath, guestLink.guestFolder, sanitizedFilename);
        logger.info(`Guest upload detected, using guest folder: ${guestLink.guestFolder}`);
      }
    }
    
    return ftpPath;
  }

  /**
   * Determines the target directory for FTP upload, handling guest folder creation
   */
  private async determineTargetDirectory(
    channelFtpPath: string, 
    options: FileUploadOptions
  ): Promise<string> {
    let targetDir = channelFtpPath;
    
    // Handle guest folder if this is a guest upload
    if (options.isGuestUpload && options.guestUploadLinkId) {
      const guestLink = await this.prisma.guestUploadLink.findUnique({
        where: { id: options.guestUploadLinkId },
        select: { guestFolder: true }
      });
      
      if (guestLink && guestLink.guestFolder) {
        targetDir = path.posix.join(channelFtpPath, guestLink.guestFolder);
        logger.info(`Creating guest folder directory: ${targetDir}`);
      }
    }
    
    return targetDir;
  }

  /**
   * Creates a file record in the database with proper guest upload attribution
   */
  private async createFileRecord(
    uploadId: string,
    sanitizedFilename: string,
    ftpPath: string,
    options: FileUploadOptions
  ) {
    const fileData = {
      id: uploadId,
      filename: sanitizedFilename,
      originalName: options.filename,
      mimeType: options.mimeType,
      size: BigInt(options.size),
      ftpPath,
      channelId: options.channelId,
      uploadedBy: options.isGuestUpload ? null : options.uploadedBy, // Set to null for guest uploads
      uploadedByGuest: options.isGuestUpload || false,
      guestUploadLinkId: options.guestUploadLinkId,
    };

    logger.info(`Creating file record with guest upload attribution:`, {
      uploadId,
      filename: sanitizedFilename,
      isGuestUpload: options.isGuestUpload,
      guestUploadLinkId: options.guestUploadLinkId,
      channelId: options.channelId
    });

    const fileRecord = await this.prisma.file.create({
      data: fileData,
    });

    // If this is a guest upload, increment the upload count on the guest link
    if (options.isGuestUpload && options.guestUploadLinkId) {
      await this.incrementGuestLinkUploadCount(options.guestUploadLinkId);
    }

    return fileRecord;
  }

  /**
   * Increments the upload count for a guest link
   */
  private async incrementGuestLinkUploadCount(guestUploadLinkId: string): Promise<void> {
    try {
      await this.prisma.guestUploadLink.update({
        where: { id: guestUploadLinkId },
        data: {
          uploadCount: {
            increment: 1
          }
        }
      });
      
      logger.info(`Incremented upload count for guest link: ${guestUploadLinkId}`);
    } catch (error) {
      logger.error(`Failed to increment upload count for guest link ${guestUploadLinkId}:`, error);
      // Don't throw error as the file upload was successful
    }
  }

  /**
   * Establishes connection to FTP server
   */
  async connectToFtp(): Promise<void> {
    try {
      const ftpConfig = {
        host: process.env.FTP_HOST!,
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASSWORD!,
        port: parseInt(process.env.FTP_PORT || '21'),
        secure: process.env.FTP_SECURE === 'true',
      };
      
      logger.info('Attempting FTP connection with config:', {
        host: ftpConfig.host,
        port: ftpConfig.port,
        user: ftpConfig.user,
        secure: ftpConfig.secure
      });
      
      await this.ftpClient.access(ftpConfig);
      
      logger.info('Successfully connected to FTP server');
    } catch (error) {
      logger.error('Failed to connect to FTP server:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        host: process.env.FTP_HOST,
        port: process.env.FTP_PORT,
        user: process.env.FTP_USER
      });
      throw new Error('Failed to connect to FTP server');
    }
  }

  /**
   * Disconnects from FTP server
   */
  async disconnectFromFtp(): Promise<void> {
    try {
      this.ftpClient.close();
      logger.info('Disconnected from FTP server');
    } catch (error) {
      logger.error('Error disconnecting from FTP server:', error);
    }
  }

  /**
   * Uploads a file to FTP server
   */
  async uploadToFtp(options: FileUploadOptions): Promise<string> {
    const uploadId = uuidv4();
    // Use original filename without ID prefix
    const sanitizedFilename = sanitizeFilename(options.filename);
    
    logger.info(`Starting FTP upload for file: ${options.filename} (size: ${options.size} bytes)`);
    logger.info(`Temp file path: ${options.tempFilePath}`);
    
    // Get channel information
    const channel = await this.prisma.channel.findUnique({
      where: { id: options.channelId },
    });

    if (!channel) {
      logger.error(`Channel not found for ID: ${options.channelId}`);
      throw new Error('Channel not found');
    }

    logger.info(`Channel found: ${channel.name}, FTP path: ${channel.ftpPath}`);

    // Validate directory path
    const pathValidation = validateDirectoryPath(channel.ftpPath);
    if (!pathValidation.isValid) {
      logger.error(`Invalid FTP path: ${channel.ftpPath}, error: ${pathValidation.error}`);
      throw new Error(pathValidation.error);
    }

    // Determine FTP path with guest folder handling
    const ftpPath = await this.determineFtpPath(channel.ftpPath, sanitizedFilename, options);
    
    logger.info(`Target FTP path: ${ftpPath}`);
    
    // Initialize progress tracking
    const progress: UploadProgress = {
      uploadId,
      filename: sanitizedFilename,
      progress: 0,
      bytesUploaded: 0,
      totalBytes: options.size,
      status: 'uploading',
    };
    
    this.activeUploads.set(uploadId, progress);

    try {
      logger.info('Connecting to FTP server...');
      await this.connectToFtp();
      logger.info('Successfully connected to FTP server');
      
      // Ensure directory exists on FTP server
      const targetDir = await this.determineTargetDirectory(channel.ftpPath, options);
      
      logger.info(`Ensuring FTP directory exists: ${targetDir}`);
      await this.ftpClient.ensureDir(targetDir);
      logger.info('FTP directory ensured');
      
      // Check if temp file exists
      const tempFileExists = await fs.pathExists(options.tempFilePath);
      if (!tempFileExists) {
        logger.error(`Temporary file does not exist: ${options.tempFilePath}`);
        throw new Error(`Temporary file not found: ${options.tempFilePath}`);
      }
      
      const tempFileStats = await fs.stat(options.tempFilePath);
      logger.info(`Temp file stats: size=${tempFileStats.size}, exists=${tempFileExists}`);
      
      // Upload file to FTP server
      logger.info(`Uploading file from ${options.tempFilePath} to ${ftpPath}`);
      await this.ftpClient.uploadFrom(options.tempFilePath, ftpPath);
      
      progress.status = 'processing';
      logger.info(`Successfully uploaded file to FTP: ${ftpPath}`);
      
      // Store file metadata in database with proper guest upload attribution
      const fileRecord = await this.createFileRecord(uploadId, sanitizedFilename, ftpPath, options);
      
      progress.status = 'completed';
      progress.progress = 100;
      
      logger.info(`File metadata stored in database: ${fileRecord.id}`);
      
      return fileRecord.id;
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error uploading file to FTP:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        uploadId,
        filename: options.filename,
        tempFilePath: options.tempFilePath,
        ftpPath: path.posix.join(channel.ftpPath, sanitizeFilename(options.filename)),
        channelId: options.channelId,
        channelFtpPath: channel.ftpPath
      });
      throw error;
    } finally {
      await this.disconnectFromFtp();
      
      // Clean up temporary file
      try {
        await fs.remove(options.tempFilePath);
        logger.info(`Cleaned up temporary file: ${options.tempFilePath}`);
      } catch (error) {
        logger.error('Error cleaning up temporary file:', error);
      }
      
      // Remove progress tracking after completion
      setTimeout(() => {
        this.activeUploads.delete(uploadId);
      }, 60000); // Keep progress info for 1 minute
    }
  }

  /**
   * Downloads a file from FTP server
   */
  async downloadFromFtp(fileId: string, _userId: string): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { channel: true },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check user permissions (simplified - should be enhanced based on channel access)
      // For now, we'll assume user has access if they're authenticated
      logger.info(`User ${_userId} downloading file ${fileId}`);

      // Create temporary download path
      const tempDir = path.join(process.cwd(), 'temp', 'downloads');
      await fs.ensureDir(tempDir);
      
      const tempFilePath = path.join(tempDir, `${fileId}_${path.basename(file.filename)}`);

      await this.connectToFtp();
      
      // Download file from FTP
      await this.ftpClient.downloadTo(tempFilePath, file.ftpPath);
      
      logger.info(`Successfully downloaded file from FTP: ${file.ftpPath}`);
      
      return {
        filePath: tempFilePath,
        filename: file.originalName,
        mimeType: file.mimeType || 'application/octet-stream',
      };
    } catch (error) {
      logger.error('Error downloading file from FTP:', error);
      throw error;
    } finally {
      await this.disconnectFromFtp();
    }
  }

  /**
   * Deletes a file from FTP server and database
   */
  async deleteFile(fileId: string, _userId: string): Promise<void> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Delete from FTP server
      await this.connectToFtp();
      
      try {
        await this.ftpClient.remove(file.ftpPath);
        logger.info(`Successfully deleted file from FTP: ${file.ftpPath}`);
      } catch (error) {
        logger.error('Error deleting file from FTP:', error);
        // Continue with database deletion even if FTP deletion fails
      }
      
      // Delete from database
      await this.prisma.file.delete({
        where: { id: fileId },
      });
      
      logger.info(`Successfully deleted file from database: ${fileId}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    } finally {
      await this.disconnectFromFtp();
    }
  }

  /**
   * Gets upload progress for a specific upload
   */
  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.activeUploads.get(uploadId);
  }

  /**
   * Lists files in a channel with pagination
   */
  async listChannelFiles(
    channelId: string, 
    page: number = 1, 
    limit: number = 20,
    userId: string
  ) {
    const skip = (page - 1) * limit;
    
    // Check if user has access to the channel
    // This is a simplified check - should be enhanced with proper role-based access
    const userChannel = await this.prisma.userChannel.findFirst({
      where: {
        userId,
        channelId,
      },
    });

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || !channel.isActive) {
      throw new Error('Channel not found or inactive');
    }

    // If user is not assigned to channel, check if they're admin
    if (!userChannel) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Access denied to this channel');
      }
    }
    
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          channelId,
          isActive: true,
        },
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.file.count({
        where: {
          channelId,
          isActive: true,
        },
      }),
    ]);
    
    return {
      files: files.map(file => ({
        ...file,
        size: file.size.toString(), // Convert BigInt to string for JSON serialization
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Searches files in a channel
   */
  async searchChannelFiles(
    channelId: string,
    query: string,
    page: number = 1,
    limit: number = 20,
    userId: string
  ) {
    const skip = (page - 1) * limit;
    
    // Similar access check as listChannelFiles
    const userChannel = await this.prisma.userChannel.findFirst({
      where: { userId, channelId },
    });

    if (!userChannel) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Access denied to this channel');
      }
    }
    
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          channelId,
          isActive: true,
          OR: [
            { filename: { contains: query, mode: 'insensitive' } },
            { originalName: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.file.count({
        where: {
          channelId,
          isActive: true,
          OR: [
            { filename: { contains: query, mode: 'insensitive' } },
            { originalName: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);
    
    return {
      files: files.map(file => ({
        ...file,
        size: file.size.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets file preview information
   */
  async getFilePreview(fileId: string, userId: string): Promise<{
    type: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported';
    url: string;
    metadata?: {
      dimensions?: { width: number; height: number };
      duration?: number;
      pages?: number;
    };
  }> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { channel: true },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check user permissions
      const userChannel = await this.prisma.userChannel.findFirst({
        where: { userId, channelId: file.channelId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userChannel && user?.role !== 'ADMIN') {
        throw new Error('Access denied to preview this file');
      }

      // Determine preview type based on MIME type
      const mimeType = file.mimeType || '';
      let previewType: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported' = 'unsupported';

      if (mimeType.startsWith('image/')) {
        previewType = 'image';
      } else if (mimeType.startsWith('video/')) {
        previewType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        previewType = 'audio';
      } else if (mimeType === 'application/pdf') {
        previewType = 'pdf';
      } else if (mimeType.startsWith('text/') || 
                 mimeType === 'application/json' ||
                 mimeType === 'application/javascript' ||
                 mimeType === 'text/html' ||
                 mimeType === 'text/css') {
        previewType = 'text';
      }

      if (previewType === 'unsupported') {
        throw new Error('File type not supported for preview');
      }

      // Generate preview URL - this will point to our secure file serving endpoint
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const previewUrl = `${baseUrl}/api/files/${fileId}/serve`;

      return {
        type: previewType,
        url: previewUrl,
        metadata: {
          // For now, we'll return basic metadata
          // In the future, we could extract more detailed metadata from files
        },
      };
    } catch (error) {
      logger.error('Error getting file preview:', error);
      throw error;
    }
  }

  /**
   * Generates and caches a thumbnail for an image file
   */
  async generateThumbnail(
    fileId: string, 
    userId: string, 
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<{ filePath: string; mimeType: string } | null> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { channel: true },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check user permissions
      const userChannel = await this.prisma.userChannel.findFirst({
        where: { userId, channelId: file.channelId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userChannel && user?.role !== 'ADMIN') {
        throw new Error('Access denied to this file');
      }

      // Check if file is an image
      if (!file.mimeType || !file.mimeType.startsWith('image/')) {
        return null; // Not an image, no thumbnail available
      }

      // Define thumbnail sizes
      const thumbnailSizes = {
        small: { width: 150, height: 150 },
        medium: { width: 300, height: 300 },
        large: { width: 600, height: 600 },
      };

      const thumbnailSize = thumbnailSizes[size];
      
      // Create thumbnails directory
      const thumbnailsDir = path.join(process.cwd(), 'temp', 'thumbnails');
      await fs.ensureDir(thumbnailsDir);
      
      // Check if thumbnail already exists
      const thumbnailFilename = `${fileId}_${size}.webp`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
      
      if (await fs.pathExists(thumbnailPath)) {
        logger.info(`Thumbnail already exists: ${thumbnailPath}`);
        return {
          filePath: thumbnailPath,
          mimeType: 'image/webp',
        };
      }

      // Download original file from FTP
      const tempDir = path.join(process.cwd(), 'temp', 'downloads');
      await fs.ensureDir(tempDir);
      const tempFilePath = path.join(tempDir, `${fileId}_original`);

      await this.connectToFtp();
      
      try {
        await this.ftpClient.downloadTo(tempFilePath, file.ftpPath);
        logger.info(`Downloaded file for thumbnail generation: ${file.ftpPath}`);
      } catch (error) {
        logger.error('Error downloading file for thumbnail:', error);
        throw new Error('Failed to download file for thumbnail generation');
      } finally {
        await this.disconnectFromFtp();
      }

      // Generate thumbnail using Sharp
      try {
        await sharp(tempFilePath)
          .resize(thumbnailSize.width, thumbnailSize.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);

        logger.info(`Generated thumbnail: ${thumbnailPath}`);

        // Clean up original temp file
        await fs.remove(tempFilePath);

        return {
          filePath: thumbnailPath,
          mimeType: 'image/webp',
        };
      } catch (error) {
        logger.error('Error generating thumbnail with Sharp:', error);
        // Clean up temp files
        await fs.remove(tempFilePath).catch(() => {});
        throw new Error('Failed to generate thumbnail');
      }
    } catch (error) {
      logger.error('Error in generateThumbnail:', error);
      throw error;
    }
  }

  /**
   * Gets file metadata for progressive loading
   */
  async getFileMetadata(fileId: string, userId: string): Promise<{
    size: number;
    mimeType: string;
    supportsChunking: boolean;
    chunkSize: number;
    totalChunks: number;
  }> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check user permissions
      const userChannel = await this.prisma.userChannel.findFirst({
        where: { userId, channelId: file.channelId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userChannel && user?.role !== 'ADMIN') {
        throw new Error('Access denied to this file');
      }

      const fileSize = Number(file.size);
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(fileSize / chunkSize);
      
      // Determine if file supports chunking (large files benefit from it)
      const supportsChunking = fileSize > chunkSize;

      return {
        size: fileSize,
        mimeType: file.mimeType || 'application/octet-stream',
        supportsChunking,
        chunkSize,
        totalChunks,
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Gets a specific chunk of file content for progressive loading
   */
  async getFileContentChunk(
    fileId: string, 
    chunkIndex: number, 
    chunkSize: number,
    userId: string
  ): Promise<Buffer> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check user permissions
      const userChannel = await this.prisma.userChannel.findFirst({
        where: { userId, channelId: file.channelId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userChannel && user?.role !== 'ADMIN') {
        throw new Error('Access denied to this file');
      }

      // Download file from FTP to temp location
      const tempDir = path.join(process.cwd(), 'temp', 'chunks');
      await fs.ensureDir(tempDir);
      const tempFilePath = path.join(tempDir, `${fileId}_chunk_${chunkIndex}`);

      // Check if chunk is already cached
      if (await fs.pathExists(tempFilePath)) {
        return await fs.readFile(tempFilePath);
      }

      // Download full file first (in production, you might want to implement FTP range requests)
      const fullTempPath = path.join(tempDir, `${fileId}_full`);
      
      if (!(await fs.pathExists(fullTempPath))) {
        await this.connectToFtp();
        try {
          await this.ftpClient.downloadTo(fullTempPath, file.ftpPath);
        } finally {
          await this.disconnectFromFtp();
        }
      }

      // Extract the specific chunk
      const startByte = chunkIndex * chunkSize;
      const endByte = Math.min(startByte + chunkSize, Number(file.size));
      
      // Read the specific chunk from the file
      const buffer = Buffer.alloc(endByte - startByte);
      const fileDescriptor = await fs.open(fullTempPath, 'r');
      
      try {
        await fs.read(fileDescriptor, buffer, 0, buffer.length, startByte);
        
        // Cache the chunk
        await fs.writeFile(tempFilePath, buffer);
        
        return buffer;
      } finally {
        await fs.close(fileDescriptor);
      }
    } catch (error) {
      logger.error('Error getting file content chunk:', error);
      throw error;
    }
  }

  /**
   * Renames a file
   */
  async renameFile(fileId: string, newName: string, userId: string): Promise<void> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { channel: true },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check user permissions
      const userChannel = await this.prisma.userChannel.findFirst({
        where: { userId, channelId: file.channelId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userChannel && user?.role !== 'ADMIN') {
        throw new Error('Access denied to rename this file');
      }

      // Sanitize new filename
      const sanitizedNewName = sanitizeFilename(newName);
      const newFtpPath = path.posix.join(file.channel.ftpPath, sanitizedNewName);

      // Rename on FTP server
      await this.connectToFtp();
      
      try {
        await this.ftpClient.rename(file.ftpPath, newFtpPath);
        logger.info(`Successfully renamed file on FTP: ${file.ftpPath} -> ${newFtpPath}`);
      } catch (error) {
        logger.error('Error renaming file on FTP:', error);
        throw new Error('Failed to rename file on FTP server');
      } finally {
        await this.disconnectFromFtp();
      }

      // Update database
      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          filename: sanitizedNewName,
          originalName: newName,
          ftpPath: newFtpPath,
        },
      });

      logger.info(`Successfully renamed file in database: ${fileId}`);
    } catch (error) {
      logger.error('Error renaming file:', error);
      throw error;
    }
  }
}
