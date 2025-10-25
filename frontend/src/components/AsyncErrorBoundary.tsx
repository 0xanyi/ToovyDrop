import React, { ReactNode, useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: Array<string | number>;
}

interface AsyncErrorState {
  error: Error | null;
  hasError: boolean;
}

/**
 * Error boundary specifically for handling async errors in React components
 * This works with React's error boundaries and also catches async errors
 */
const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  resetKeys = []
}) => {
  const [asyncError, setAsyncError] = useState<AsyncErrorState>({
    error: null,
    hasError: false
  });

  // Reset async error when resetKeys change
  useEffect(() => {
    if (asyncError.hasError) {
      setAsyncError({ error: null, hasError: false });
    }
  }, resetKeys);

  // Function to handle async errors
  const handleAsyncError = (error: Error) => {
    setAsyncError({ error, hasError: true });
    onError?.(error);
  };

  // Provide error handler to children via context
  const errorHandler = React.useMemo(
    () => ({ handleAsyncError }),
    [handleAsyncError]
  );

  const resetAsyncError = () => {
    setAsyncError({ error: null, hasError: false });
  };

  // If we have an async error, show error UI
  if (asyncError.hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-900">
              Operation Failed
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {asyncError.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
        
        <Button
          onClick={resetAsyncError}
          variant="secondary"
          size="sm"
          className="flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, _errorInfo) => {
        onError?.(error);
      }}
      resetKeys={resetKeys}
    >
      <AsyncErrorContext.Provider value={errorHandler}>
        {children}
      </AsyncErrorContext.Provider>
    </ErrorBoundary>
  );
};

// Context for providing async error handler to child components
const AsyncErrorContext = React.createContext<{
  handleAsyncError: (error: Error) => void;
} | null>(null);

// Hook for using async error handler in components
export const useAsyncError = () => {
  const context = React.useContext(AsyncErrorContext);
  
  if (!context) {
    // Fallback to throwing error if no context (will be caught by error boundary)
    return {
      handleAsyncError: (error: Error) => {
        throw error;
      }
    };
  }
  
  return context;
};

export default AsyncErrorBoundary;