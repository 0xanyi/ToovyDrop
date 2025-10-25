import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, Pause, Play, RotateCcw, FileText, Image, Film, Music, Archive, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { uploadService } from '../services/uploadService';
import { adminService } from '../services/adminService';
import { UploadProgress, Channel } from '../types';
import { useIsMobile, useIsTouchDevice } from '../hooks/useSwipeGestures';
import { useScreenReader, generateId } from '../hooks/useAccessibility';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../design-system/utils';
import toast from 'react-hot-toast';

interface FileUploadProps {
  channelId: string;
  channels: Channel[];
  onUploadComplete?: (fileId: string, file: unknown) => void;
  className?: string;
}

interface FileUploadItemProps {
  upload: UploadProgress;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
}

const FileUploadItem: React.FC<FileUploadItemProps> = React.memo(({
  upload,
  onPause,
  onResume,
  onRetry,
  onCancel
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Generate thumbnail for image files
  React.useEffect(() => {
    const fileData = uploadService.getFileData?.(upload.uploadId);
    if (fileData?.file && fileData.file.type.startsWith('image/')) {
      const url = URL.createObjectURL(fileData.file);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [upload.uploadId]);

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType?.startsWith('video/')) return <Film className="w-5 h-5" />;
    if (mimeType?.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) return <Archive className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'retrying': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressBarColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'completed': return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'error': return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'retrying': return 'bg-gradient-to-r from-orange-500 to-orange-600';
      case 'paused': return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'retrying': return <RotateCcw className="w-4 h-4 animate-spin" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadgeColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'retrying': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border-2 space-y-4 transition-all duration-300',
      'p-4 sm:p-6', // Responsive padding
      upload.status === 'completed' ? 'border-green-200 bg-green-50' : 
        upload.status === 'error' ? 'border-red-200 bg-red-50' :
        upload.status === 'uploading' ? 'border-blue-200 bg-blue-50' :
        'border-gray-200'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
          {/* File thumbnail or icon */}
          <div className="flex-shrink-0">
            {thumbnailUrl ? (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 border-gray-200">
                <img 
                  src={thumbnailUrl} 
                  alt={upload.filename}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                {getFileIcon()}
              </div>
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">
                  {upload.filename}
                </p>
                <p className="text-sm text-gray-500">
                  {uploadService.formatFileSize(upload.total)}
                </p>
              </div>
              
              {/* Status badge */}
              <div className={`
                inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border
                ${getStatusBadgeColor(upload.status)}
              `}>
                {getStatusIcon(upload.status)}
                <span className="capitalize">{upload.status}</span>
              </div>
            </div>

            {/* Progress info */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {uploadService.formatFileSize(upload.loaded)} / {uploadService.formatFileSize(upload.total)}
                </span>
                <span className={`font-semibold ${getStatusColor(upload.status)}`}>
                  {upload.percentage.toFixed(1)}%
                </span>
              </div>
              
              {/* Real-time upload statistics */}
              {upload.status === 'uploading' && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <span>Speed: {uploadService.formatFileSize(upload.speed || 0)}/s</span>
                    {upload.estimatedTimeRemaining && (
                      <span>ETA: {Math.round(upload.estimatedTimeRemaining / 1000)}s</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Uploading...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2 ml-2 sm:ml-4">
          {upload.status === 'uploading' && onPause && (
            <button
              onClick={onPause}
              className={cn(
                'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors',
                'touch-target-comfortable flex items-center justify-center'
              )}
              title="Pause upload"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {upload.status === 'paused' && onResume && (
            <button
              onClick={onResume}
              className={cn(
                'text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors',
                'touch-target-comfortable flex items-center justify-center'
              )}
              title="Resume upload"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {(upload.status === 'error' || upload.status === 'retrying') && onRetry && (
            <button
              onClick={onRetry}
              className={cn(
                'text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors',
                'touch-target-comfortable flex items-center justify-center'
              )}
              title="Retry upload"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onCancel && upload.status !== 'completed' && (
            <button
              onClick={onCancel}
              className={cn(
                'text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors',
                'touch-target-comfortable flex items-center justify-center'
              )}
              title="Cancel upload"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Progress bar */}
      <div className="space-y-2">
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-out ${getProgressBarColor(upload.status)} relative overflow-hidden`}
              style={{ width: `${upload.percentage}%` }}
            >
              {/* Animated stripe effect for active uploads */}
              {upload.status === 'uploading' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
              )}
              
              {/* Shimmer effect for completed uploads */}
              {upload.status === 'completed' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {upload.error && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Upload Error</p>
              <p className="text-sm text-red-700 mt-1">{upload.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Retry information */}
      {upload.retryCount > 0 && (
        <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-orange-600" />
            <p className="text-sm text-orange-800">
              Retry attempt {upload.retryCount} of {upload.maxRetries}
            </p>
          </div>
        </div>
      )}

      {/* Success message */}
      {upload.status === 'completed' && (
        <div className="bg-green-100 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Upload completed successfully!
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

const FileUpload: React.FC<FileUploadProps> = ({
  channelId,
  channels,
  onUploadComplete,
  className = ''
}) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState(channelId);
  const [allChannels, setAllChannels] = useState<Channel[]>(channels);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const { announce, AnnouncementRegion } = useScreenReader();
  const dropzoneId = generateId('dropzone');
  const channelSelectId = generateId('channel-select');

  // Fetch all channels for admin users
  useEffect(() => {
    const fetchAllChannels = async () => {
      if (isAdmin()) {
        setLoadingChannels(true);
        try {
          const response = await adminService.getChannels({ limit: 100 }); // Get all channels
          if (response.success && response.data?.channels) {
            setAllChannels(response.data.channels);
            // If no channel is selected yet, select the first one
            if (!selectedChannelId && response.data.channels.length > 0) {
              setSelectedChannelId(response.data.channels[0].id);
            }
          }
        } catch (error) {
          console.error('Failed to fetch channels:', error);
          toast.error('Failed to load channels');
        } finally {
          setLoadingChannels(false);
        }
      }
    };

    fetchAllChannels();
  }, [isAdmin, selectedChannelId]);

  // Update uploads periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      const allUploads = uploadService.getAllUploads();
      setUploads(allUploads);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFiles = useCallback((files: File[]): { valid: File[], invalid: { file: File, error: string }[] } => {
    const valid: File[] = [];
    const invalid: { file: File, error: string }[] = [];
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        invalid.push({ file, error: `File size exceeds 5GB limit (${uploadService.formatFileSize(file.size)})` });
      } else if (file.size === 0) {
        invalid.push({ file, error: 'File is empty' });
      } else {
        valid.push(file);
      }
    });

    return { valid, invalid };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setValidationErrors([]);
    
    // Handle rejected files from react-dropzone
    const rejectionErrors: string[] = [];
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error) => {
        if (error.code === 'file-too-large') {
          rejectionErrors.push(`${file.name}: File too large (max 5GB)`);
        } else if (error.code === 'file-invalid-type') {
          rejectionErrors.push(`${file.name}: File type not supported`);
        } else {
          rejectionErrors.push(`${file.name}: ${error.message}`);
        }
      });
    });

    // Validate accepted files
    const { valid, invalid } = validateFiles(acceptedFiles);
    
    // Combine all validation errors
    const allErrors = [
      ...rejectionErrors,
      ...invalid.map(({ file, error }) => `${file.name}: ${error}`)
    ];

    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      allErrors.forEach(error => toast.error(error));
    }

    // Start uploads for valid files
    valid.forEach(file => {
      announce(`Starting upload for ${file.name}`);
      uploadService.startUpload(
        file,
        selectedChannelId,
        (_progress) => {
          setUploads(uploadService.getAllUploads());
        },
        (fileId, _fileData) => {
          toast.success(`Upload completed: ${file.name}`);
          announce(`Upload completed successfully for ${file.name}`);
          if (onUploadComplete) {
            onUploadComplete(fileId, _fileData);
          }
        },
        (error, _retryable) => {
          toast.error(`Upload failed: ${error}`);
          announce(`Upload failed for ${file.name}: ${error}`, 'assertive');
        }
      );
    });
  }, [selectedChannelId, onUploadComplete, validateFiles]);

  const { getRootProps, getInputProps, isDragActive: dropzoneIsDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    multiple: true,
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv', '.json', '.xml'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    }
  });

  const handlePauseUpload = (uploadId: string) => {
    uploadService.pauseUpload(uploadId);
    setUploads(uploadService.getAllUploads());
  };

  const handleResumeUpload = (uploadId: string) => {
    uploadService.resumeUpload(uploadId);
    setUploads(uploadService.getAllUploads());
  };

  const handleRetryUpload = async (uploadId: string) => {
    await uploadService.retryUpload(uploadId);
    setUploads(uploadService.getAllUploads());
  };

  const handleCancelUpload = (uploadId: string) => {
    uploadService.cancelUpload(uploadId);
    setUploads(uploadService.getAllUploads());
    toast.success('Upload cancelled');
  };

  const handleClearCompleted = () => {
    uploadService.clearCompleted();
    setUploads(uploadService.getAllUploads());
  };

  const handlePauseAll = () => {
    uploadStats.active.forEach(upload => {
      uploadService.pauseUpload(upload.uploadId);
    });
    setUploads(uploadService.getAllUploads());
    toast.success(`Paused ${uploadStats.active.length} upload${uploadStats.active.length !== 1 ? 's' : ''}`);
  };

  const handleResumeAll = () => {
    uploadStats.paused.forEach(upload => {
      uploadService.resumeUpload(upload.uploadId);
    });
    setUploads(uploadService.getAllUploads());
    toast.success(`Resumed ${uploadStats.paused.length} upload${uploadStats.paused.length !== 1 ? 's' : ''}`);
  };

  const handleRetryAll = async () => {
    const failedUploads = uploadStats.failed;
    const pausedUploads = uploadStats.paused;
    const allRetryUploads = [...failedUploads, ...pausedUploads];
    
    for (const upload of allRetryUploads) {
      if (upload.status === 'error') {
        await uploadService.retryUpload(upload.uploadId);
      } else if (upload.status === 'paused') {
        uploadService.resumeUpload(upload.uploadId);
      }
    }
    
    setUploads(uploadService.getAllUploads());
    toast.success(`Retrying ${allRetryUploads.length} upload${allRetryUploads.length !== 1 ? 's' : ''}`);
  };

  const uploadStats = useMemo(() => ({
    active: uploads.filter(u => u.status === 'uploading' || u.status === 'pending'),
    completed: uploads.filter(u => u.status === 'completed'),
    failed: uploads.filter(u => u.status === 'error'),
    paused: uploads.filter(u => u.status === 'paused'),
  }), [uploads]);

  return (
    <div className={`space-y-4 ${className}`}>
      <AnnouncementRegion />
      {/* Channel selector */}
      {(allChannels.length > 1 || isAdmin()) && (
        <div className="mobile-padding lg:p-0 form-field-accessible">
          <label 
            htmlFor={channelSelectId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Upload to Channel
            {isAdmin() && (
              <span className="text-xs text-gray-500 ml-2">(Admin: Select any channel)</span>
            )}
          </label>
          {loadingChannels ? (
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-gray-600">Loading channels...</span>
            </div>
          ) : (
            <select
              id={channelSelectId}
              value={selectedChannelId}
              onChange={(e) => {
                setSelectedChannelId(e.target.value);
                const selectedChannel = allChannels.find(c => c.id === e.target.value);
                announce(`Selected channel: ${selectedChannel?.name}`);
              }}
              className={cn(
                'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'text-base', // Prevent zoom on iOS
                isMobile && 'touch-target-comfortable'
              )}
              aria-describedby={`${channelSelectId}-description`}
              disabled={allChannels.length === 0}
            >
              {allChannels.length === 0 ? (
                <option value="">No channels available</option>
              ) : (
                allChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                    {channel.description && ` - ${channel.description}`}
                  </option>
                ))
              )}
            </select>
          )}
          <div id={`${channelSelectId}-description`} className="sr-only">
            Select the channel where you want to upload your files
          </div>
          {isAdmin() && allChannels.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              As an admin, you can upload to any channel. Selected: {allChannels.find(c => c.id === selectedChannelId)?.name}
            </p>
          )}
        </div>
      )}

      {/* Enhanced Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl text-center cursor-pointer',
          'transition-all duration-300 ease-in-out transform',
          'mobile-padding lg:p-12',
          isMobile ? 'p-8' : 'p-12',
          dropzoneIsDragActive || isDragActive
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg border-solid'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 hover:scale-102',
          uploads.some(u => u.status === 'uploading') && 'pointer-events-none opacity-75',
          isTouchDevice && 'active:scale-95'
        )}
        role="button"
        tabIndex={0}
        aria-labelledby={`${dropzoneId}-label`}
        aria-describedby={`${dropzoneId}-description`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Trigger file selection
            const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }
        }}
      >
        <input 
          {...getInputProps()} 
          aria-describedby={`${dropzoneId}-description`}
        />
        
        {/* Animated background pattern */}
        <div className={`
          absolute inset-0 rounded-xl opacity-10 transition-opacity duration-300
          ${dropzoneIsDragActive || isDragActive ? 'opacity-20' : 'opacity-0'}
        `}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl"></div>
        </div>

        {/* Upload icon with animation */}
        <div className={cn(
          'relative z-10 transition-all duration-300 transform',
          dropzoneIsDragActive || isDragActive ? 'scale-110 text-blue-600' : 'text-gray-400'
        )}>
          <Upload className={cn(
            'mx-auto mb-6 transition-all duration-300',
            isMobile ? 'w-12 h-12 mb-4' : 'w-16 h-16 mb-6',
            dropzoneIsDragActive || isDragActive && 'animate-bounce'
          )} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {dropzoneIsDragActive || isDragActive ? (
            <div className="space-y-2">
              <p className={cn(
                'text-blue-700 font-semibold animate-pulse',
                isMobile ? 'text-base' : 'text-lg'
              )}>
                Drop files here to upload
              </p>
              <p className="text-blue-600 text-sm">
                Release to start uploading
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p 
                  id={`${dropzoneId}-label`}
                  className={cn(
                    'text-gray-700 font-semibold mb-2',
                    isMobile ? 'text-base' : 'text-lg'
                  )}
                >
                  {isTouchDevice ? 'Tap to select files' : 'Drag & drop files here'}
                </p>
                <p className="text-gray-500 mb-4">
                  {isTouchDevice ? 'or drag and drop from other apps' : 'or click to browse and select files'}
                </p>
              </div>
              
              <div className={cn(
                'flex flex-wrap justify-center gap-2 text-xs text-gray-400 mb-4',
                isMobile && 'gap-1'
              )}>
                <span className="px-2 py-1 bg-gray-100 rounded">Images</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Videos</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Documents</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Audio</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Archives</span>
              </div>
              
              <div 
                id={`${dropzoneId}-description`}
                className="text-sm text-gray-500 space-y-1"
              >
                <p>Maximum file size: <span className="font-medium">5GB</span></p>
                <p>Multiple files supported</p>
                {isMobile && (
                  <p className="text-xs">Tip: You can also share files from other apps</p>
                )}
                <p className="sr-only">
                  Supported file types include images, videos, documents, audio files, and archives. 
                  You can select multiple files at once.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pulse animation overlay for active state */}
        {(dropzoneIsDragActive || isDragActive) && (
          <div className="absolute inset-0 rounded-xl border-2 border-blue-500 animate-ping opacity-25"></div>
        )}
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                File validation errors:
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-1 h-1 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Upload Queue Management */}
      {(uploadStats.active.length > 0 || uploadStats.completed.length > 0 || uploadStats.failed.length > 0 || uploadStats.paused.length > 0) && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload Queue</h3>
                <p className="text-sm text-gray-500">
                  {uploads.length} file{uploads.length !== 1 ? 's' : ''} in queue
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Batch operations */}
              {uploadStats.active.length > 0 && (
                <button
                  onClick={handlePauseAll}
                  className="px-3 py-1.5 text-sm text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Pause className="w-3 h-3" />
                  <span>Pause All</span>
                </button>
              )}
              
              {uploadStats.paused.length > 0 && (
                <button
                  onClick={handleResumeAll}
                  className="px-3 py-1.5 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Play className="w-3 h-3" />
                  <span>Resume All</span>
                </button>
              )}
              
              {(uploadStats.failed.length > 0 || uploadStats.paused.length > 0) && (
                <button
                  onClick={handleRetryAll}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry All</span>
                </button>
              )}
              
              {uploadStats.completed.length > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Clear Completed
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {uploadStats.active.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{uploadStats.active.length}</p>
                    <p className="text-sm text-gray-600">Active</p>
                  </div>
                </div>
              </div>
            )}
            
            {uploadStats.paused.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Pause className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{uploadStats.paused.length}</p>
                    <p className="text-sm text-gray-600">Paused</p>
                  </div>
                </div>
              </div>
            )}
            
            {uploadStats.completed.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{uploadStats.completed.length}</p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                </div>
              </div>
            )}
            
            {uploadStats.failed.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{uploadStats.failed.length}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overall Progress and Statistics */}
          {uploads.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-500">
                  {uploadStats.completed.length} of {uploads.length} completed
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{
                    width: `${uploads.length > 0 ? (uploadStats.completed.length / uploads.length) * 100 : 0}%`
                  }}
                >
                  {uploadStats.active.length > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Real-time statistics */}
              {uploadStats.active.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500">Total Size</p>
                    <p className="font-semibold text-gray-900">
                      {uploadService.formatFileSize(
                        uploads.reduce((total, upload) => total + upload.total, 0)
                      )}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-gray-500">Uploaded</p>
                    <p className="font-semibold text-blue-600">
                      {uploadService.formatFileSize(
                        uploads.reduce((total, upload) => total + upload.loaded, 0)
                      )}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-gray-500">Avg Speed</p>
                    <p className="font-semibold text-green-600">
                      {uploadService.formatFileSize(
                        uploadStats.active.reduce((total, upload) => total + (upload.speed || 0), 0) / Math.max(uploadStats.active.length, 1)
                      )}/s
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-gray-500">ETA</p>
                    <p className="font-semibold text-orange-600">
                      {(() => {
                        const avgETA = uploadStats.active.reduce((total, upload) => 
                          total + (upload.estimatedTimeRemaining || 0), 0) / Math.max(uploadStats.active.length, 1);
                        return avgETA > 0 ? `${Math.round(avgETA / 1000)}s` : '--';
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(upload => (
            <FileUploadItem
              key={upload.uploadId}
              upload={upload}
              onPause={() => handlePauseUpload(upload.uploadId)}
              onResume={() => handleResumeUpload(upload.uploadId)}
              onRetry={() => handleRetryUpload(upload.uploadId)}
              onCancel={() => handleCancelUpload(upload.uploadId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;