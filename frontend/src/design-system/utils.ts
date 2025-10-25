import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Handles conditional classes and resolves conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Focus ring utility for consistent focus styles
 */
export const focusRing = 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';

/**
 * Common transition classes
 */
export const transitions = {
  default: 'transition-colors duration-normal ease-ease',
  all: 'transition-all duration-normal ease-ease',
  fast: 'transition-colors duration-fast ease-ease',
  slow: 'transition-colors duration-slow ease-ease',
} as const;

/**
 * Common button base styles
 */
export const buttonBase = cn(
  'inline-flex items-center justify-center font-medium rounded-md',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  transitions.default,
  focusRing
);

/**
 * Common input base styles
 */
export const inputBase = cn(
  'w-full border rounded-md shadow-sm placeholder-gray-400',
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
  transitions.default,
  focusRing
);

/**
 * Card base styles
 */
export const cardBase = 'bg-white overflow-hidden shadow rounded-lg';

/**
 * Generate responsive classes for different screen sizes
 */
export function responsive(classes: {
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}) {
  return cn(
    classes.base,
    classes.sm && `sm:${classes.sm}`,
    classes.md && `md:${classes.md}`,
    classes.lg && `lg:${classes.lg}`,
    classes.xl && `xl:${classes.xl}`,
    classes['2xl'] && `2xl:${classes['2xl']}`
  );
}

/**
 * Generate variant classes for components
 */
export function createVariants<T extends Record<string, string>>(variants: T) {
  return variants;
}

/**
 * Generate size classes for components
 */
export function createSizes<T extends Record<string, string>>(sizes: T) {
  return sizes;
}

/**
 * Utility to handle loading states
 */
export function loadingState(isLoading: boolean, loadingClass = 'opacity-50 cursor-wait') {
  return isLoading ? loadingClass : '';
}

/**
 * Utility for truncating text
 */
export const textTruncate = {
  truncate: 'truncate',
  ellipsis: 'text-ellipsis overflow-hidden',
  clip: 'text-clip overflow-hidden',
} as const;

/**
 * Common flex utilities
 */
export const flex = {
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between',
  start: 'flex items-center justify-start',
  end: 'flex items-center justify-end',
  col: 'flex flex-col',
  colCenter: 'flex flex-col items-center justify-center',
} as const;

/**
 * Common grid utilities
 */
export const grid = {
  cols1: 'grid grid-cols-1',
  cols2: 'grid grid-cols-2',
  cols3: 'grid grid-cols-3',
  cols4: 'grid grid-cols-4',
  responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
} as const;