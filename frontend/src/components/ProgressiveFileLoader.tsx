import React, { useState, useEffect } from 'react';
import { useProgressiveFileLoading } from '../hooks/useFileQueries';
import { Loader2, Download, Play, Pause } from 'lucide-react';

interface ProgressiveFileLoaderProps {
  fileId: string;
  fileName: string;
  onLoadComplete?: (fileId: string) => void;
  className?: string;
}

export const ProgressiveFileLoader: React.FC<ProgressiveFileLoaderProps> = ({
  fileId,
  fileName,
  onLoadComplete,
  className = '',
}) => {
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [loadingSpeed, setLoadingSpeed] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);

  const {
    metadata,
    loadedChunks,
    totalChunks,
    isLoading,
    loadChunk,
    loadNextChunks,
    progress,
  } = useProgressiveFileLoading(fileId, true);

  // Calculate loading speed
  useEffect(() => {
    if (loadedChunks.length > 0 && startTime > 0) {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const bytesLoaded = loadedChunks.length * (metadata?.chunkSize || 0);
      const speed = bytesLoaded / elapsed; // bytes per second
      setLoadingSpeed(speed);
    }
  }, [loadedChunks.length, startTime, metadata?.chunkSize]);

  // Auto-loading functionality
  useEffect(() => {
    if (isAutoLoading && !isLoading && loadedChunks.length < totalChunks) {
      const timer = setTimeout(() => {
        loadNextChunks(3); // Load 3 chunks at a time
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAutoLoading, isLoading, loadedChunks.length, totalChunks, loadNextChunks]);

  // Notify when loading is complete
  useEffect(() => {
    if (progress === 100 && onLoadComplete) {
      onLoadComplete(fileId);
    }
  }, [progress, fileId, onLoadComplete]);

  const handleStartAutoLoading = () => {
    if (!isAutoLoading) {
      setStartTime(Date.now());
      setIsAutoLoading(true);
      loadNextChunks(3);
    }
  };

  const handleStopAutoLoading = () => {
    setIsAutoLoading(false);
  };

  const handleLoadNextChunk = () => {
    if (loadedChunks.length < totalChunks) {
      if (startTime === 0) {
        setStartTime(Date.now());
      }
      loadChunk(loadedChunks.length);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  if (!metadata) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading file metadata...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900 truncate">{fileName}</h3>
          <p className="text-sm text-gray-500">
            {formatBytes(metadata.size)} • {totalChunks} chunks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isAutoLoading ? (
            <button
              onClick={handleStartAutoLoading}
              disabled={progress === 100}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 mr-1" />
              Auto Load
            </button>
          ) : (
            <button
              onClick={handleStopAutoLoading}
              className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </button>
          )}
          <button
            onClick={handleLoadNextChunk}
            disabled={isLoading || progress === 100}
            className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-1" />
            Load Chunk
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress: {Math.round(progress)}%</span>
          <span>{loadedChunks.length} / {totalChunks} chunks</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Loading Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Loaded:</span>
          <span className="ml-2 font-medium">
            {formatBytes(loadedChunks.length * metadata.chunkSize)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Speed:</span>
          <span className="ml-2 font-medium">
            {loadingSpeed > 0 ? formatSpeed(loadingSpeed) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Chunk Status Visualization */}
      {totalChunks <= 50 && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Chunk Status:</p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: totalChunks }, (_, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-sm ${
                  loadedChunks.includes(index)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
                title={`Chunk ${index + 1}: ${
                  loadedChunks.includes(index) ? 'Loaded' : 'Not loaded'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center mt-4 p-2 bg-blue-50 rounded-md">
          <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-600" />
          <span className="text-blue-600 text-sm">Loading chunks...</span>
        </div>
      )}

      {/* Completion Message */}
      {progress === 100 && (
        <div className="flex items-center justify-center mt-4 p-2 bg-green-50 rounded-md">
          <span className="text-green-600 text-sm font-medium">
            ✓ File loaded completely!
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressiveFileLoader;