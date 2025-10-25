import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '../design-system/utils';
import { networkToast } from './Toast';

// Type declarations for Network Information API
declare global {
  interface Navigator {
    connection?: {
      effectiveType?: string;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
  }
}

// Helper to safely access navigator
const getNavigator = (): Navigator | undefined => {
  return typeof navigator !== 'undefined' ? navigator : undefined;
};

interface NetworkStatusProps {
  showIndicator?: boolean;
  showToasts?: boolean;
  className?: string;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showIndicator = true,
  showToasts = true,
  className
}) => {
  const [isOnline, setIsOnline] = useState(getNavigator()?.onLine ?? true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline && showToasts) {
        networkToast.online();
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      if (showToasts) {
        networkToast.offline();
      }
    };

    // Check connection type if available
    const updateConnectionInfo = () => {
      const nav = getNavigator();
      if (nav && 'connection' in nav && nav.connection) {
        const connection = nav.connection;
        setConnectionType(connection.effectiveType || 'unknown');
        
        // Show slow connection warning
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          if (showToasts) {
            networkToast.slowConnection();
          }
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const nav = getNavigator();
    if (nav && 'connection' in nav && nav.connection) {
      const connection = nav.connection;
      connection.addEventListener?.('change', updateConnectionInfo);
      updateConnectionInfo(); // Initial check
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, [showToasts, wasOffline]);

  if (!showIndicator) return null;

  const getConnectionQuality = () => {
    switch (connectionType) {
      case '4g':
        return { quality: 'excellent', color: 'text-green-500' };
      case '3g':
        return { quality: 'good', color: 'text-blue-500' };
      case '2g':
      case 'slow-2g':
        return { quality: 'poor', color: 'text-yellow-500' };
      default:
        return { quality: 'unknown', color: 'text-gray-500' };
    }
  };

  const connectionInfo = getConnectionQuality();

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {isOnline ? (
        <>
          <Wifi className={cn('w-4 h-4', connectionInfo.color)} />
          {connectionType !== 'unknown' && (
            <span className={cn('text-xs font-medium uppercase', connectionInfo.color)}>
              {connectionType}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-xs font-medium text-red-500">Offline</span>
        </>
      )}
    </div>
  );
};

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(getNavigator()?.onLine ?? true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const updateConnectionInfo = () => {
      const nav = getNavigator();
      if (nav && 'connection' in nav && nav.connection) {
        const connection = nav.connection;
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = getNavigator();
    if (nav && 'connection' in nav && nav.connection) {
      const connection = nav.connection;
      connection.addEventListener?.('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      const nav = getNavigator();
      if (nav && 'connection' in nav && nav.connection) {
        const connection = nav.connection;
        connection.removeEventListener?.('change', updateConnectionInfo);
      }
    };
  }, []);

  const isSlowConnection = connectionType === '2g' || connectionType === 'slow-2g';
  const isFastConnection = connectionType === '4g';

  return {
    isOnline,
    connectionType,
    isSlowConnection,
    isFastConnection
  };
};

// Network-aware component wrapper
interface NetworkAwareProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiresConnection?: boolean;
}

export const NetworkAware: React.FC<NetworkAwareProps> = ({
  children,
  fallback,
  requiresConnection = false
}) => {
  const { isOnline } = useNetworkStatus();

  if (requiresConnection && !isOnline) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <WifiOff className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Internet Connection
        </h3>
        <p className="text-gray-600 mb-4">
          This feature requires an internet connection. Please check your connection and try again.
        </p>
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
};

export default NetworkStatus;