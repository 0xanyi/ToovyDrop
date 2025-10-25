import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

import { cn, flex, transitions } from '../design-system/utils';
import { Channel } from '../types';
import Breadcrumb from './Breadcrumb';
import { 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Check,
  Hash
} from 'lucide-react';

interface HeaderProps {
  className?: string;
  showBreadcrumb?: boolean;
}

const Header: React.FC<HeaderProps> = ({ className, showBreadcrumb = true }) => {
  const { user, logout } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);

  // Set default channel on mount
  useEffect(() => {
    if (user?.channels && user.channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(user.channels[0].id);
    }
  }, [user?.channels, selectedChannelId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      const target = event.target;
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setIsProfileDropdownOpen(false);
      }
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(target)) {
        setIsChannelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsProfileDropdownOpen(false);
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    setIsChannelDropdownOpen(false);
    // TODO: Update context or trigger channel change event
  };

  const generateUserAvatar = (email: string) => {
    const initials = email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
    
    return initials;
  };

  const getSelectedChannel = (): Channel | undefined => {
    return user?.channels?.find(channel => channel.id === selectedChannelId);
  };

  const selectedChannel = getSelectedChannel();
  const userChannels = user?.channels || [];
  const hasMultipleChannels = userChannels.length > 1;

  return (
    <header className={cn('bg-white shadow-sm border-b border-gray-200', className)}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          {/* Main Header Content */}
          <div className={cn(flex.between, 'mb-3')}>
            {/* Left side - Title and Channel Info */}
            <div className={cn(flex.start, 'space-x-4')}>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ToovyDrop</h1>
                <p className="text-sm text-gray-600">Secure File Management Platform</p>
              </div>

              {/* Channel Information */}
              {selectedChannel && (
                <div className="flex items-center space-x-2 pl-4 border-l border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedChannel.name}
                    </span>
                    
                    {/* Channel Selector Dropdown */}
                    {hasMultipleChannels && (
                      <div className="relative" ref={channelDropdownRef}>
                        <button
                          onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                          className={cn(
                            'flex items-center space-x-1 px-2 py-1 rounded-md text-sm',
                            'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                            transitions.default
                          )}
                          aria-label="Select channel"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* Channel Dropdown Menu */}
                        {isChannelDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                            <div className="py-1">
                              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                                Select Channel
                              </div>
                              {userChannels.map((channel) => (
                                <button
                                  key={channel.id}
                                  onClick={() => handleChannelSelect(channel.id)}
                                  className={cn(
                                    'w-full flex items-center justify-between px-3 py-2 text-sm',
                                    'hover:bg-gray-50 transition-colors',
                                    selectedChannelId === channel.id
                                      ? 'text-primary-600 bg-primary-50'
                                      : 'text-gray-700'
                                  )}
                                >
                                  <div className="flex items-center space-x-2">
                                    <Hash className="w-4 h-4 text-gray-400" />
                                    <div className="text-left">
                                      <div className="font-medium">{channel.name}</div>
                                      {channel.description && (
                                        <div className="text-xs text-gray-500 truncate">
                                          {channel.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {selectedChannelId === channel.id && (
                                    <Check className="w-4 h-4 text-primary-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right side - User Info and Actions */}
            <div className={cn(flex.start, 'space-x-4')}>
              {/* User Profile Section */}
              {user && (
                <div className="flex items-center space-x-3">
                  {/* User Avatar and Info */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        'bg-primary-100 text-primary-700'
                      )}>
                        {generateUserAvatar(user.email)}
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-sm font-medium text-gray-900">
                          {user.email.split('@')[0]}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.role === 'ADMIN' ? 'Administrator' : 'Channel User'}
                        </div>
                      </div>
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileDropdownRef}>
                      <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className={cn(
                          'flex items-center space-x-1 px-2 py-1 rounded-md',
                          'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                          transitions.default
                        )}
                        aria-label="User menu"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Profile Dropdown Menu */}
                      {isProfileDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                          <div className="py-1">
                            {/* User Info Header */}
                            <div className="px-4 py-3 border-b border-gray-100">
                              <div className="text-sm font-medium text-gray-900">
                                {user.email}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {user.role === 'ADMIN' ? 'Administrator' : 'Channel User'}
                              </div>
                            </div>

                            {/* Menu Items */}
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setIsProfileDropdownOpen(false);
                                  // TODO: Navigate to profile settings
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <User className="w-4 h-4 mr-3 text-gray-400" />
                                Profile Settings
                              </button>

                              <button
                                onClick={() => {
                                  setIsProfileDropdownOpen(false);
                                  // TODO: Navigate to general settings
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Settings className="w-4 h-4 mr-3 text-gray-400" />
                                Settings
                              </button>



                              <div className="border-t border-gray-100 my-1" />

                              <button
                                onClick={handleLogout}
                                className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                              >
                                <LogOut className="w-4 h-4 mr-3 text-red-400" />
                                Sign Out
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {showBreadcrumb && (
            <div className="pt-2 border-t border-gray-100">
              <Breadcrumb />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;