import React from 'react';
import { cn } from '../design-system/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
    />
  );
};

// Specialized skeleton components
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        height={16}
        width={index === lines - 1 ? '75%' : '100%'}
      />
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 border border-gray-200 rounded-lg', className)}>
    <div className="flex items-center space-x-3 mb-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="text" height={16} width="60%" className="mb-2" />
        <Skeleton variant="text" height={12} width="40%" />
      </div>
    </div>
    <TextSkeleton lines={3} />
  </div>
);

export const FileSkeleton: React.FC<{ view?: 'list' | 'grid'; className?: string }> = ({
  view = 'list',
  className
}) => {
  if (view === 'grid') {
    return (
      <div className={cn('p-4 border border-gray-200 rounded-lg', className)}>
        <Skeleton variant="rectangular" height={120} className="mb-3 rounded" />
        <Skeleton variant="text" height={16} width="80%" className="mb-2" />
        <Skeleton variant="text" height={12} width="60%" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-3 p-3 border-b border-gray-100', className)}>
      <Skeleton variant="rectangular" width={40} height={40} className="rounded" />
      <div className="flex-1">
        <Skeleton variant="text" height={16} width="40%" className="mb-1" />
        <Skeleton variant="text" height={12} width="25%" />
      </div>
      <div className="text-right">
        <Skeleton variant="text" height={12} width={60} className="mb-1" />
        <Skeleton variant="text" height={12} width={80} />
      </div>
    </div>
  );
};

export const FileListSkeleton: React.FC<{
  count?: number;
  view?: 'list' | 'grid';
  className?: string;
}> = ({ count = 5, view = 'list', className }) => {
  if (view === 'grid') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
        {Array.from({ length: count }).map((_, index) => (
          <FileSkeleton key={index} view="grid" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <FileSkeleton key={index} view="list" />
      ))}
    </div>
  );
};

export const UploadSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 border-2 border-dashed border-gray-200 rounded-lg', className)}>
    <div className="text-center">
      <Skeleton variant="circular" width={48} height={48} className="mx-auto mb-4" />
      <Skeleton variant="text" height={20} width="60%" className="mx-auto mb-2" />
      <Skeleton variant="text" height={16} width="40%" className="mx-auto" />
    </div>
  </div>
);

export const HeaderSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center justify-between p-4 border-b border-gray-200', className)}>
    <div className="flex items-center space-x-3">
      <Skeleton variant="rectangular" width={32} height={32} className="rounded" />
      <Skeleton variant="text" height={20} width={120} />
    </div>
    <div className="flex items-center space-x-3">
      <Skeleton variant="text" height={16} width={80} />
      <Skeleton variant="circular" width={32} height={32} />
    </div>
  </div>
);

export default Skeleton;