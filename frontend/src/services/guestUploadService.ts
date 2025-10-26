import axios, { AxiosInstance } from 'axios';
import { ApiResponse, UploadProgress } from '../types';

export interface GuestLinkValidationResponse {
  channel: {
    id: string;
    name: string;
    description?: string;
  };
  link: {
    id: string;
    description?: string;
    maxUploads?: number;
    uploadCount: number;
    guestFolder?: string;
    expiresAt?: string;
  };
  uploadConfig: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    chunkSize: number;
  };
}

export interface GuestUploadResult {
  success: boolean;
  fileId?: string;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType?: string;
  };
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}

export interface GuestUploadError extends Error {
  code: string;
  retryable: boolean;
  statusCode?: number;
}

export class GuestUploadService {
  private client: AxiosInstance;

  constructor() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.client = axios.create({
      baseURL: `${apiUrl}/api`,
      timeout: 30000,
    });
  }

  async validateGuestLink(token: string): Promise<GuestLinkValidationResponse> {
    try {
      const response = await this.client.get<ApiResponse<GuestLinkValidationResponse>>(
        `/guest-links/${token}/validate`
      );

      if (!response.data.success || !response.data.data) {
        const error = this.createGuestUploadError(
          response.data.error?.code || 'VALIDATION_FAILED',
          response.data.error?.message || 'Invalid or expired guest link',
          false,
          response.status
        );
        throw error;
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw our custom errors
      }

      // Handle axios errors
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 404) {
          throw this.createGuestUploadError(
            'LINK_NOT_FOUND',
            'Guest link not found or has been deleted',
            false,
            status
          );
        } else if (status === 410) {
          throw this.createGuestUploadError(
            'LINK_EXPIRED',
            'This guest link has expired',
            false,
            status
          );
        } else if (status === 429) {
          throw this.createGuestUploadError(
            'RATE_LIMITED',
            'Too many requests. Please try again later',
            true,
            status
          );
        } else if (status >= 500) {
          throw this.createGuestUploadError(
            'SERVER_ERROR',
            'Server error occurred. Please try again later',
            true,
            status
          );
        }
        
        throw this.createGuestUploadError(
          errorData?.error?.code || 'VALIDATION_FAILED',
          errorData?.error?.message || 'Failed to validate guest link',
          status >= 500,
          status
        );
      }

      // Handle network errors
      if (axios.isAxiosError(error)) {
        if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
          throw this.createGuestUploadError(
            'NETWORK_ERROR',
            'Network error. Please check your connection and try again',
            true
          );
        }

        // Handle timeout errors
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw this.createGuestUploadError(
            'TIMEOUT',
            'Request timed out. Please try again',
            true
          );
        }
      }

      throw this.createGuestUploadError(
        'UNKNOWN_ERROR',
        'An unexpected error occurred',
        true
      );
    }
  }

  async uploadFile(
    token: string,
    file: File,
    maxFileSize?: number,
    onProgress?: (progress: UploadProgress) => void,
    _chunkSize?: number
  ): Promise<GuestUploadResult> {
    // Validate file before upload
    const validationError = this.validateFile(file, maxFileSize);
    if (validationError) {
      throw new Error(validationError);
    }

    const uploadId = this.generateUploadId();

    // Create upload progress tracking
    const uploadProgress: UploadProgress = {
      uploadId,
      filename: file.name,
      loaded: 0,
      total: file.size,
      percentage: 0,
      status: 'uploading',
      retryCount: 0,
      maxRetries: 3,
      startTime: new Date().toISOString()
    };

    try {
      // Create FormData for single file upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.client.post<ApiResponse<{ fileId: string; filename: string; size: number; uploadedAt: string; message: string }>>(
        `/guest-links/${token}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minute timeout for large files
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const loaded = progressEvent.loaded;
              const total = progressEvent.total;
              const percentage = (loaded / total) * 100;

              uploadProgress.loaded = loaded;
              uploadProgress.percentage = percentage;

              // Calculate speed and estimated time remaining
              const totalElapsed = Date.now() - new Date(uploadProgress.startTime).getTime();
              uploadProgress.speed = totalElapsed > 0 ? (loaded / totalElapsed) * 1000 : 0;

              if (uploadProgress.speed > 0) {
                const remainingBytes = total - loaded;
                uploadProgress.estimatedTimeRemaining = (remainingBytes / uploadProgress.speed) * 1000;
              }

              if (onProgress) {
                onProgress(uploadProgress);
              }
            }
          }
        }
      );

      if (!response.data.success) {
        const error = this.createGuestUploadError(
          response.data.error?.code || 'UPLOAD_FAILED',
          response.data.error?.message || 'Upload failed',
          true,
          response.status
        );
        throw error;
      }

      // Mark upload as completed
      uploadProgress.status = 'completed';
      uploadProgress.percentage = 100;
      uploadProgress.loaded = file.size;

      if (onProgress) {
        onProgress(uploadProgress);
      }

      return {
        success: true,
        fileId: response.data.data?.fileId,
        file: {
          id: response.data.data?.fileId || '',
          filename: response.data.data?.filename || file.name,
          originalName: file.name,
          size: file.size,
          mimeType: file.type
        }
      };
    } catch (error) {
      uploadProgress.status = 'error';
      
      // Handle different types of errors
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 413) {
          uploadProgress.error = 'File too large for upload';
        } else if (status === 415) {
          uploadProgress.error = 'File type not supported';
        } else if (status === 429) {
          uploadProgress.error = 'Upload limit reached. Please try again later';
        } else if (status === 403) {
          uploadProgress.error = 'Upload not allowed. Link may be inactive or expired';
        } else if (status === 507) {
          uploadProgress.error = 'Storage full. Cannot upload file';
        } else if (status >= 500) {
          uploadProgress.error = 'Server error occurred during upload';
        } else {
          uploadProgress.error = errorData?.error?.message || 'Upload failed';
        }
      } else if (axios.isAxiosError(error)) {
        if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
          uploadProgress.error = 'Network error. Please check your connection';
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          uploadProgress.error = 'Upload timed out. Please try again';
        } else {
          uploadProgress.error = error.message || 'Upload failed';
        }
      } else {
        uploadProgress.error = error instanceof Error ? error.message : 'Upload failed';
      }

      if (onProgress) {
        onProgress(uploadProgress);
      }

      throw error;
    }
  }

  private validateFile(file: File, maxFileSize?: number): string | null {
    // Use provided max file size or default to 5GB
    const MAX_FILE_SIZE = maxFileSize || 5 * 1024 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum allowed size of ${this.formatFileSize(MAX_FILE_SIZE)}`;
    }

    // Basic file validation - allow most common types
    if (file.size === 0) {
      return 'File is empty';
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const fileName = file.name.toLowerCase();
    const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
    
    if (hasDangerousExtension) {
      return 'File type not allowed for security reasons';
    }

    return null; // File is valid
  }

  private generateUploadId(): string {
    return 'guest-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }

  private createGuestUploadError(
    code: string,
    message: string,
    retryable: boolean = false,
    statusCode?: number
  ): GuestUploadError {
    const error = new Error(message) as GuestUploadError;
    error.code = code;
    error.retryable = retryable;
    error.statusCode = statusCode;
    return error;
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(mimeType?: string): { icon: string; color: string } {
    if (!mimeType) return { icon: 'file', color: 'text-gray-500' };

    // Images
    if (mimeType.startsWith('image/')) {
      return { icon: 'image', color: 'text-green-500' };
    }

    // Videos
    if (mimeType.startsWith('video/')) {
      return { icon: 'video', color: 'text-purple-500' };
    }

    // Audio
    if (mimeType.startsWith('audio/')) {
      return { icon: 'music', color: 'text-pink-500' };
    }

    // Documents
    if (mimeType.includes('pdf')) {
      return { icon: 'file-text', color: 'text-red-500' };
    }

    if (mimeType.includes('word') || mimeType.includes('document')) {
      return { icon: 'file-text', color: 'text-blue-500' };
    }

    // Archives
    if (mimeType.includes('zip') || mimeType.includes('rar') ||
        mimeType.includes('tar') || mimeType.includes('gzip')) {
      return { icon: 'archive', color: 'text-yellow-600' };
    }

    return { icon: 'file', color: 'text-gray-500' };
  }
}

export const guestUploadService = new GuestUploadService();