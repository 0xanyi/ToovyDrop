import {
  apiService,
  ApiResponse
} from './api';
import {
  File,
  FileListResponse,
  FileFilters,
  FilePreview
} from '../types';

export class FileService {
  async getFiles(
    page: number = 1,
    limit: number = 20,
    filters?: FileFilters
  ): Promise<FileListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.mimeType) params.append('mimeType', filters.mimeType);
      if (filters.channelId) params.append('channelId', filters.channelId);
      if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start);
      if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end);
      if (filters.sizeRange?.min) params.append('minSize', filters.sizeRange.min.toString());
      if (filters.sizeRange?.max) params.append('maxSize', filters.sizeRange.max.toString());
    }

    const response: ApiResponse<FileListResponse> = await apiService.get(
      `/files?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch files');
    }

    return response.data;
  }

  async getFile(fileId: string): Promise<File> {
    const response: ApiResponse<File> = await apiService.get(`/files/${fileId}`);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch file');
    }

    return response.data;
  }

  async getFilePreview(fileId: string): Promise<FilePreview> {
    const response: ApiResponse<FilePreview> = await apiService.get(
      `/files/${fileId}/preview`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate file preview');
    }

    return response.data;
  }

  async downloadFile(fileId: string, filename?: string): Promise<void> {
    try {
      const response = await apiService.client.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `file_${fileId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      throw new Error('Failed to download file');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const response: ApiResponse<void> = await apiService.delete(`/files/${fileId}`);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete file');
    }
  }

  async deleteMultipleFiles(fileIds: string[]): Promise<void> {
    const response: ApiResponse<void> = await apiService.post('/files/bulk-delete', {
      fileIds
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete files');
    }
  }

  async renameFile(fileId: string, newName: string): Promise<void> {
    const response: ApiResponse<void> = await apiService.patch(`/files/${fileId}/rename`, {
      newName
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to rename file');
    }
  }

  async moveFiles(fileIds: string[], channelId: string): Promise<void> {
    const response: ApiResponse<void> = await apiService.post('/files/move', {
      fileIds,
      channelId
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to move files');
    }
  }

  async updateFileMetadata(
    fileId: string,
    metadata: { originalName?: string; description?: string }
  ): Promise<File> {
    const response: ApiResponse<File> = await apiService.put(
      `/files/${fileId}/metadata`,
      metadata
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update file metadata');
    }

    return response.data;
  }

  generateFileUrl(fileId: string, download: boolean = false): string {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const endpoint = download ? 'download' : 'view';
    return `${apiUrl}/api/files/${fileId}/${endpoint}`;
  }

  generateThumbnailUrl(fileId: string): string {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${apiUrl}/api/files/${fileId}/thumbnail`;
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
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

    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return { icon: 'file-text', color: 'text-green-600' };
    }

    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return { icon: 'file-text', color: 'text-orange-500' };
    }

    // Archives
    if (mimeType.includes('zip') || mimeType.includes('rar') ||
        mimeType.includes('tar') || mimeType.includes('gzip')) {
      return { icon: 'archive', color: 'text-yellow-600' };
    }

    // Code
    if (mimeType.includes('javascript') || mimeType.includes('json') ||
        mimeType.includes('xml') || mimeType.includes('html') ||
        mimeType.includes('css')) {
      return { icon: 'code', color: 'text-indigo-500' };
    }

    return { icon: 'file', color: 'text-gray-500' };
  }

  isPreviewable(mimeType?: string): boolean {
    if (!mimeType) return false;

    const previewableTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/webm', 'video/ogg',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
      // Documents
      'application/pdf',
      // Text
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json'
    ];

    return previewableTypes.includes(mimeType);
  }

  searchFiles(files: File[], query: string): File[] {
    if (!query.trim()) return files;

    const searchTerm = query.toLowerCase();

    return files.filter(file =>
      file.originalName.toLowerCase().includes(searchTerm) ||
      file.filename.toLowerCase().includes(searchTerm) ||
      (file.mimeType && file.mimeType.toLowerCase().includes(searchTerm))
    );
  }

  filterFilesByType(files: File[], mimeType?: string): File[] {
    if (!mimeType) return files;

    if (mimeType.includes('/')) {
      // Exact MIME type match
      return files.filter(file => file.mimeType === mimeType);
    } else {
      // Category match (e.g., 'image', 'video', 'audio')
      return files.filter(file => file.mimeType?.startsWith(mimeType + '/'));
    }
  }

  filterFilesBySize(files: File[], minSize?: number, maxSize?: number): File[] {
    return files.filter(file => {
      if (minSize !== undefined && file.size < minSize) return false;
      if (maxSize !== undefined && file.size > maxSize) return false;
      return true;
    });
  }

  filterFilesByDate(files: File[], startDate?: string, endDate?: string): File[] {
    return files.filter(file => {
      const fileDate = new Date(file.createdAt);
      if (startDate && fileDate < new Date(startDate)) return false;
      if (endDate && fileDate > new Date(endDate)) return false;
      return true;
    });
  }

  sortFiles(files: File[], sortBy: 'name' | 'size' | 'date', order: 'asc' | 'desc' = 'desc'): File[] {
    return [...files].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }
}

export const fileService = new FileService();