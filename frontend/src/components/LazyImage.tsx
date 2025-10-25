import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  const defaultPlaceholder = (
    <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
      <ImageIcon className="w-8 h-8 text-gray-400" />
    </div>
  );

  const errorPlaceholder = (
    <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
      <div className="text-center text-gray-500">
        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-xs">Failed to load</p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!isInView && (placeholder || defaultPlaceholder)}
      
      {isInView && !isError && (
        <>
          {!isLoaded && (placeholder || defaultPlaceholder)}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            decoding="async"
          />
        </>
      )}
      
      {isError && errorPlaceholder}
    </div>
  );
};

export default LazyImage;