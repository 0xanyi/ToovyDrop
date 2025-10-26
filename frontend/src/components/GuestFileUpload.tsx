import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image, Film, Music, Archive, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { guestUploadService } from '../services/guestUploadService';
import { UploadProgress } from '../types';
import Button from './Button';
import ProgressIndicator from './ProgressIndicator';

interface GuestFileUploadProps {
  token: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  onUploadComplete?: (result: { success: boolean; fileId?: string; fileName?: string; error?: string; retryable?: boolean }) => void;
  onUploadStart?: () => void;
  className?: string;
}

interface FileUploadState {
  file: File | null;
  progress: UploadProgress | null;
  result: {
    success: boolean;
    fileId?: string;
    fileName?: string;
    error?: string;
    retryable?: boolean;
  } | null;
  isUploading: boolean;
}

const GuestFileUpload: React.FC<GuestFileUploadProps> = ({
  token,
  maxFileSize,
  allowedMimeTypes,
  onUploadComplete,
  onUploadStart,
  className = ''
}) => {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    progress: null,
    result: null,
    isUploading: false
  });
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="w-8 h-8" />;
    
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-green-500" />;
    if (mimeType.startsWith('video/')) return <Film className="w-8 h-8 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-8 h-8 text-pink-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
      return <Archive className="w-8 h-8 text-yellow-600" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  const validateFile = useCallback((file: File): string | null => {
    // File size validation
    if (maxFileSize && file.size > maxFileSize) {
      return `File size exceeds maximum allowed size of ${guestUploadService.formatFileSize(maxFileSize)}`;
    }

    // File type validation
    if (allowedMimeTypes && allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed`;
    }

    // Basic validation
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

    return null;
  }, [maxFileSize, allowedMimeTypes]);

  const handleFileSelect = useCallback((files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0]; // Only handle single file for guest uploads
    const error = validateFile(file);
    
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setUploadState({
      file,
      progress: null,
      result: null,
      isUploading: false
    });
  }, [validateFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setDragActive(false);
    handleFileSelect(acceptedFiles);
  }, [handleFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    multiple: false, // Only allow single file for guest uploads
    maxSize: maxFileSize || 5 * 1024 * 1024 * 1024, // 5GB default
    accept: allowedMimeTypes ? 
      Object.fromEntries(allowedMimeTypes.map(type => [type, []])) : 
      {
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

  const handleUpload = async () => {
    if (!uploadState.file || uploadState.isUploading) return;

    setUploadState(prev => ({ ...prev, isUploading: true, result: null }));
    setValidationError(null);

    if (onUploadStart) {
      onUploadStart();
    }

    try {
      const result = await guestUploadService.uploadFile(
        token,
        uploadState.file,
        maxFileSize,
        (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress
          }));
        }
      );

      const uploadResult = {
        success: result.success,
        fileId: result.fileId,
        fileName: result.file?.originalName || uploadState.file?.name,
        error: result.error?.message,
        retryable: result.error?.retryable
      };

      setUploadState(prev => ({
        ...prev,
        result: uploadResult,
        isUploading: false
      }));

      if (onUploadComplete) {
        onUploadComplete(uploadResult);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      const isRetryable = error && typeof error === 'object' && 'retryable' in error ? 
        Boolean(error.retryable) : false;
      
      const uploadResult = {
        success: false,
        error: errorMessage,
        retryable: isRetryable
      };

      setUploadState(prev => ({
        ...prev,
        result: uploadResult,
        isUploading: false
      }));

      if (onUploadComplete) {
        onUploadComplete(uploadResult);
      }
    }
  };

  const handleReset = () => {
    setUploadState({
      file: null,
      progress: null,
      result: null,
      isUploading: false
    });
    setValidationError(null);
    setRetryCount(0);
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setUploadState(prev => ({
        ...prev,
        result: null,
        progress: null
      }));
      handleUpload();
    }
  };

  const handleRemoveFile = () => {
    setUploadState(prev => ({
      ...prev,
      file: null,
      progress: null,
      result: null
    }));
    setValidationError(null);
    setRetryCount(0);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Selection Area */}
      {!uploadState.file && !uploadState.result && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300
            ${isDragActive || dragActive
              ? 'border-blue-500 bg-blue-50 scale-105'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          
          <Upload className={`
            h-12 w-12 mx-auto mb-4 transition-all duration-300
            ${isDragActive || dragActive ? 'text-blue-500 animate-bounce' : 'text-gray-400'}
          `} />
          
          {isDragActive || dragActive ? (
            <div>
              <p className="text-lg font-medium text-blue-700 mb-2">Drop your file here</p>
              <p className="text-blue-600">Release to select the file</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag & drop a file here or click to browse
              </p>
              <p className="text-gray-500 mb-4">Select a file to upload</p>
              
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400 mb-4">
                <span className="px-2 py-1 bg-gray-100 rounded">Images</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Videos</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Documents</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Audio</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Archives</span>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>Maximum file size: {maxFileSize ? guestUploadService.formatFileSize(maxFileSize) : '5GB'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected File Display */}
      {uploadState.file && !uploadState.result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              {getFileIcon(uploadState.file.type)}
              <div>
                <p className="font-medium text-gray-900">{uploadState.file.name}</p>
                <p className="text-sm text-gray-600">
                  {guestUploadService.formatFileSize(uploadState.file.size)}
                </p>
              </div>
            </div>
            <Button
              onClick={handleRemoveFile}
              variant="ghost"
              size="sm"
              disabled={uploadState.isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Upload Progress */}
          {uploadState.progress && (
            <div className="space-y-3">
              <ProgressIndicator
                progress={uploadState.progress.percentage}
                status={uploadState.progress.status === 'uploading' ? 'loading' : 
                        uploadState.progress.status === 'completed' ? 'success' :
                        uploadState.progress.status === 'error' ? 'error' : 'idle'}
              />
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {guestUploadService.formatFileSize(uploadState.progress.loaded)} / {guestUploadService.formatFileSize(uploadState.progress.total)}
                </span>
                {uploadState.progress.speed && (
                  <span>
                    {guestUploadService.formatFileSize(uploadState.progress.speed)}/s
                  </span>
                )}
              </div>

              {uploadState.progress.estimatedTimeRemaining && uploadState.progress.estimatedTimeRemaining > 1000 && (
                <div className="text-center text-sm text-gray-500">
                  Estimated time remaining: {Math.round(uploadState.progress.estimatedTimeRemaining / 1000)}s
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex space-x-3">
            <Button
              onClick={handleUpload}
              disabled={uploadState.isUploading}
              className="flex-1"
            >
              {uploadState.isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={uploadState.isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadState.result && (
        <div className="text-center space-y-6">
          {uploadState.result.success ? (
            <>
              {/* Enhanced Success Section */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
                  <CheckCircle2 className="relative h-16 w-16 text-green-500 mx-auto" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-green-700">
                    🎉 Upload Successful!
                  </h3>
                  <p className="text-lg text-gray-700">
                    Your file has been uploaded successfully
                  </p>
                </div>
              </div>

              {/* Upload Details */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center space-x-2 text-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Upload Details</span>
                </div>
                
                <div className="text-sm space-y-2 text-green-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">File:</span>
                    <span className="truncate max-w-xs" title={uploadState.result.fileName}>
                      {uploadState.result.fileName}
                    </span>
                  </div>
                  
                  {uploadState.file && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Size:</span>
                      <span>{guestUploadService.formatFileSize(uploadState.file.size)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Uploaded:</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Clear Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium mb-3">
                  What would you like to do next?
                </p>
                <p className="text-blue-700 text-sm">
                  Your file is now available to the channel team. You can upload additional files or complete your submission.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900">Upload Failed</h3>
              <p className="text-red-600 mb-2">
                {uploadState.result.error || 'An error occurred during upload'}
              </p>
              
              {/* Retry information */}
              {uploadState.result.retryable && retryCount < maxRetries && (
                <p className="text-sm text-gray-600">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              )}
              
              {uploadState.result.retryable && retryCount >= maxRetries && (
                <p className="text-sm text-red-600">
                  Maximum retry attempts reached. Please try again later.
                </p>
              )}
            </>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            {!uploadState.result.success && uploadState.result.retryable && retryCount < maxRetries && (
              <Button
                onClick={handleRetry}
                variant="outline"
                disabled={uploadState.isUploading}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Upload ({maxRetries - retryCount} left)
              </Button>
            )}
            
            <Button
              onClick={handleReset}
              variant={uploadState.result.success ? "primary" : "outline"}
              className={uploadState.result.success ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {uploadState.result.success ? 'Upload Another File' : 'Try Different File'}
            </Button>
            
            {uploadState.result.success && (
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{validationError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestFileUpload;