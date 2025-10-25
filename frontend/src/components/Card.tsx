import React from 'react';
import { cn, cardBase } from '../design-system/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  hover?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  border?: boolean;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  border?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

const shadowClasses = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
} as const;

const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({
  children,
  className,
  padding = 'none',
  shadow = 'md',
  border = false,
  hover = false,
}) => {
  return (
    <div
      className={cn(
        cardBase,
        shadowClasses[shadow],
        paddingClasses[padding],
        border && 'border border-gray-200',
        hover && 'hover:shadow-lg transition-shadow duration-normal',
        className
      )}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className,
  border = true,
}) => {
  return (
    <div
      className={cn(
        'px-6 py-4',
        border && 'border-b border-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
};

const CardBody: React.FC<CardBodyProps> = ({
  children,
  className,
  padding = 'md',
}) => {
  return (
    <div
      className={cn(
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  border = true,
}) => {
  return (
    <div
      className={cn(
        'px-6 py-4',
        border && 'border-t border-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;