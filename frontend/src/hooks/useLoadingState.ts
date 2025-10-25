import { useState, useCallback, useRef } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  data: any;
}

interface LoadingStateOptions {
  initialLoading?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

/**
 * Hook for managing loading states with error handling
 */
export const useLoadingState = (options: LoadingStateOptions = {}) => {
  const {
    initialLoading = false,
    onSuccess,
    onError,
    onFinally
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    data: null
  });

  const execute = useCallback(async <T>(
    asyncFunction: () => Promise<T>
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await asyncFunction();
      setState(prev => ({ ...prev, data: result, error: null }));
      onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: err, data: null }));
      onError?.(err);
      return null;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      onFinally?.();
    }
  }, [onSuccess, onError, onFinally]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setData = useCallback((data: any) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setLoading,
    setError,
    setData
  };
};

/**
 * Hook for managing multiple loading states
 */
export const useMultipleLoadingStates = () => {
  const [states, setStates] = useState<Record<string, LoadingState>>({});

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || { isLoading: false, error: null, data: null };
  }, [states]);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: loading }
    }));
  }, []);

  const setError = useCallback((key: string, error: Error | null) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], error, isLoading: false }
    }));
  }, []);

  const setData = useCallback((key: string, data: any) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], data, error: null, isLoading: false }
    }));
  }, []);

  const execute = useCallback(async <T>(
    key: string,
    asyncFunction: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(key, true);

    try {
      const result = await asyncFunction();
      setData(key, result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(key, err);
      return null;
    }
  }, [setLoading, setData, setError]);

  const reset = useCallback((key?: string) => {
    if (key) {
      setStates(prev => {
        const newStates = { ...prev };
        delete newStates[key];
        return newStates;
      });
    } else {
      setStates({});
    }
  }, []);

  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  const hasAnyError = Object.values(states).some(state => state.error);

  return {
    states,
    getState,
    setLoading,
    setError,
    setData,
    execute,
    reset,
    isAnyLoading,
    hasAnyError
  };
};

/**
 * Hook for managing async operations with automatic loading states
 */
export const useAsyncOperation = <T = any>(
  operation: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    data: null
  });

  const operationRef = useRef(operation);
  operationRef.current = operation;

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await operationRef.current();
      setState(prev => ({ ...prev, data: result, error: null }));
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: err }));
      return null;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, dependencies);

  const retry = useCallback(() => execute(), [execute]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null
    });
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset
  };
};

/**
 * Hook for managing file upload progress
 */
export const useUploadProgress = () => {
  const [uploads, setUploads] = useState<Record<string, {
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
    fileName: string;
  }>>({});

  const startUpload = useCallback((fileId: string, fileName: string) => {
    setUploads(prev => ({
      ...prev,
      [fileId]: {
        progress: 0,
        status: 'uploading',
        fileName
      }
    }));
  }, []);

  const updateProgress = useCallback((fileId: string, progress: number) => {
    setUploads(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        progress: Math.max(0, Math.min(100, progress))
      }
    }));
  }, []);

  const completeUpload = useCallback((fileId: string) => {
    setUploads(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        progress: 100,
        status: 'completed'
      }
    }));
  }, []);

  const failUpload = useCallback((fileId: string, error: string) => {
    setUploads(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        status: 'error',
        error
      }
    }));
  }, []);

  const removeUpload = useCallback((fileId: string) => {
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[fileId];
      return newUploads;
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads(prev => {
      const newUploads: typeof prev = {};
      Object.entries(prev).forEach(([id, upload]) => {
        if (upload.status !== 'completed') {
          newUploads[id] = upload;
        }
      });
      return newUploads;
    });
  }, []);

  const totalProgress = Object.values(uploads).length > 0
    ? Object.values(uploads).reduce((sum, upload) => sum + upload.progress, 0) / Object.values(uploads).length
    : 0;

  const isAnyUploading = Object.values(uploads).some(upload => upload.status === 'uploading');
  const hasErrors = Object.values(uploads).some(upload => upload.status === 'error');
  const allCompleted = Object.values(uploads).length > 0 && Object.values(uploads).every(upload => upload.status === 'completed');

  return {
    uploads,
    startUpload,
    updateProgress,
    completeUpload,
    failUpload,
    removeUpload,
    clearCompleted,
    totalProgress,
    isAnyUploading,
    hasErrors,
    allCompleted
  };
};