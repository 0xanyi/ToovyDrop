import React, { ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';
import Skeleton, { FileListSkeleton, CardSkeleton } from './SkeletonLoader';
import { cn } from '../design-system/utils';

interface LoadingWrapperProps {
  isLoading: boolean;
  error?: Error | null;
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  onRetry?: () => void;
  retryText?: string;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  className?: string;
  skeletonType?: 'default' | 'fileList' | 'card' | 'custom';
  skeletonCount?: number;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
  onRetry,
  retryText = 'Try Again',
  emptyState,
  isEmpty = false,
  className,
  skeletonType = 'default',
  skeletonCount = 5
}) => {
  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <div className={className}>{loadingComponent}</div>;
    }

    // Default skeleton loaders based on type
    const getSkeletonComponent = () => {
      switch (skeletonType) {
        case 'fileList':
          return <FileListSkeleton count={skeletonCount} />;
        case 'card':
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: skeletonCount }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          );
        case 'custom':
          return loadingComponent || (
            <div className="space-y-4">
              {Array.from({ length: skeletonCount }).map((_, index) => (
                <Skeleton key={index} height={20} />
              ))}
            </div>
          );
        default:
          return (
            <div className="space-y-4">
              {Array.from({ length: skeletonCount }).map((_, index) => (
                <Skeleton key={index} height={20} />
              ))}
            </div>
          );
      }
    };

    return (
      <div className={cn('animate-pulse', className)}>
        {getSkeletonComponent()}
      </div>
    );
  }

  // Show error state
  if (error) {
    if (errorComponent) {
      return <div className={className}>{errorComponent}</div>;
    }

    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Something went wrong
        </h3>
        
        <p className="text-gray-600 mb-6 max-w-md">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>

        {onRetry && (
          <Button
            onClick={onRetry}
            variant="primary"
            className="flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryText}
          </Button>
        )}
      </div>
    );
  }

  // Show empty state
  if (isEmpty && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  // Show content
  return <div className={className}>{children}</div>;
};

// Specialized loading wrappers
export const FileListLoadingWrapper: React.FC<Omit<LoadingWrapperProps, 'skeletonType'> & {
  view?: 'list' | 'grid';
}> = ({ view = 'list', ...props }) => (
  <LoadingWrapper
    {...props}
    skeletonType="fileList"
    loadingComponent={<FileListSkeleton count={props.skeletonCount} view={view} />}
  />
);

export const CardGridLoadingWrapper: React.FC<Omit<LoadingWrapperProps, 'skeletonType'>> = (props) => (
  <LoadingWrapper {...props} skeletonType="card" />
);

// Inline loading component for smaller elements
interface InlineLoadingProps {
  isLoading: boolean;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  size = 'md',
  text,
  className
}) => {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}) => (
  <Button
    {...props}
    disabled={disabled || isLoading}
    className={cn('flex items-center justify-center', className)}
  >
    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
    {isLoading && loadingText ? loadingText : children}
  </Button>
);

export default LoadingWrapper;