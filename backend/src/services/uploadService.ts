import fs from 'fs/promises';
import fsExtra from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../app';
import logger from '../utils/logger';
import { 
  validateFileType, 
  validateFileSize, 
  validateChunkInfo, 
  createTempFilename,
  formatFileSize,
  CHUNK_SIZE 
} from '../utils/fileValidation';

export interface ChunkUploadRequest {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  totalSize: number;
  filename: string;
  mimeType: string;
  channelId: string;
}

export interface ChunkUploadResponse {
  success: boolean;
  message?: string;
  uploadComplete?: boolean;
  fileId?: string;
}

export interface UploadSession {
  uploadId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  totalChunks: number;
  channelId: string;
  uploadedBy: string;
  uploadedChunks: Set<number>;
  tempFilePath: string;
  createdAt: Date;
  expiresAt: Date;
}

export class UploadService {
  private readonly tempDir: string;
  private readonly maxConcurrentChunks = 3;
  private readonly chunkQueue = new Map<string, Promise<void>>();
  private readonly activeUploads = new Map<string, {
    uploadId: string;
    chunksProcessing: number;
    queue: Array<{
      chunkIndex: number;
      chunkData: Buffer;
      resolve: () => Promise<void>;
      reject: (error: Error) => void;
    }>;
  }>();
  private readonly uploadSessionTTL = 3600; // 1 hour in seconds

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'uploads');
    this.ensureTempDirectory();
  }

  /**
   * Ensures the temporary directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fsExtra.ensureDir(this.tempDir);
      logger.info(`Temporary directory ensured: ${this.tempDir}`);
    } catch (error) {
      logger.error('Error creating temporary directory:', error);
      throw new Error('Failed to create temporary directory');
    }
  }

  /**
   * Initializes a new upload session
   */
  async initializeUpload(
    filename: string,
    mimeType: string,
    size: number,
    channelId: string,
    userId: string
  ): Promise<{ uploadId: string; totalChunks: number }> {
    // Validate file
    const typeValidation = validateFileType(mimeType, filename);
    if (!typeValidation.isValid) {
      throw new Error(typeValidation.error);
    }

    const sizeValidation = validateFileSize(size);
    if (!sizeValidation.isValid) {
      throw new Error(sizeValidation.error);
    }

    // Calculate total chunks
    const totalChunks = Math.ceil(size / CHUNK_SIZE);
    
    // Generate upload ID
    const uploadId = uuidv4();
    const sanitizedFilename = createTempFilename(filename);
    const tempFilePath = path.join(this.tempDir, `${uploadId}_${sanitizedFilename}`);

    // Create upload session
    const session: UploadSession = {
      uploadId,
      filename: sanitizedFilename,
      originalFilename: filename,
      mimeType,
      size,
      totalChunks,
      channelId,
      uploadedBy: userId,
      uploadedChunks: new Set(),
      tempFilePath,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.uploadSessionTTL * 1000),
    };

    // Store session in Redis
    await this.storeUploadSession(session);
    
    // Create empty file for writing chunks
    await fs.writeFile(tempFilePath, Buffer.alloc(0));
    
    logger.info(`Initialized upload session: ${uploadId} for file: ${filename} (${formatFileSize(size)})`);
    
    return { uploadId, totalChunks };
  }

  /**
   * Handles a chunk upload with concurrency control
   */
  async uploadChunk(
    buffer: Buffer,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    chunkSize: number,
    totalSize: number,
    _filename: string,
    _mimeType: string,
    _channelId: string,
    _userId: string
  ): Promise<ChunkUploadResponse> {
    // Initialize upload tracking if not exists
    if (!this.activeUploads.has(uploadId)) {
      this.activeUploads.set(uploadId, {
        uploadId,
        chunksProcessing: 0,
        queue: [],
      });
    }

    const uploadTracking = this.activeUploads.get(uploadId)!;

    return new Promise<ChunkUploadResponse>((resolve, reject) => {
      // Add to queue
      uploadTracking.queue.push({
        chunkIndex,
        chunkData: buffer,
        resolve: () =>
          this.processChunk(
            buffer,
            uploadId,
            chunkIndex,
            totalChunks,
            chunkSize,
            totalSize,
            _filename,
            _mimeType,
            _channelId,
            _userId,
          )
            .then(resolve)
            .catch(reject),
        reject,
      });

      // Process queue
      this.processChunkQueue(uploadId);
    });
  }

  /**
   * Process chunk queue with concurrency limits
   */
  private async processChunkQueue(uploadId: string): Promise<void> {
    const uploadTracking = this.activeUploads.get(uploadId);
    if (!uploadTracking) return;

    while (uploadTracking.queue.length > 0 && uploadTracking.chunksProcessing < this.maxConcurrentChunks) {
      const chunkTask = uploadTracking.queue.shift();
      if (!chunkTask) break;

      uploadTracking.chunksProcessing++;
      
      // Process chunk asynchronously
      chunkTask.resolve()
        .finally(() => {
          uploadTracking.chunksProcessing--;
          // Process next chunk in queue
          this.processChunkQueue(uploadId);
        });
    }
  }

  /**
   * Process individual chunk
   */
  private async processChunk(
    buffer: Buffer,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    chunkSize: number,
    totalSize: number,
    _filename: string,
    _mimeType: string,
    _channelId: string,
    _userId: string
  ): Promise<ChunkUploadResponse> {
    try {
      // Validate chunk information
      const chunkValidation = validateChunkInfo(chunkIndex, totalChunks, chunkSize, totalSize);
      if (!chunkValidation.isValid) {
        throw new Error(chunkValidation.error);
      }

      // Get upload session
      const session = await this.getUploadSession(uploadId);
      if (!session) {
        logger.error(`Upload session not found for ID: ${uploadId}`);
        throw new Error('Upload session not found or expired');
      }

      // Validate that chunk info matches session
      if (session.totalChunks !== totalChunks || session.size !== totalSize) {
        throw new Error('Chunk information does not match upload session');
      }

      // Check if chunk was already uploaded
      if (session.uploadedChunks.has(chunkIndex)) {
        logger.info(`Chunk ${chunkIndex} already uploaded for upload ${uploadId}`);
        return { success: true };
      }

      // Calculate chunk position
      const chunkPosition = chunkIndex * CHUNK_SIZE;
      
      // Write chunk to temporary file
      const fileHandle = await fs.open(session.tempFilePath, 'r+');
      try {
        await fileHandle.write(buffer, 0, buffer.length, chunkPosition);
      } finally {
        await fileHandle.close();
      }

      // Mark chunk as uploaded
      session.uploadedChunks.add(chunkIndex);
      await this.storeUploadSession(session);

      logger.info(`Uploaded chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}`);

      // Check if upload is complete
      const isComplete = session.uploadedChunks.size === totalChunks;
      
      if (isComplete) {
        logger.info(`Upload complete: ${uploadId}`);
        
        // Verify file size
        const actualSize = (await fs.stat(session.tempFilePath)).size;
        if (actualSize !== totalSize) {
          throw new Error(`File size mismatch. Expected: ${totalSize}, Actual: ${actualSize}`);
        }

        return {
          success: true,
          uploadComplete: true,
        };
      }

      return {
        success: true,
        uploadComplete: false,
      };
    } catch (error) {
      logger.error(`Error uploading chunk ${chunkIndex} for upload ${uploadId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets the current upload progress
   */
  async getUploadProgress(uploadId: string): Promise<{
    uploadId: string;
    filename: string;
    progress: number;
    uploadedChunks: number;
    totalChunks: number;
    bytesUploaded: number;
    totalBytes: number;
  } | null> {
    const session = await this.getUploadSession(uploadId);
    if (!session) {
      return null;
    }

    const uploadedChunks = session.uploadedChunks.size;
    const progress = (uploadedChunks / session.totalChunks) * 100;
    
    // Calculate bytes uploaded (estimate)
    const isLastChunk = session.uploadedChunks.has(session.totalChunks - 1);
    let bytesUploaded = uploadedChunks * CHUNK_SIZE;
    
    if (isLastChunk) {
      // Adjust for last chunk which might be smaller
      const lastChunkSize = session.size % CHUNK_SIZE || CHUNK_SIZE;
      bytesUploaded = (uploadedChunks - 1) * CHUNK_SIZE + lastChunkSize;
    } else if (uploadedChunks === session.totalChunks - 1) {
      // All chunks except the last one are uploaded
      bytesUploaded = (uploadedChunks * CHUNK_SIZE) - CHUNK_SIZE + (session.size % CHUNK_SIZE || CHUNK_SIZE);
    }

    return {
      uploadId: session.uploadId,
      filename: session.originalFilename,
      progress,
      uploadedChunks,
      totalChunks: session.totalChunks,
      bytesUploaded,
      totalBytes: session.size,
    };
  }

  /**
   * Completes an upload and returns the file path for FTP upload
   */
  async completeUpload(uploadId: string): Promise<{
    tempFilePath: string;
    filename: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    channelId: string;
    uploadedBy: string;
  }> {
    const session = await this.getUploadSession(uploadId);
    if (!session) {
      throw new Error('Upload session not found or expired');
    }

    if (session.uploadedChunks.size !== session.totalChunks) {
      throw new Error(`Upload incomplete. ${session.uploadedChunks.size}/${session.totalChunks} chunks uploaded`);
    }

    // Verify file integrity
    const actualSize = (await fs.stat(session.tempFilePath)).size;
    if (actualSize !== session.size) {
      throw new Error(`File size verification failed. Expected: ${session.size}, Actual: ${actualSize}`);
    }

    logger.info(`Upload completed successfully: ${uploadId}`);

    return {
      tempFilePath: session.tempFilePath,
      filename: session.filename,
      originalFilename: session.originalFilename,
      mimeType: session.mimeType,
      size: session.size,
      channelId: session.channelId,
      uploadedBy: session.uploadedBy,
    };
  }

  /**
   * Cancels and cleans up an upload session
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const session = await this.getUploadSession(uploadId);
    if (!session) {
      return; // Session doesn't exist or already expired
    }

    try {
      // Remove temporary file
      if (await fsExtra.pathExists(session.tempFilePath)) {
        await fsExtra.remove(session.tempFilePath);
        logger.info(`Removed temporary file: ${session.tempFilePath}`);
      }
    } catch (error) {
      logger.error(`Error removing temporary file ${session.tempFilePath}:`, error);
    }

    // Remove session from Redis
    await redis.del(`upload:${uploadId}`);
    
    logger.info(`Cancelled upload session: ${uploadId}`);
  }

  /**
   * Cleans up expired upload sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const keys = await redis.keys('upload:*');
      const now = Date.now();
      let cleanedCount = 0;

      for (const key of keys) {
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session: UploadSession = JSON.parse(sessionData);
          if (session.expiresAt.getTime() < now) {
            // Clean up expired session
            try {
              if (await fsExtra.pathExists(session.tempFilePath)) {
                await fsExtra.remove(session.tempFilePath);
              }
            } catch (error) {
              logger.error(`Error removing expired temp file ${session.tempFilePath}:`, error);
            }
            
            await redis.del(key);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired upload sessions`);
      }
    } catch (error) {
      logger.error('Error during cleanup of expired sessions:', error);
    }
  }

  /**
   * Stores upload session in Redis
   */
  private async storeUploadSession(session: UploadSession): Promise<void> {
    const sessionData = {
      ...session,
      uploadedChunks: Array.from(session.uploadedChunks),
    };
    
    logger.info(`Storing upload session in Redis: ${session.uploadId}, TTL: ${this.uploadSessionTTL}s`);
    
    await redis.setEx(
      `upload:${session.uploadId}`,
      this.uploadSessionTTL,
      JSON.stringify(sessionData)
    );
    
    logger.info(`Successfully stored upload session: ${session.uploadId}`);
  }

  /**
   * Retrieves upload session from Redis
   */
  private async getUploadSession(uploadId: string): Promise<UploadSession | null> {
    try {
      logger.info(`Attempting to retrieve upload session: ${uploadId}`);
      const sessionData = await redis.get(`upload:${uploadId}`);
      
      if (!sessionData) {
        logger.info(`Upload session not found in Redis: ${uploadId}`);
        return null;
      }

      logger.info(`Found upload session in Redis: ${uploadId}`);
      const session = JSON.parse(sessionData) as UploadSession;
      session.uploadedChunks = new Set(session.uploadedChunks);
      session.createdAt = new Date(session.createdAt);
      session.expiresAt = new Date(session.expiresAt);

      return session as UploadSession;
    } catch (error) {
      logger.error(`Error retrieving upload session ${uploadId}:`, error);
      return null;
    }
  }
}
