import React from 'react';
import { cn, inputBase, createSizes } from '../design-system/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

const inputSizes = createSizes({
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-base',
  lg: 'px-4 py-3 text-lg',
});

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  size = 'md',
  leftIcon,
  rightIcon,
  containerClassName,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  
  const inputClasses = cn(
    inputBase,
    inputSizes[size],
    hasError
      ? 'border-error-300 text-error-900 placeholder-error-300 focus:ring-error-500 focus:border-error-500'
      : 'border-gray-300 text-gray-900 focus:ring-primary-500 focus:border-primary-500',
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    className
  );
  
  return (
    <div className={containerClassName}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={cn('text-gray-400', hasError && 'text-error-400')}>
              {leftIcon}
            </span>
          </div>
        )}
        
        <input
          id={inputId}
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className={cn('text-gray-400', hasError && 'text-error-400')}>
              {rightIcon}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-error-600" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;