import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn, flex, transitions } from '../design-system/utils';
import { useSwipeGestures, useIsMobile } from '../hooks/useSwipeGestures';
import { useKeyboardNavigation, useAriaExpanded } from '../hooks/useAccessibility';
import { 
  Upload, 
  FolderOpen, 
  Menu, 
  X,
  Home,
  Users,
  FileText,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/dashboard',
  },
  {
    id: 'upload',
    label: 'Upload Files',
    icon: Upload,
    path: '/dashboard?tab=upload',
  },
  {
    id: 'files',
    label: 'My Files',
    icon: FolderOpen,
    path: '/dashboard?tab=files',
  },
  {
    id: 'admin-overview',
    label: 'Admin Overview',
    icon: BarChart3,
    path: '/admin',
    adminOnly: true,
  },
  {
    id: 'admin-users',
    label: 'Users',
    icon: Users,
    path: '/admin/users',
    adminOnly: true,
  },
  {
    id: 'admin-channels',
    label: 'Channels',
    icon: FolderOpen,
    path: '/admin/channels',
    adminOnly: true,
  },
  {
    id: 'admin-files',
    label: 'File Management',
    icon: FileText,
    path: '/admin/files',
    adminOnly: true,
  },
  {
    id: 'admin-analytics',
    label: 'Analytics',
    icon: Activity,
    path: '/admin/analytics',
    adminOnly: true,
  },
  {
    id: 'admin-settings',
    label: 'System Settings',
    icon: Settings,
    path: '/admin/settings',
    adminOnly: true,
  },
];

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  
  // ARIA state management
  const mobileMenuAria = useAriaExpanded(isMobileMenuOpen);
  const sidebarAria = useAriaExpanded(!isSidebarCollapsed);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Update ARIA states when menu states change
  useEffect(() => {
    if (isMobileMenuOpen !== mobileMenuAria.isExpanded) {
      if (isMobileMenuOpen) {
        mobileMenuAria.expand();
      } else {
        mobileMenuAria.collapse();
      }
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const expanded = !isSidebarCollapsed;
    if (expanded !== sidebarAria.isExpanded) {
      if (expanded) {
        sidebarAria.expand();
      } else {
        sidebarAria.collapse();
      }
    }
  }, [isSidebarCollapsed]);

  // Swipe gesture support for mobile menu
  const { swipeHandlers } = useSwipeGestures({
    onSwipeRight: () => {
      if (isMobile && !isMobileMenuOpen) {
        setIsMobileMenuOpen(true);
      }
    },
    onSwipeLeft: () => {
      if (isMobile && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    },
    threshold: 100,
    preventScroll: true
  });

  const isActiveItem = (item: NavigationItem) => {
    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard' && !location.search;
    }
    if (item.path.includes('?tab=')) {
      const [path, query] = item.path.split('?');
      return location.pathname === path && location.search.includes(query);
    }
    // For admin routes, match exact path
    if (item.path.startsWith('/admin')) {
      return location.pathname === item.path;
    }
    return location.pathname === item.path;
  };

  const handleNavigation = (item: NavigationItem) => {
    navigate(item.path);
    setIsMobileMenuOpen(false);
  };

  const filteredItems = navigationItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin())
  );

  // Keyboard navigation for navigation items
  const { containerRef: navContainerRef, focusedIndex } = useKeyboardNavigation(
    filteredItems,
    undefined,
    (index) => {
      const item = filteredItems[index];
      if (item) {
        handleNavigation(item);
      }
    }
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden" {...swipeHandlers}>
        {/* Mobile Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 safe-top">
          <div className={cn(flex.between)}>
            <div className={cn(flex.start, 'space-x-3')}>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  'touch-target-comfortable rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                  'flex items-center justify-center',
                  transitions.default
                )}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuAria.isExpanded}
                aria-controls="mobile-navigation-menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-gray-900">ToovyDrop</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div 
              id="mobile-navigation-menu"
              className={cn(
                'fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl',
                'transform transition-transform duration-300 ease-in-out',
                'safe-top safe-bottom mobile-scroll'
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-nav-title"
              {...swipeHandlers}
            >
              <div className="p-4 border-b border-gray-200">
                <div className={cn(flex.between)}>
                  <h2 id="mobile-nav-title" className="text-lg font-semibold text-gray-900">Navigation</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="touch-target-comfortable rounded-md text-gray-400 hover:text-gray-600 flex items-center justify-center"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <nav 
                className="p-4 space-y-2 overflow-y-auto"
                role="navigation"
                aria-label="Main navigation"
                ref={navContainerRef}
              >
                {filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = isActiveItem(item);
                  const isFocused = focusedIndex === index;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                        'touch-target-comfortable',
                        isActive
                          ? 'bg-primary-100 text-primary-700 border-r-4 border-primary-600'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200',
                        isFocused && 'ring-2 ring-primary-500 ring-offset-2'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      tabIndex={isFocused ? 0 : -1}
                    >
                      <Icon className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              
              {/* User info in mobile menu */}
              {user && (
                <div className="p-4 border-t border-gray-200 mt-auto">
                  <div className="text-xs text-gray-500 mb-1">Signed in as</div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.email}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {user.role === 'ADMIN' ? 'Administrator' : 'Channel User'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className={cn('hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50', className)}>
        <div 
          className={cn(
            'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
            isSidebarCollapsed ? 'w-16' : 'w-64'
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-900">ToovyDrop</h1>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn(
                'p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                transitions.default,
                isSidebarCollapsed && 'mx-auto'
              )}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={sidebarAria.isExpanded}
              aria-controls="desktop-navigation-menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav 
            id="desktop-navigation-menu"
            className="flex-1 p-4 space-y-2"
            role="navigation"
            aria-label="Main navigation"
          >
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveItem(item);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                    isSidebarCollapsed && 'justify-center'
                  )}
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                  {isSidebarCollapsed && <span className="sr-only">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User Info Section */}
          {!isSidebarCollapsed && user && (
            <div className="p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Signed in as</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.email}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {user.role === 'ADMIN' ? 'Administrator' : 'Channel User'}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navigation;