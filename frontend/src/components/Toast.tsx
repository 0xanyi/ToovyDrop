import React from 'react';
import { toast as hotToast, Toaster, ToastOptions } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../design-system/utils';

// Custom toast component
interface CustomToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onDismiss?: () => void;
}

const CustomToast: React.FC<CustomToastProps> = ({ message, type, onDismiss }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  };

  return (
    <div className={cn(
      'flex items-center p-4 border rounded-lg shadow-lg max-w-md',
      bgColors[type]
    )}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className={cn('ml-3 flex-1 text-sm font-medium', textColors[type])}>
        {message}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            'ml-3 flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10',
            textColors[type]
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Enhanced toast functions
const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'top-right',
};

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="success"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      { ...defaultOptions, ...options }
    );
  },

  error: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="error"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      { ...defaultOptions, duration: 6000, ...options }
    );
  },

  warning: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="warning"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      { ...defaultOptions, duration: 5000, ...options }
    );
  },

  info: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="info"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      { ...defaultOptions, ...options }
    );
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: ToastOptions
  ) => {
    return hotToast.promise(
      promise,
      {
        loading: messages.loading,
        success: (data) => {
          const message = typeof messages.success === 'function' 
            ? messages.success(data) 
            : messages.success;
          return (
            <CustomToast
              message={message}
              type="success"
              onDismiss={() => hotToast.dismiss()}
            />
          );
        },
        error: (error) => {
          const message = typeof messages.error === 'function' 
            ? messages.error(error) 
            : messages.error;
          return (
            <CustomToast
              message={message}
              type="error"
              onDismiss={() => hotToast.dismiss()}
            />
          );
        }
      },
      { ...defaultOptions, ...options }
    );
  },

  dismiss: hotToast.dismiss,
  remove: hotToast.remove
};

// File operation specific toasts
export const fileToast = {
  uploadStart: (fileName: string) => {
    return toast.info(`Uploading ${fileName}...`, { duration: Infinity });
  },

  uploadSuccess: (fileName: string) => {
    return toast.success(`${fileName} uploaded successfully`);
  },

  uploadError: (fileName: string, error?: string) => {
    return toast.error(`Failed to upload ${fileName}${error ? `: ${error}` : ''}`);
  },

  downloadStart: (fileName: string) => {
    return toast.info(`Downloading ${fileName}...`);
  },

  downloadSuccess: (fileName: string) => {
    return toast.success(`${fileName} downloaded successfully`);
  },

  downloadError: (fileName: string, error?: string) => {
    return toast.error(`Failed to download ${fileName}${error ? `: ${error}` : ''}`);
  },

  deleteSuccess: (fileName: string) => {
    return toast.success(`${fileName} deleted successfully`);
  },

  deleteError: (fileName: string, error?: string) => {
    return toast.error(`Failed to delete ${fileName}${error ? `: ${error}` : ''}`);
  },

  renameSuccess: (oldName: string, newName: string) => {
    return toast.success(`Renamed ${oldName} to ${newName}`);
  },

  renameError: (fileName: string, error?: string) => {
    return toast.error(`Failed to rename ${fileName}${error ? `: ${error}` : ''}`);
  }
};

// Network operation toasts
export const networkToast = {
  offline: () => {
    return toast.warning('You are currently offline. Some features may not work.');
  },

  online: () => {
    return toast.success('Connection restored');
  },

  slowConnection: () => {
    return toast.warning('Slow connection detected. Operations may take longer.');
  },

  connectionError: () => {
    return toast.error('Connection error. Please check your internet connection.');
  },

  retrying: (attempt: number, maxAttempts: number) => {
    return toast.info(`Retrying... (${attempt}/${maxAttempts})`);
  }
};

// Custom Toaster component with better positioning
export const AppToaster: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerClassName="!top-4 !right-4"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          margin: 0
        }
      }}
    />
  );
};

export default toast;