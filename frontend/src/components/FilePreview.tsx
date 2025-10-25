import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Eye, EyeOff, Maximize2, Minimize2, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { fileService } from '../services/fileService';
import { File as FileType, FilePreview } from '../types';

interface FilePreviewProps {
  file: FileType | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const FilePreviewModal: React.FC<FilePreviewProps> = ({
  file,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}) => {
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const maxRetries = 3;

  useEffect(() => {
    if (file && isOpen) {
      setRetryCount(0);
      setImageError(false);
      loadPreview();
    }
  }, [file, isOpen]);

  // Cleanup blob URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (preview?.url && preview.url.startsWith('blob:')) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview?.url]);

  const loadPreview = useCallback(async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      const previewData = await fileService.getFilePreview(file.id);
      
      // Get the authenticated blob URL for the file content
      const blobUrl = await fileService.getFileServeBlob(file.id);
      
      // Replace the direct URL with the blob URL
      const authenticatedPreview = {
        ...previewData,
        url: blobUrl
      };
      
      setPreview(authenticatedPreview);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
      setError(errorMessage);
      console.error('Preview load error:', err);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setImageError(false);
      loadPreview();
    }
  }, [retryCount, maxRetries, loadPreview]);

  const handleDownload = async () => {
    if (!file) return;

    try {
      await fileService.downloadFile(file.id, file.originalName);
    } catch (err) {
      console.error('Download failed:', err);
      // You could add a toast notification here in the future
      alert('Download failed. Please try again.');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (hasPrevious && onPrevious) onPrevious();
        break;
      case 'ArrowRight':
        if (hasNext && onNext) onNext();
        break;
      case 'f':
      case 'F':
        setIsFullscreen(!isFullscreen);
        break;
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hasPrevious, hasNext, isFullscreen]);

  if (!isOpen || !file) return null;

  const renderSkeletonLoader = () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading preview...</p>
        {retryCount > 0 && (
          <p className="text-sm text-gray-500 mt-2">Retry attempt {retryCount}/{maxRetries}</p>
        )}
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center max-w-md mx-auto p-6">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="font-medium text-gray-900 mb-2">Preview not available</h3>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        
        {retryCount < maxRetries ? (
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Unable to load preview after {maxRetries} attempts
            </p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreviewContent = () => {
    if (loading) {
      return renderSkeletonLoader();
    }

    if (error) {
      return renderErrorState();
    }

    if (!preview) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <EyeOff className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Preview not available</p>
            <p className="text-sm mt-2">This file type cannot be previewed</p>
            <button
              onClick={handleDownload}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download to View
            </button>
          </div>
        </div>
      );
    }

    switch (preview.type) {
      case 'image':
        return (
          <div className="flex items-center justify-center p-4">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading image...</p>
                </div>
              </div>
            )}
            {imageError ? (
              <div className="text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <p className="font-medium">Failed to load image</p>
                <button
                  onClick={() => {
                    setImageError(false);
                    setImageLoading(true);
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <img
                src={preview.url}
                alt={file.originalName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                style={{
                  maxHeight: isFullscreen ? '90vh' : '70vh',
                  maxWidth: '100%'
                }}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                onLoadStart={() => setImageLoading(true)}
              />
            )}
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center justify-center p-4">
            <video
              src={preview.url}
              controls
              className="max-w-full max-h-full rounded-lg shadow-lg"
              style={{
                maxHeight: isFullscreen ? '90vh' : '70vh',
                maxWidth: '100%'
              }}
              onError={() => {
                console.error('Video failed to load');
              }}
              preload="metadata"
            >
              <div className="text-center text-gray-500 p-8">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p>Your browser does not support video playback.</p>
                <button
                  onClick={handleDownload}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Download to view
                </button>
              </div>
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{file.originalName}</h3>
              <p className="text-gray-500 mb-6">Audio file</p>
              <audio
                src={preview.url}
                controls
                className="w-full"
                onError={() => {
                  console.error('Audio failed to load');
                }}
                preload="metadata"
              >
                <div className="text-center text-gray-500 p-4">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <p className="text-sm">Your browser does not support audio playback.</p>
                  <button
                    onClick={handleDownload}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Download to listen
                  </button>
                </div>
              </audio>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4">
              <iframe
                src={preview.url}
                className="w-full h-full rounded-lg shadow-lg border border-gray-200"
                title={`PDF preview: ${file.originalName}`}
                style={{
                  minHeight: '70vh'
                }}
                onError={() => {
                  console.error('PDF failed to load');
                }}
              />
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                  If the PDF doesn't display properly, try downloading it.
                </p>
                <button
                  onClick={handleDownload}
                  className="mt-1 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
              <iframe
                src={preview.url}
                className="w-full h-96 border border-gray-200 rounded bg-white"
                title={`Text preview: ${file.originalName}`}
                onError={() => {
                  console.error('Text file failed to load');
                }}
              />
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                  Text file preview. Download for better formatting.
                </p>
                <button
                  onClick={handleDownload}
                  className="mt-1 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Download File
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-gray-500">
              <EyeOff className="w-12 h-12 mx-auto mb-4" />
              <p className="font-medium">Preview not available</p>
              <p className="text-sm mt-2 mb-4">This file type cannot be previewed in the browser</p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download to View
              </button>
            </div>
          </div>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className={`relative bg-white rounded-lg ${isFullscreen ? 'w-full h-full' : 'max-w-6xl max-h-[90vh]'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-medium text-gray-900 truncate" title={file.originalName}>
              {file.originalName}
            </h2>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{file.mimeType || 'Unknown type'}</span>
              <span>•</span>
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Navigation buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous file (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next file (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-md text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> to close</span>
              <span>Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">←</kbd> <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">→</kbd> to navigate</span>
              <span>Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">F</kbd> for fullscreen</span>
            </div>
            {preview?.metadata && (
              <div className="flex items-center space-x-4">
                {preview.metadata.dimensions && (
                  <span>Dimensions: {preview.metadata.dimensions.width} × {preview.metadata.dimensions.height}</span>
                )}
                {preview.metadata.duration && (
                  <span>Duration: {Math.round(preview.metadata.duration)}s</span>
                )}
                {preview.metadata.pages && (
                  <span>Pages: {preview.metadata.pages}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;