import React, { ReactNode } from 'react';
import { FileX, RefreshCw, AlertTriangle } from 'lucide-react';
import Button from './Button';
import ErrorBoundary from './ErrorBoundary';

interface FileErrorBoundaryProps {
  children: ReactNode;
  fileName?: string;
  operation?: 'upload' | 'download' | 'preview' | 'delete' | 'rename';
  onRetry?: () => void;
  onCancel?: () => void;
}

/**
 * Specialized error boundary for file operations
 * Provides context-aware error messages and recovery options
 */
const FileErrorBoundary: React.FC<FileErrorBoundaryProps> = ({
  children,
  fileName,
  operation = 'upload',
  onRetry,
  onCancel
}) => {
  const getErrorMessage = (operation: string, fileName?: string) => {
    const file = fileName ? ` "${fileName}"` : '';
    
    switch (operation) {
      case 'upload':
        return `Failed to upload${file}. Please check your connection and try again.`;
      case 'download':
        return `Failed to download${file}. The file may have been moved or deleted.`;
      case 'preview':
        return `Failed to preview${file}. The file format may not be supported.`;
      case 'delete':
        return `Failed to delete${file}. You may not have permission to delete this file.`;
      case 'rename':
        return `Failed to rename${file}. Please check the new name and try again.`;
      default:
        return `Failed to process${file}. Please try again.`;
    }
  };

  const getActionSuggestion = (operation: string) => {
    switch (operation) {
      case 'upload':
        return 'Check your internet connection and ensure the file is not corrupted.';
      case 'download':
        return 'Verify the file still exists and you have permission to access it.';
      case 'preview':
        return 'Try downloading the file instead, or check if it\'s a supported format.';
      case 'delete':
        return 'Ensure you have the necessary permissions to delete this file.';
      case 'rename':
        return 'Make sure the new name doesn\'t conflict with existing files.';
      default:
        return 'Please try the operation again or contact support if the problem persists.';
    }
  };

  const fallback = (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <FileX className="w-6 h-6 text-red-600" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-900">
            File Operation Failed
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{getErrorMessage(operation, fileName)}</p>
            <p className="mt-2 text-xs">{getActionSuggestion(operation)}</p>
          </div>
          <div className="mt-4 flex space-x-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="secondary"
                size="sm"
                className="flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      isolate={true}
      onError={(error) => {
        // Log file operation errors with additional context
        console.error(`File operation error [${operation}]:`, {
          fileName,
          operation,
          error: error.message,
          stack: error.stack
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default FileErrorBoundary;