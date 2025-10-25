import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../design-system/utils';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  status?: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  status = 'loading',
  size = 'md',
  showPercentage = true,
  label,
  className
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const statusColors = {
    idle: 'bg-gray-200',
    loading: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500'
  };

  const statusIcons = {
    idle: null,
    loading: <Loader2 className="w-4 h-4 animate-spin" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
    warning: <AlertCircle className="w-4 h-4 text-yellow-500" />
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <div className="flex items-center space-x-2">
              {statusIcons[status]}
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            statusColors[status]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Circular progress indicator
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  status?: 'loading' | 'success' | 'error' | 'warning';
  showPercentage?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 48,
  strokeWidth = 4,
  status = 'loading',
  showPercentage = true,
  className
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const statusColors = {
    loading: 'stroke-blue-500',
    success: 'stroke-green-500',
    error: 'stroke-red-500',
    warning: 'stroke-yellow-500'
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn('transition-all duration-300 ease-out', statusColors[status])}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-700">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Multi-step progress indicator
interface StepProgressProps {
  steps: Array<{
    label: string;
    status: 'pending' | 'current' | 'completed' | 'error';
  }>;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, className }) => {
  return (
    <div className={cn('flex items-center space-x-4', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                {
                  'bg-gray-200 text-gray-500': step.status === 'pending',
                  'bg-blue-500 text-white': step.status === 'current',
                  'bg-green-500 text-white': step.status === 'completed',
                  'bg-red-500 text-white': step.status === 'error'
                }
              )}
            >
              {step.status === 'completed' ? (
                <CheckCircle className="w-4 h-4" />
              ) : step.status === 'error' ? (
                <XCircle className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                {
                  'text-gray-500': step.status === 'pending',
                  'text-blue-600': step.status === 'current',
                  'text-green-600': step.status === 'completed',
                  'text-red-600': step.status === 'error'
                }
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5',
                {
                  'bg-gray-200': steps[index + 1].status === 'pending',
                  'bg-green-500': steps[index + 1].status === 'completed' || steps[index + 1].status === 'current'
                }
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProgressIndicator;