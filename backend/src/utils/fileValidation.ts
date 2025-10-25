import path from 'path';
import fs from 'fs-extra';

// Allowed file types and their MIME types
export const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  
  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'application/x-tar': ['.tar'],
  'application/gzip': ['.gz'],
  
  // Video
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/webm': ['.webm'],
  
  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/x-wav': ['.wav'],
  
  // Code files
  'text/javascript': ['.js'],
  'application/json': ['.json'],
  'text/html': ['.html'],
  'text/css': ['.css'],
  'application/xml': ['.xml'],
  'text/markdown': ['.md'],
};

// Maximum file size: 5GB in bytes
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

// Chunk size: 5MB
export const CHUNK_SIZE = 5 * 1024 * 1024;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
  fileExtension?: string;
}

/**
 * Validates a file based on MIME type and file extension
 */
export function validateFileType(mimeType: string, filename: string): FileValidationResult {
  const fileExtension = path.extname(filename).toLowerCase();
  
  // Check if MIME type is allowed
  if (!(mimeType in ALLOWED_MIME_TYPES)) {
    return {
      isValid: false,
      error: `File type ${mimeType} is not allowed`,
    };
  }

  // Check if file extension matches the MIME type
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES];
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File extension ${fileExtension} does not match the declared MIME type`,
    };
  }
  
  return {
    isValid: true,
    mimeType,
    fileExtension,
  };
}

/**
 * Validates file size against maximum allowed size
 */
export function validateFileSize(size: number): FileValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size ${formatFileSize(size)} exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }
  
  if (size <= 0) {
    return {
      isValid: false,
      error: 'File size must be greater than 0',
    };
  }
  
  return {
    isValid: true,
  };
}

/**
 * Sanitizes filename to prevent path traversal and other security issues
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and other dangerous characters
  const sanitized = filename
    .replace(/[\\\/]/g, '_') // Replace path separators
    .replace(/\.\./g, '_') // Replace double dots
    .replace(/[<>:"|?*]/g, '_') // Replace Windows invalid characters
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .trim();
  
  // Limit filename length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const nameWithoutExt = path.parse(sanitized).name;
    const ext = path.parse(sanitized).ext;
    const maxNameLength = maxLength - ext.length;
    return nameWithoutExt.substring(0, maxNameLength) + ext;
  }
  
  return sanitized || 'unnamed_file';
}

/**
 * Validates that a directory path is safe
 */
export function validateDirectoryPath(directoryPath: string): FileValidationResult {
  // Check for path traversal attempts
  if (directoryPath.includes('..') || directoryPath.includes('~')) {
    return {
      isValid: false,
      error: 'Invalid directory path: path traversal not allowed',
    };
  }
  
  // Allow both absolute and relative paths for FTP
  // FTP servers typically use absolute paths like /uploads/channel-name
  // Just ensure the path doesn't contain dangerous characters
  if (directoryPath.includes('\0') || directoryPath.includes('\r') || directoryPath.includes('\n')) {
    return {
      isValid: false,
      error: 'Invalid directory path: contains illegal characters',
    };
  }
  
  return {
    isValid: true,
  };
}

/**
 * Creates a secure temporary filename
 */
export function createTempFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const name = path.parse(sanitized).name;
  
  return `${name}_${timestamp}_${random}${ext}`;
}

/**
 * Checks if a file exists and is accessible
 */
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Validates chunk information for chunked uploads
 */
export function validateChunkInfo(
  chunkIndex: number,
  totalChunks: number,
  chunkSize: number,
  totalSize: number
): FileValidationResult {
  if (chunkIndex < 0 || chunkIndex >= totalChunks) {
    return {
      isValid: false,
      error: `Invalid chunk index: ${chunkIndex}. Must be between 0 and ${totalChunks - 1}`,
    };
  }
  
  if (totalChunks <= 0) {
    return {
      isValid: false,
      error: 'Total chunks must be greater than 0',
    };
  }
  
  if (chunkSize <= 0) {
    return {
      isValid: false,
      error: 'Chunk size must be greater than 0',
    };
  }
  
  if (totalSize <= 0) {
    return {
      isValid: false,
      error: 'Total file size must be greater than 0',
    };
  }
  
  // For the last chunk, size might be smaller than CHUNK_SIZE
  const isLastChunk = chunkIndex === totalChunks - 1;
  
  if (!isLastChunk && chunkSize !== CHUNK_SIZE) {
    return {
      isValid: false,
      error: `Invalid chunk size: ${chunkSize}. Expected ${CHUNK_SIZE} for non-last chunks`,
    };
  }
  
  return {
    isValid: true,
  };
}
