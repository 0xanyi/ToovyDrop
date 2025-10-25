import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { cn, flex } from '../design-system/utils';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const location = useLocation();

  // Generate breadcrumb items from current location if not provided
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    if (items) return items;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');

    const breadcrumbItems: BreadcrumbItem[] = [];

    // Handle dashboard with tabs
    if (pathSegments[0] === 'dashboard') {
      if (tab === 'upload') {
        breadcrumbItems.push({ label: 'Upload Files', isActive: true });
      } else if (tab === 'files') {
        breadcrumbItems.push({ label: 'My Files', isActive: true });
      } else {
        // Default dashboard view - redirect to upload
        breadcrumbItems.push({ label: 'Upload Files', isActive: true });
      }
    }
    // Handle admin routes
    else if (pathSegments[0] === 'admin') {
      if (pathSegments.length > 1) {
        const adminSection = pathSegments[1];
        const sectionLabels: Record<string, string> = {
          users: 'User Management',
          channels: 'Channel Management',
          files: 'File Management',
          settings: 'System Settings',
          analytics: 'Analytics Dashboard',
        };
        
        breadcrumbItems.push({ 
          label: sectionLabels[adminSection] || adminSection,
          isActive: true 
        });
      } else {
        breadcrumbItems.push({ label: 'Admin Overview', isActive: true });
      }
    }

    return breadcrumbItems;
  };

  const breadcrumbItems = getBreadcrumbItems();

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)} aria-label="Breadcrumb">
      <ol className={cn(flex.start, 'space-x-1')}>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isActive = item.isActive || isLast;

          return (
            <li key={index} className={cn(flex.start, 'space-x-1')}>
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              


              {item.path && !isActive ? (
                <Link
                  to={item.path}
                  className="text-gray-500 hover:text-gray-700 transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <span 
                  className={cn(
                    'font-medium',
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;