import React, { useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import Button from './Button';
import { cn } from '../design-system/utils';
import { useNetworkErrorRecovery } from '../hooks/useErrorRecovery';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  disabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  showRetryCount?: boolean;
  children?: React.ReactNode;
}

const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  disabled = false,
  maxRetries = 3,
  retryDelay: _retryDelay = 1000,
  className,
  size = 'md',
  variant = 'secondary',
  showRetryCount = true,
  children
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    if (disabled || isRetrying || retryCount >= maxRetries) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const canRetry = retryCount < maxRetries;
  const buttonDisabled = disabled || isRetrying || !canRetry;

  return (
    <Button
      onClick={handleRetry}
      disabled={buttonDisabled}
      variant={variant}
      size={size}
      className={cn('flex items-center', className)}
    >
      <RefreshCw className={cn('w-4 h-4 mr-2', { 'animate-spin': isRetrying })} />
      {children || (
        <>
          {isRetrying ? 'Retrying...' : 'Retry'}
          {showRetryCount && retryCount > 0 && ` (${retryCount}/${maxRetries})`}
        </>
      )}
    </Button>
  );
};

// Network-aware retry button
interface NetworkRetryButtonProps extends Omit<RetryButtonProps, 'onRetry'> {
  onRetry: () => Promise<void> | void;
  checkConnection?: boolean;
}

export const NetworkRetryButton: React.FC<NetworkRetryButtonProps> = ({
  onRetry,
  checkConnection = true,
  ...props
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { executeWithRecovery, isRetrying, retryCount, canRetry } = useNetworkErrorRecovery();

  React.useEffect(() => {
    if (!checkConnection) return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  const handleRetry = async () => {
    await executeWithRecovery(async () => {
      await onRetry();
    }, 'network-retry');
  };

  if (checkConnection && !isOnline) {
    return (
      <Button
        disabled
        variant="secondary"
        size={props.size}
        className={cn('flex items-center', props.className)}
      >
        <WifiOff className="w-4 h-4 mr-2" />
        Offline
      </Button>
    );
  }

  return (
    <Button
      onClick={handleRetry}
      disabled={props.disabled || isRetrying || !canRetry}
      variant={props.variant}
      size={props.size}
      className={cn('flex items-center', props.className)}
    >
      {checkConnection && isOnline ? (
        <Wifi className="w-4 h-4 mr-2" />
      ) : (
        <RefreshCw className={cn('w-4 h-4 mr-2', { 'animate-spin': isRetrying })} />
      )}
      {props.children || (
        <>
          {isRetrying ? 'Retrying...' : 'Retry'}
          {props.showRetryCount && retryCount > 0 && ` (${retryCount})`}
        </>
      )}
    </Button>
  );
};

// Bulk retry button for multiple operations
interface BulkRetryButtonProps {
  operations: Array<{
    id: string;
    name: string;
    retry: () => Promise<void>;
    failed: boolean;
  }>;
  onRetryAll: () => Promise<void>;
  className?: string;
}

export const BulkRetryButton: React.FC<BulkRetryButtonProps> = ({
  operations,
  onRetryAll,
  className
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const failedOperations = operations.filter(op => op.failed);

  if (failedOperations.length === 0) return null;

  const handleRetryAll = async () => {
    setIsRetrying(true);
    try {
      await onRetryAll();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-sm text-gray-600">
        {failedOperations.length} operation{failedOperations.length !== 1 ? 's' : ''} failed
      </div>
      <Button
        onClick={handleRetryAll}
        disabled={isRetrying}
        variant="secondary"
        size="sm"
        className="flex items-center"
      >
        <RefreshCw className={cn('w-4 h-4 mr-2', { 'animate-spin': isRetrying })} />
        Retry All ({failedOperations.length})
      </Button>
    </div>
  );
};

export default RetryButton;