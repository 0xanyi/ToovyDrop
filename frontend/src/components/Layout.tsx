import React from 'react';
import { cn } from '../design-system/utils';
import Navigation from './Navigation';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  showBreadcrumb?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  className,
  showBreadcrumb = true 
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Link for Screen Readers */}
      <a 
        href="#main-content" 
        className="skip-link"
        tabIndex={0}
      >
        Skip to main content
      </a>
      
      {/* Navigation */}
      <Navigation />
      
      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header showBreadcrumb={showBreadcrumb} />
        
        {/* Page Content */}
        <main 
          id="main-content"
          className={cn('flex-1', className)}
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;