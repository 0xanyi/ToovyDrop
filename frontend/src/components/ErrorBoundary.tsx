import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Button from './Button';
import { errorLogger } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only shows minimal error UI
  resetKeys?: Array<string | number>; // Keys that trigger reset when changed
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error using our error logger
    errorLogger.logError(error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  componentDidUpdate(prevProps: Props): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null
    });
  };

  handleReset = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      errorId: null
    }));
  };

  handleGoHome = (): void => {
    window.location.href = '/dashboard';
  };

  handleReportError = (): void => {
    const { error, errorInfo, errorId } = this.state;
    if (error && errorId) {
      // Create a detailed error report
      const report = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      // Copy to clipboard for easy reporting
      navigator.clipboard?.writeText(JSON.stringify(report, null, 2)).then(() => {
        alert('Error details copied to clipboard. Please share this with support.');
      }).catch(() => {
        // Fallback: show error details in alert
        alert(`Error ID: ${errorId}\nPlease report this to support.`);
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal error UI for isolated components
      if (this.props.isolate) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">
                This component encountered an error
              </p>
              <Button
                onClick={this.handleReset}
                variant="secondary"
                size="sm"
                className="ml-auto"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        );
      }

      const { retryCount, errorId } = this.state;
      const maxRetries = 3;
      const canRetry = retryCount < maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 text-center mb-4">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {errorId && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Error ID: <span className="font-mono">{errorId}</span>
                </p>
              </div>
            )}

            {retryCount > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 text-center">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              </div>
            )}

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Error Details:
                </p>
                <p className="text-xs text-red-600 font-mono break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                      Stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {canRetry && (
                <Button
                  onClick={this.handleReset}
                  variant="primary"
                  className="flex-1 flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              <Button
                onClick={this.handleGoHome}
                variant="secondary"
                className="flex-1 flex items-center justify-center"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            <div className="mt-4 flex justify-center">
              <Button
                onClick={this.handleReportError}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <Bug className="w-4 h-4 mr-2" />
                Report Error
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              If this problem persists, please contact support with the error ID above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
