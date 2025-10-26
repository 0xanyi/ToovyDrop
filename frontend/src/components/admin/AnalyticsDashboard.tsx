import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ApiResponse } from '../../types';
import Button from '../Button';
import {
  Users,
  FolderOpen,
  HardDrive,
  Clock,
  Activity,
  FileText,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalChannels: number;
    totalFiles: number;
    totalStorage: number;
    activeUsers: number;
    activeChannels: number;
    uploadsToday: number;
    uploadsThisWeek: number;
    guestLinksActive: number;
    guestUploadsInPeriod: number;
  };
  storageUsage: {
    totalSize: number;
    usedSize: number;
    availableSize: number;
    usageByType: Array<{
      type: string;
      size: number;
      count: number;
      percentage: number;
    }>;
    usageByChannel: Array<{
      channelId: string;
      channelName: string;
      size: number;
      count: number;
      guestUploads: number;
      guestSize: number;
      percentage: number;
    }>;
  };
  uploadTrends: {
    daily: Array<{
      date: string;
      uploads: number;
      size: number;
      users: number;
    }>;
    weekly: Array<{
      week: string;
      uploads: number;
      size: number;
      users: number;
    }>;
    monthly: Array<{
      month: string;
      uploads: number;
      size: number;
      users: number;
    }>;
  };
  userActivity: {
    activeUsers: number;
    newUsers: number;
    topUsers: Array<{
      userId: string;
      email: string;
      uploadCount: number;
      totalSize: number;
      lastActive: string;
    }>;
    activityByRole: Array<{
      role: string;
      count: number;
      percentage: number;
    }>;
  };
  channelActivity: {
    activeChannels: number;
    topChannels: Array<{
      channelId: string;
      name: string;
      fileCount: number;
      totalSize: number;
      userCount: number;
      guestLinkCount: number;
      guestFileCount: number;
      guestStorageSize: number;
      lastActivity: string;
    }>;
    channelsByUsage: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
  };
  
  guestLinkActivity?: {
    totalActiveLinks: number;
    totalGuestUploads: number;
    totalGuestStorage: number;
    topGuestLinks: Array<{
      id: string;
      description: string;
      channelName: string;
      uploadCount: number;
      maxUploads: number;
      storageUsed: number;
      expiresAt: string | null;
      createdAt: string;
      isExpired: boolean;
      isLimitReached: boolean;
    }>;
    expiringLinks: number;
    limitReachedLinks: number;
  };
}

interface ChartComponentProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ title, subtitle, icon, children, actions }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 text-gray-400">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}> = ({ title, value, change, changeType = 'neutral', icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const changeColorClasses = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {changeType === 'increase' && <ArrowUp className={`w-4 h-4 mr-1 ${changeColorClasses[changeType]}`} />}
              {changeType === 'decrease' && <ArrowDown className={`w-4 h-4 mr-1 ${changeColorClasses[changeType]}`} />}
              {changeType === 'neutral' && <Minus className={`w-4 h-4 mr-1 ${changeColorClasses[changeType]}`} />}
              <span className={`text-sm font-medium ${changeColorClasses[changeType]}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">from last period</span>
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: ApiResponse<AnalyticsData> = await adminService.getAnalytics(dateRange);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch analytics data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Utility function for potential future use
  // const formatDate = (dateString: string): string => {
  //   return new Date(dateString).toLocaleDateString();
  // };

  const renderStorageBar = (used: number, total: number) => {
    const percentage = total > 0 ? (used / total) * 100 : 0;

    return (
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full transition-all duration-300 ${
            percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    );
  };

  const renderSimpleBarChart = (data: Array<{ name: string; value: number; percentage?: number }>, maxValue: number) => {
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {typeof item.value === 'number' && item.value > 1024 * 1024 * 1024
                    ? formatBytes(item.value)
                    : item.value.toLocaleString()
                  }
                  {item.percentage && (
                    <span className="ml-2 text-gray-400">({item.percentage.toFixed(1)}%)</span>
                  )}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((item.value / maxValue) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load analytics</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchAnalyticsData}>Try Again</Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <Button variant="secondary" onClick={fetchAnalyticsData}>
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Total Users"
          value={data.overview.totalUsers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Total Channels"
          value={data.overview.totalChannels.toLocaleString()}
          icon={<FolderOpen className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Total Files"
          value={data.overview.totalFiles.toLocaleString()}
          icon={<FileText className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(data.overview.totalStorage)}
          icon={<HardDrive className="w-6 h-6" />}
          color="yellow"
        />
        {data.overview.guestLinksActive !== undefined && (
          <StatCard
            title="Guest Links"
            value={`${data.overview.guestLinksActive} active`}
            icon={<Activity className="w-6 h-6" />}
            color="blue"
          />
        )}
      </div>

      {/* Storage Usage */}
      <ChartComponent
        title="Storage Usage"
        subtitle="System storage utilization and breakdown"
        icon={<HardDrive className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Overall Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Usage</span>
              <span className="text-sm text-gray-500">
                {formatBytes(data.storageUsage.usedSize)} of {formatBytes(data.storageUsage.totalSize)}
              </span>
            </div>
            {renderStorageBar(data.storageUsage.usedSize, data.storageUsage.totalSize)}
          </div>

          {/* Usage by File Type */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">By File Type</h4>
            {renderSimpleBarChart(
              data.storageUsage.usageByType.map(item => ({
                name: item.type,
                value: item.size,
                percentage: item.percentage
              })),
              Math.max(...data.storageUsage.usageByType.map(item => item.size))
            )}
          </div>

          {/* Usage by Channel */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">By Channel</h4>
            <div className="space-y-3">
              {data.storageUsage.usageByChannel.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.channelName}</p>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatBytes(item.size)}
                          <span className="ml-2 text-gray-400">({item.percentage.toFixed(1)}%)</span>
                        </p>
                        {item.guestUploads > 0 && (
                          <p className="text-xs text-blue-600">
                            {item.guestUploads} guest • {formatBytes(item.guestSize)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((item.size / Math.max(...data.storageUsage.usageByChannel.map(ch => ch.size))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ChartComponent>

      {/* User Activity */}
      <ChartComponent
        title="User Activity"
        subtitle="User engagement and activity metrics"
        icon={<Users className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity by Role */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Users by Role</h4>
            {renderSimpleBarChart(
              data.userActivity.activityByRole.map(item => ({
                name: item.role,
                value: item.count,
                percentage: item.percentage
              })),
              Math.max(...data.userActivity.activityByRole.map(item => item.count))
            )}
          </div>

          {/* Top Users */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Most Active Users</h4>
            <div className="space-y-3">
              {data.userActivity.topUsers.slice(0, 5).map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      {user.uploadCount} files • {formatBytes(user.totalSize)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Last active {formatRelativeTime(user.lastActive)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ChartComponent>

      {/* Channel Activity */}
      <ChartComponent
        title="Channel Activity"
        subtitle="Channel usage and activity metrics"
        icon={<FolderOpen className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Channels */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Most Active Channels</h4>
            <div className="space-y-3">
              {data.channelActivity.topChannels.slice(0, 5).map((channel) => (
                <div key={channel.channelId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{channel.name}</p>
                    <p className="text-xs text-gray-500">
                      {channel.fileCount} files • {formatBytes(channel.totalSize)} • {channel.userCount} users
                      {channel.guestLinkCount > 0 && (
                        <span className="ml-2 text-blue-600">• {channel.guestLinkCount} guest links</span>
                      )}
                    </p>
                    {channel.guestFileCount > 0 && (
                      <p className="text-xs text-blue-600">
                        {channel.guestFileCount} guest uploads • {formatBytes(channel.guestStorageSize)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Last activity {formatRelativeTime(channel.lastActivity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Channels by Usage */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Channels by Usage</h4>
            {renderSimpleBarChart(
              data.channelActivity.channelsByUsage.map(item => ({
                name: item.name,
                value: item.count,
                percentage: item.percentage
              })),
              Math.max(...data.channelActivity.channelsByUsage.map(item => item.count))
            )}
          </div>
        </div>
      </ChartComponent>

      {/* Guest Link Activity */}
      {data.guestLinkActivity && (
        <ChartComponent
          title="Guest Link Activity"
          subtitle="Guest upload links usage and statistics"
          icon={<Activity className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guest Link Overview */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Overview</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Active Links</span>
                  <span className="text-lg font-bold text-blue-600">{data.guestLinkActivity.totalActiveLinks}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Guest Uploads</span>
                  <span className="text-lg font-bold text-green-600">{data.guestLinkActivity.totalGuestUploads}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Guest Storage</span>
                  <span className="text-lg font-bold text-purple-600">{formatBytes(data.guestLinkActivity.totalGuestStorage)}</span>
                </div>
                {data.guestLinkActivity.expiringLinks > 0 && (
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Expiring Soon</span>
                    <span className="text-lg font-bold text-yellow-600">{data.guestLinkActivity.expiringLinks}</span>
                  </div>
                )}
                {data.guestLinkActivity.limitReachedLinks > 0 && (
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Limit Reached</span>
                    <span className="text-lg font-bold text-red-600">{data.guestLinkActivity.limitReachedLinks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Guest Links */}
            <div className="lg:col-span-2">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Most Active Guest Links</h4>
              <div className="space-y-3">
                {data.guestLinkActivity.topGuestLinks.slice(0, 5).map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {link.description}
                        {link.isExpired && (
                          <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Expired</span>
                        )}
                        {link.isLimitReached && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Limit Reached</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {link.channelName} • {link.uploadCount} uploads
                        {link.maxUploads && ` of ${link.maxUploads}`}
                        • {formatBytes(link.storageUsed)}
                      </p>
                      {link.expiresAt && (
                        <p className="text-xs text-gray-400">
                          Expires {formatRelativeTime(link.expiresAt)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Created {formatRelativeTime(link.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ChartComponent>
      )}
    </div>
  );
};

// Helper function for relative time formatting
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

export default AnalyticsDashboard;