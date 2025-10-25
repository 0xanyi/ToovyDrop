import React, { useEffect, useRef, useState } from 'react';

// Hook for managing focus trap in modals
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus the first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      // Restore focus to the previously focused element
      if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus();
      }
    };
  }, [isActive]);

  return containerRef;
};

// Hook for keyboard navigation in lists
export const useKeyboardNavigation = (
  items: unknown[],
  _onSelect?: (index: number) => void,
  onActivate?: (index: number) => void
) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLElement>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          onActivate?.(focusedIndex);
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [items.length, focusedIndex, onActivate]);

  return {
    containerRef,
    focusedIndex,
    setFocusedIndex
  };
};

// Hook for announcing screen reader messages
export const useScreenReader = () => {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message: string, _priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(''); // Clear first to ensure re-announcement
    setTimeout(() => setAnnouncement(message), 100);
  };

  const AnnouncementRegion = React.memo(() => {
    return React.createElement('div', {
      'aria-live': 'polite',
      'aria-atomic': 'true',
      className: 'sr-only'
    }, announcement);
  });

  return { announce, AnnouncementRegion };
};

// Hook for managing reduced motion preferences
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: { matches: boolean }) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Hook for high contrast mode detection
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: { matches: boolean }) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
};

// Utility function to generate accessible IDs
export const generateId = (prefix: string = 'element') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

// Utility function to check color contrast ratio
export const getContrastRatio = (_color1: string, _color2: string): number => {
  // This is a simplified version - in production, you'd use a proper color contrast library
  // For now, we'll return a placeholder value
  return 4.5; // WCAG AA compliant ratio
};

// Hook for managing ARIA expanded state
export const useAriaExpanded = (initialState: boolean = false) => {
  const [isExpanded, setIsExpanded] = useState(initialState);

  const toggle = () => setIsExpanded(prev => !prev);
  const expand = () => setIsExpanded(true);
  const collapse = () => setIsExpanded(false);

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    ariaExpanded: isExpanded.toString()
  };
};