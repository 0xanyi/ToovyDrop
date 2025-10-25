/**
 * Error logging and monitoring utilities
 */

export interface ErrorContext {
  userId?: string;
  userAgent?: string;
  url?: string;
  timestamp: string;
  sessionId?: string;
  buildVersion?: string;
}

export interface ErrorReport {
  error: Error;
  errorInfo?: any;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ui' | 'api' | 'auth' | 'file' | 'network' | 'unknown';
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getErrorContext(): ErrorContext {
    return {
      userId: this.getUserId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      buildVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
    };
  }

  private getUserId(): string | undefined {
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  private categorizeError(error: Error): ErrorReport['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'auth';
    }
    if (message.includes('file') || message.includes('upload') || message.includes('download')) {
      return 'file';
    }
    if (stack.includes('api') || message.includes('api')) {
      return 'api';
    }
    if (stack.includes('component') || message.includes('render')) {
      return 'ui';
    }
    return 'unknown';
  }

  private getSeverity(error: Error, category: ErrorReport['category']): ErrorReport['severity'] {
    // Critical errors that break core functionality
    if (category === 'auth' || error.message.includes('ChunkLoadError')) {
      return 'critical';
    }
    
    // High severity for file operations and API failures
    if (category === 'file' || category === 'api') {
      return 'high';
    }
    
    // Medium for UI errors
    if (category === 'ui') {
      return 'medium';
    }
    
    // Low for network issues (often temporary)
    return 'low';
  }

  public logError(error: Error, errorInfo?: any): void {
    const context = this.getErrorContext();
    const category = this.categorizeError(error);
    const severity = this.getSeverity(error, category);

    const errorReport: ErrorReport = {
      error,
      errorInfo,
      context,
      severity,
      category,
    };

    // Always log to console in development
    if (import.meta.env.DEV) {
      console.group(`🚨 Error [${severity.toUpperCase()}] - ${category}`);
      console.error('Error:', error);
      console.error('Context:', context);
      if (errorInfo) {
        console.error('Error Info:', errorInfo);
      }
      console.groupEnd();
    }

    // Send to monitoring service in production
    if (import.meta.env.PROD) {
      this.sendToMonitoring(errorReport);
    }

    // Store locally for debugging
    this.storeErrorLocally(errorReport);
  }

  private async sendToMonitoring(errorReport: ErrorReport): Promise<void> {
    try {
      // In a real application, you would send to services like:
      // - Sentry
      // - LogRocket
      // - Bugsnag
      // - Custom error tracking endpoint
      
      const payload = {
        message: errorReport.error.message,
        stack: errorReport.error.stack,
        context: errorReport.context,
        severity: errorReport.severity,
        category: errorReport.category,
        errorInfo: errorReport.errorInfo,
      };

      // Example: Send to custom error tracking endpoint
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail if error reporting fails
        // to avoid infinite error loops
      });
    } catch {
      // Silently fail to avoid infinite error loops
    }
  }

  private storeErrorLocally(errorReport: ErrorReport): void {
    try {
      const errors = this.getStoredErrors();
      errors.push({
        ...errorReport,
        error: {
          message: errorReport.error.message,
          stack: errorReport.error.stack,
          name: errorReport.error.name,
        },
      });

      // Keep only last 50 errors
      const recentErrors = errors.slice(-50);
      
      localStorage.setItem('app_errors', JSON.stringify(recentErrors));
    } catch {
      // Ignore storage errors
    }
  }

  public getStoredErrors(): any[] {
    try {
      const stored = localStorage.getItem('app_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public clearStoredErrors(): void {
    try {
      localStorage.removeItem('app_errors');
    } catch {
      // Ignore storage errors
    }
  }
}

export const errorLogger = ErrorLogger.getInstance();

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.logError(
    new Error(`Unhandled Promise Rejection: ${event.reason}`),
    { type: 'unhandledrejection', reason: event.reason }
  );
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  errorLogger.logError(
    event.error || new Error(event.message),
    { 
      type: 'uncaught', 
      filename: event.filename, 
      lineno: event.lineno, 
      colno: event.colno 
    }
  );
});