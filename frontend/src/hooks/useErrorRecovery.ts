import { useState, useCallback, useRef } from 'react';
import { errorLogger } from '../utils/errorLogger';

interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, retryCount: number) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

interface ErrorRecoveryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

/**
 * Hook for implementing graceful error recovery with automatic retries
 */
export const useErrorRecovery = (options: ErrorRecoveryOptions = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onMaxRetriesReached
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const executeWithRecovery = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    try {
      const result = await operation();
      
      // Reset state on success
      if (state.retryCount > 0) {
        setState({
          isRetrying: false,
          retryCount: 0,
          lastError: null
        });
      }
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Log the error
      errorLogger.logError(err, { context, retryCount: state.retryCount });
      
      setState(prevState => ({
        ...prevState,
        lastError: err,
        retryCount: prevState.retryCount + 1
      }));

      // Call error callback
      onError?.(err, state.retryCount + 1);

      // Check if we should retry
      if (state.retryCount < maxRetries) {
        setState(prevState => ({ ...prevState, isRetrying: true }));
        
        return new Promise<T>((resolve, reject) => {
          retryTimeoutRef.current = setTimeout(async () => {
            try {
              const result = await executeWithRecovery(operation, context);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            } finally {
              setState(prevState => ({ ...prevState, isRetrying: false }));
            }
          }, retryDelay);
        });
      } else {
        // Max retries reached
        onMaxRetriesReached?.(err);
        throw err;
      }
    }
  }, [state.retryCount, maxRetries, retryDelay, onError, onMaxRetriesReached]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null
    });
  }, []);

  const retry = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    setState(prevState => ({
      ...prevState,
      isRetrying: true,
      retryCount: 0
    }));

    try {
      const result = await executeWithRecovery(operation);
      return result;
    } finally {
      setState(prevState => ({ ...prevState, isRetrying: false }));
    }
  }, [executeWithRecovery]);

  return {
    executeWithRecovery,
    retry,
    reset,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    lastError: state.lastError,
    canRetry: state.retryCount < maxRetries
  };
};

/**
 * Hook for handling network-specific errors with smart retry logic
 */
export const useNetworkErrorRecovery = () => {
  const isNetworkError = (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError' // Often thrown by fetch for network issues
    );
  };

  const getRetryDelay = (retryCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, retryCount), 10000);
  };

  return useErrorRecovery({
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error, retryCount) => {
      if (isNetworkError(error)) {
        console.warn(`Network error detected, retry ${retryCount}/3:`, error.message);
      }
    }
  });
};

/**
 * Hook for handling file operation errors
 */
export const useFileErrorRecovery = () => {
  return useErrorRecovery({
    maxRetries: 2,
    retryDelay: 2000,
    onError: (error, retryCount) => {
      console.warn(`File operation failed, retry ${retryCount}/2:`, error.message);
    },
    onMaxRetriesReached: (error) => {
      console.error('File operation failed after all retries:', error);
    }
  });
};