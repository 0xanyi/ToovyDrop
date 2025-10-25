import {
  apiService,
  ApiResponse
} from './api';
import {
  UploadProgress,
  UploadQueue,
  UploadSession,
  UploadProgressMessage,
  UploadCompleteMessage,
  UploadErrorMessage
} from '../types';

export class UploadService {
  private queue: UploadQueue = {
    files: new Map(),
    activeUploads: new Set(),
    pausedUploads: new Set(),
    maxConcurrentUploads: 3
  };

  private ws: WebSocket | null = null;
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();
  private completeCallbacks: Map<string, (fileId: string, file: unknown) => void> = new Map();
  private errorCallbacks: Map<string, (error: string, retryable: boolean) => void> = new Map();
  private fileDataMap: Map<string, { file: File; channelId: string }> = new Map();
  private CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    this.initializeWebSocket();
  }

  private async getCsrfToken(): Promise<string> {
    // Upload endpoints are excluded from CSRF protection, so we don't need a token
    // This method is kept for compatibility but returns a dummy token
    return 'upload-no-csrf-required';
  }

  private initializeWebSocket() {
    const wsUrl = import.meta.env.VITE_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected for upload progress');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'upload_progress':
            this.handleProgressUpdate(message as UploadProgressMessage);
            break;
          case 'upload_complete':
            this.handleUploadComplete(message as UploadCompleteMessage);
            break;
          case 'upload_error':
            this.handleUploadError(message as UploadErrorMessage);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.initializeWebSocket(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleProgressUpdate(message: UploadProgressMessage) {
    const upload = this.queue.files.get(message.uploadId);
    if (upload) {
      upload.loaded = message.progress.loaded;
      upload.total = message.progress.total;
      upload.percentage = message.progress.percentage;
      upload.status = message.progress.status;

      const callback = this.progressCallbacks.get(message.uploadId);
      if (callback) {
        callback(upload);
      }
    }
  }

  private handleUploadComplete(message: UploadCompleteMessage) {
    const upload = this.queue.files.get(message.uploadId);
    if (upload) {
      upload.status = 'completed';
      upload.percentage = 100;

      this.queue.activeUploads.delete(message.uploadId);

      const progressCallback = this.progressCallbacks.get(message.uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }

      const completeCallback = this.completeCallbacks.get(message.uploadId);
      if (completeCallback) {
        completeCallback(message.fileId, message.file);
      }

      this.cleanupCallbacks(message.uploadId);
      this.processQueue();
    }
  }

  private handleUploadError(message: UploadErrorMessage) {
    const upload = this.queue.files.get(message.uploadId);
    if (upload) {
      upload.status = 'error';
      upload.error = message.error;

      this.queue.activeUploads.delete(message.uploadId);

      const errorCallback = this.errorCallbacks.get(message.uploadId);
      if (errorCallback) {
        errorCallback(message.error, message.retryable);
      }

      // Auto-retry if possible
      if (message.retryable && upload.retryCount < upload.maxRetries) {
        setTimeout(() => {
          this.retryUpload(message.uploadId);
        }, this.RETRY_DELAY * (upload.retryCount + 1));
      } else {
        this.cleanupCallbacks(message.uploadId);
        this.processQueue();
      }
    }
  }

  private cleanupCallbacks(uploadId: string) {
    this.progressCallbacks.delete(uploadId);
    this.completeCallbacks.delete(uploadId);
    this.errorCallbacks.delete(uploadId);
  }

  async startUpload(
    file: File,
    channelId: string,
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (fileId: string, file: unknown) => void,
    onError?: (error: string, retryable: boolean) => void
  ): Promise<string> {
    // Validate file
    if (!this.validateFile(file)) {
      throw new Error('File validation failed');
    }

    // Validate channel ID
    if (!channelId || channelId.trim() === '') {
      throw new Error('Channel ID is required for upload');
    }

    console.log('Starting upload with channel ID:', channelId);

    let uploadId = this.generateUploadId();
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);

    // Create upload progress entry
    const uploadProgress: UploadProgress = {
      uploadId,
      filename: file.name,
      loaded: 0,
      total: file.size,
      percentage: 0,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.MAX_RETRIES,
      startTime: new Date().toISOString()
    };

    this.queue.files.set(uploadId, uploadProgress);

    // Store callbacks
    if (onProgress) this.progressCallbacks.set(uploadId, onProgress);
    if (onComplete) this.completeCallbacks.set(uploadId, onComplete);
    if (onError) this.errorCallbacks.set(uploadId, onError);

    // Store file data for later processing
    this.fileDataMap.set(uploadId, { file, channelId });

    // Start upload process
    try {
      console.log('Initializing upload session:', { uploadId, filename: file.name, size: file.size, channelId, totalChunks });
      const backendUploadId = await this.initiateUploadSession(uploadId, file, channelId, totalChunks);
      console.log('Upload session initialized successfully. Frontend ID:', uploadId, 'Backend ID:', backendUploadId);
      
      // If backend returned a different uploadId, update our tracking
      if (backendUploadId !== uploadId) {
        // Move all tracking data to the new uploadId
        this.queue.files.set(backendUploadId, uploadProgress);
        this.queue.files.delete(uploadId);
        
        if (onProgress) this.progressCallbacks.set(backendUploadId, onProgress);
        if (onComplete) this.completeCallbacks.set(backendUploadId, onComplete);
        if (onError) this.errorCallbacks.set(backendUploadId, onError);
        
        this.progressCallbacks.delete(uploadId);
        this.completeCallbacks.delete(uploadId);
        this.errorCallbacks.delete(uploadId);
        
        this.fileDataMap.set(backendUploadId, { file, channelId });
        this.fileDataMap.delete(uploadId);
        
        uploadProgress.uploadId = backendUploadId;
        uploadId = backendUploadId;
      }
      
      this.processQueue();
    } catch (error) {
      uploadProgress.status = 'error';
      uploadProgress.error = error instanceof Error ? error.message : 'Upload initialization failed';

      const errorCallback = this.errorCallbacks.get(uploadId);
      if (errorCallback) {
        errorCallback(uploadProgress.error, false);
      }
      
      this.fileDataMap.delete(uploadId);
    }

    return uploadId;
  }

  private async initiateUploadSession(
    _uploadId: string,
    file: File,
    channelId: string,
    _totalChunks: number
  ): Promise<string> {
    console.log('Calling upload initialize API:', { filename: file.name, mimeType: file.type, size: file.size, channelId });
    
    const response: ApiResponse<UploadSession> = await apiService.post('/files/upload/initialize', {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      channelId
    });

    console.log('Upload initialize response:', response);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to initiate upload session');
    }

    // Return the uploadId from the backend
    return response.data.uploadId;
  }

  private async processQueue(): Promise<void> {
    // Process pending uploads if we have capacity
    const pendingUploads = Array.from(this.queue.files.entries())
      .filter(([_, upload]) => upload.status === 'pending')
      .map(([uploadId, _]) => uploadId);

    console.log('processQueue - pending uploads:', pendingUploads);

    const availableSlots = this.queue.maxConcurrentUploads - this.queue.activeUploads.size;

    for (let i = 0; i < Math.min(availableSlots, pendingUploads.length); i++) {
      const uploadId = pendingUploads[i];
      console.log('Starting processUpload for uploadId:', uploadId);
      this.queue.activeUploads.add(uploadId);
      this.processUpload(uploadId);
    }
  }

  private async processUpload(uploadId: string): Promise<void> {
    console.log('processUpload called with uploadId:', uploadId);
    const upload = this.queue.files.get(uploadId);
    if (!upload) {
      console.log('No upload found for uploadId:', uploadId);
      return;
    }

    // Get the file from the stored files map
    const fileData = this.fileDataMap.get(uploadId);
    if (!fileData) {
      console.log('No fileData found for uploadId:', uploadId);
      upload.status = 'error';
      upload.error = 'File data not found';
      const errorCallback = this.errorCallbacks.get(uploadId);
      if (errorCallback) {
        errorCallback('File data not found', false);
      }
      return;
    }

    upload.status = 'uploading';
    upload.startTime = new Date().toISOString();

    const progressCallback = this.progressCallbacks.get(uploadId);
    if (progressCallback) {
      progressCallback(upload);
    }

    try {
      // Upload file in chunks
      const totalChunks = Math.ceil(fileData.file.size / this.CHUNK_SIZE);
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Check if upload was paused or cancelled
        const currentUpload = this.queue.files.get(uploadId);
        if (!currentUpload || currentUpload.status === 'paused') {
          return;
        }

        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, fileData.file.size);
        const chunk = fileData.file.slice(start, end);

        // Convert Blob to File for proper FormData handling
        const chunkFile = new File([chunk], `${fileData.file.name}.chunk${chunkIndex}`, {
          type: fileData.file.type || 'application/octet-stream'
        });

        // Upload chunk
        const formData = new FormData();
        formData.append('chunk', chunkFile);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('chunkSize', chunk.size.toString());
        formData.append('totalSize', fileData.file.size.toString());
        formData.append('filename', fileData.file.name);
        formData.append('mimeType', fileData.file.type);
        formData.append('channelId', fileData.channelId);

        // Get CSRF token and auth token
        const csrfToken = await this.getCsrfToken();
        const authTokens = localStorage.getItem('authTokens');
        const accessToken = authTokens ? JSON.parse(authTokens).accessToken : null;

        if (!accessToken) {
          console.error('No access token found in localStorage');
          throw new Error('Authentication required for upload');
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        // Log request details for debugging
        console.log('Uploading chunk:', {
          uploadId,
          chunkIndex,
          totalChunks,
          chunkSize: chunk.size,
          chunkFileName: chunkFile.name,
          chunkFileType: chunkFile.type,
          totalSize: fileData.file.size,
          filename: fileData.file.name,
          channelId: fileData.channelId,
          hasAuthToken: !!accessToken,
          hasCsrfToken: !!csrfToken,
          timestamp: new Date().toISOString()
        });
        
        const response = await fetch(`${apiUrl}/api/files/upload/chunk`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-csrf-token': csrfToken,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
          const errorMessage = errorData.error?.message || errorData.message || response.statusText;
          
          // Log detailed error information for debugging
          console.error('Chunk upload failed:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            uploadId,
            chunkIndex,
            totalChunks,
            chunkSize: chunk.size,
            totalSize: fileData.file.size,
            filename: fileData.file.name,
            mimeType: fileData.file.type,
            channelId: fileData.channelId
          });
          
          throw new Error(`Chunk upload failed: ${errorMessage}`);
        }

        const result = await response.json();

        // Update progress
        const bytesUploaded = end;
        upload.loaded = bytesUploaded;
        upload.percentage = (bytesUploaded / fileData.file.size) * 100;
        
        // Calculate speed (bytes per second)
        const totalElapsed = Date.now() - new Date(upload.startTime).getTime();
        upload.speed = totalElapsed > 0 ? (bytesUploaded / totalElapsed) * 1000 : 0;
        
        // Calculate estimated time remaining
        if (upload.speed > 0) {
          const remainingBytes = fileData.file.size - bytesUploaded;
          upload.estimatedTimeRemaining = (remainingBytes / upload.speed) * 1000;
        }

        if (progressCallback) {
          progressCallback(upload);
        }

        // Check if upload is complete - backend handles completion automatically
        if (result.uploadComplete) {
          upload.status = 'completed';
          upload.percentage = 100;
          upload.loaded = fileData.file.size;

          this.queue.activeUploads.delete(uploadId);

          if (progressCallback) {
            progressCallback(upload);
          }

          const completeCallback = this.completeCallbacks.get(uploadId);
          if (completeCallback && result.fileId) {
            completeCallback(result.fileId, result);
          }

          this.cleanupCallbacks(uploadId);
          this.fileDataMap.delete(uploadId);
          this.processQueue();
        }
      }
    } catch (error) {
      upload.status = 'error';
      upload.error = error instanceof Error ? error.message : 'Upload failed';

      this.queue.activeUploads.delete(uploadId);

      const errorCallback = this.errorCallbacks.get(uploadId);
      if (errorCallback) {
        errorCallback(upload.error, true);
      }

      // Auto-retry if possible
      if (upload.retryCount < upload.maxRetries) {
        setTimeout(() => {
          this.retryUpload(uploadId);
        }, this.RETRY_DELAY * (upload.retryCount + 1));
      } else {
        this.cleanupCallbacks(uploadId);
        this.fileDataMap.delete(uploadId);
        this.processQueue();
      }
    }
  }

  pauseUpload(uploadId: string): void {
    const upload = this.queue.files.get(uploadId);
    if (upload && (upload.status === 'uploading' || upload.status === 'pending')) {
      upload.status = 'paused';
      this.queue.activeUploads.delete(uploadId);
      this.queue.pausedUploads.add(uploadId);

      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }
    }
  }

  resumeUpload(uploadId: string): void {
    const upload = this.queue.files.get(uploadId);
    if (upload && upload.status === 'paused') {
      upload.status = 'pending';
      this.queue.pausedUploads.delete(uploadId);

      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }

      this.processQueue();
    }
  }

  cancelUpload(uploadId: string): void {
    const upload = this.queue.files.get(uploadId);
    if (upload) {
      this.queue.files.delete(uploadId);
      this.queue.activeUploads.delete(uploadId);
      this.queue.pausedUploads.delete(uploadId);
      this.cleanupCallbacks(uploadId);
      this.fileDataMap.delete(uploadId);

      // Cancel on server
      apiService.delete(`/files/upload/${uploadId}/cancel`).catch(console.error);
    }
  }

  async retryUpload(uploadId: string): Promise<void> {
    const upload = this.queue.files.get(uploadId);
    if (upload && upload.status === 'error') {
      upload.status = 'retrying';
      upload.retryCount++;
      upload.error = undefined;

      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }

      // Reset to pending for queue processing
      upload.status = 'pending';
      this.processQueue();
    }
  }

  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.queue.files.get(uploadId);
  }

  getAllUploads(): UploadProgress[] {
    return Array.from(this.queue.files.values());
  }

  getActiveUploads(): UploadProgress[] {
    return Array.from(this.queue.activeUploads)
      .map(id => this.queue.files.get(id))
      .filter(Boolean) as UploadProgress[];
  }

  getCompletedUploads(): UploadProgress[] {
    return Array.from(this.queue.files.values())
      .filter(upload => upload.status === 'completed');
  }

  getFailedUploads(): UploadProgress[] {
    return Array.from(this.queue.files.values())
      .filter(upload => upload.status === 'error');
  }

  getFileData(uploadId: string): { file: File; channelId: string } | undefined {
    return this.fileDataMap.get(uploadId);
  }

  clearCompleted(): void {
    const completedIds = Array.from(this.queue.files.entries())
      .filter(([_, upload]) => upload.status === 'completed')
      .map(([uploadId, _]) => uploadId);

    completedIds.forEach(id => {
      this.queue.files.delete(id);
      this.cleanupCallbacks(id);
    });
  }

  private validateFile(file: File): boolean {
    // File size validation (5GB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return false;
    }

    // File type validation (basic)
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
      // Documents
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Archives
      'application/zip', 'application/x-rar-compressed',
      // Other
      'application/octet-stream'
    ];

    return allowedTypes.includes(file.type) || file.type === '';
  }

  private generateUploadId(): string {
    // Generate a simple UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  calculateTimeRemaining(loaded: number, total: number, startTime: string): number {
    if (loaded === 0) return 0;

    const elapsed = Date.now() - new Date(startTime).getTime();
    const rate = loaded / elapsed;
    const remaining = total - loaded;

    return Math.round(remaining / rate);
  }
}

export const uploadService = new UploadService();