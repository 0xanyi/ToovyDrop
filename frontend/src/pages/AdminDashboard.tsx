import React, { useState, useEffect } from 'react';

import { ApiResponse, GuestUploadLink } from '../types';
import { adminService } from '../services/adminService';
import Layout from '../components/Layout';
import Button from '../components/Button';
import UserList from '../components/admin/UserList';
import UserForm from '../components/admin/UserForm';
import UserChannelAssignment from '../components/admin/UserChannelAssignment';
import ChannelList from '../components/admin/ChannelList';
import ChannelForm from '../components/admin/ChannelForm';
import ChannelUserAssignment from '../components/admin/ChannelUserAssignment';
import GuestLinkModal from '../components/admin/GuestLinkModal';
import GuestLinkList from '../components/admin/GuestLinkList';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import FileAdministration from '../components/admin/FileAdministration';
import SystemConfiguration from '../components/admin/SystemConfiguration';
import {
  Users,
  FolderOpen,
  FileText,
  Activity,
  BarChart3,
  Shield,
  Database,
  Clock,
  Settings,
  Link
} from 'lucide-react';

interface DashboardStats {
  users: {
    total: number;
    byRole: Record<string, number>;
    recent: number;
  };
  channels: {
    total: number;
    topByUsage: Array<{
      id: string;
      name: string;
      slug: string;
      _count: {
        files: number;
        guestUploadLinks: number;
      };
    }>;
  };
  files: {
    total: number;
    recent: number;
    totalStorageBytes: bigint;
    typeDistribution: Array<{
      mimeType: string;
      count: number;
      totalSize: bigint;
    }>;
  };
  period: string;
}

interface SystemHealth {
  database: {
    status: string;
    connectedAt: string;
  };
  server: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    nodeVersion: string;
    environment: string;
  };
  timestamp: string;
}

const AdminDashboard: React.FC = () => {

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'channels' | 'files' | 'analytics' | 'settings'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User management state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isChannelAssignmentOpen, setIsChannelAssignmentOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Channel management state
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [isChannelFormOpen, setIsChannelFormOpen] = useState(false);
  const [isChannelUserAssignmentOpen, setIsChannelUserAssignmentOpen] = useState(false);
  const [channelRefreshTrigger, setChannelRefreshTrigger] = useState(0);

  // Guest link management state
  const [isGuestLinkModalOpen, setIsGuestLinkModalOpen] = useState(false);
  const [editingGuestLink, setEditingGuestLink] = useState<GuestUploadLink | null>(null);
  const [guestLinkRefreshTrigger, setGuestLinkRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token
      const authTokens = localStorage.getItem('authTokens');
      let token = null;
      
      if (authTokens) {
        try {
          const tokens = JSON.parse(authTokens);
          token = tokens.accessToken;
        } catch (error) {
          console.error('Error parsing auth tokens:', error);
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const [statsResponse, healthResponse] = await Promise.all([
        fetch(`${apiUrl}/api/admin/dashboard/stats`, {
          headers
        }),
        fetch(`${apiUrl}/api/admin/system/health`, {
          headers
        })
      ]);

      if (!statsResponse.ok || !healthResponse.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const statsData: ApiResponse<DashboardStats> = await statsResponse.json();
      const healthData: ApiResponse<SystemHealth> = await healthResponse.json();

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }

      if (healthData.success && healthData.data) {
        setSystemHealth(healthData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };



  // User management handlers
  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
  };

  const handleUserCreate = () => {
    setSelectedUser(null);
    setIsUserFormOpen(true);
  };

  const handleUserEdit = (user: any) => {
    setSelectedUser(user);
    setIsUserFormOpen(true);
  };

  const handleUserFormSave = () => {
    setIsUserFormOpen(false);
    setSelectedUser(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUserFormClose = () => {
    setIsUserFormOpen(false);
    setSelectedUser(null);
  };

  const handleChannelAssignment = () => {
    if (selectedUser) {
      setIsChannelAssignmentOpen(true);
    }
  };

  const handleChannelAssignmentSave = () => {
    setIsChannelAssignmentOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleChannelAssignmentClose = () => {
    setIsChannelAssignmentOpen(false);
  };

  // Channel management handlers
  const handleChannelSelect = (channel: any) => {
    setSelectedChannel(channel);
  };

  const handleChannelCreate = () => {
    setSelectedChannel(null);
    setIsChannelFormOpen(true);
  };

  const handleChannelEdit = (channel: any) => {
    setSelectedChannel(channel);
    setIsChannelFormOpen(true);
  };

  const handleChannelFormSave = () => {
    setIsChannelFormOpen(false);
    setSelectedChannel(null);
    setChannelRefreshTrigger(prev => prev + 1);
  };

  const handleChannelFormClose = () => {
    setIsChannelFormOpen(false);
    setSelectedChannel(null);
  };

  const handleChannelUserAssignment = () => {
    if (selectedChannel) {
      setIsChannelUserAssignmentOpen(true);
    }
  };

  const handleChannelUserAssignmentSave = async () => {
    setIsChannelUserAssignmentOpen(false);
    setChannelRefreshTrigger(prev => prev + 1);
    
    // Refresh the selected channel details to show updated user count
    if (selectedChannel) {
      try {
        const response = await adminService.getChannel(selectedChannel.id);
        if (response.success && response.data) {
          setSelectedChannel(response.data);
        }
      } catch (error) {
        console.error('Error refreshing channel details:', error);
      }
    }
  };

  const handleChannelUserAssignmentClose = () => {
    setIsChannelUserAssignmentOpen(false);
  };

  // Guest link management handlers
  const handleCreateGuestLink = () => {
    if (selectedChannel) {
      setEditingGuestLink(null);
      setIsGuestLinkModalOpen(true);
    }
  };

  const handleEditGuestLink = (link: GuestUploadLink) => {
    setEditingGuestLink(link);
    setIsGuestLinkModalOpen(true);
  };

  const handleGuestLinkModalClose = () => {
    setIsGuestLinkModalOpen(false);
    setEditingGuestLink(null);
  };

  const handleGuestLinkSuccess = () => {
    setGuestLinkRefreshTrigger(prev => prev + 1);
    // Refresh channel details to update guest link count
    if (selectedChannel) {
      adminService.getChannel(selectedChannel.id).then(response => {
        if (response.success && response.data) {
          setSelectedChannel(response.data);
        }
      });
    }
  };

  const handleGuestLinkDelete = () => {
    setGuestLinkRefreshTrigger(prev => prev + 1);
    // Refresh channel details to update guest link count
    if (selectedChannel) {
      adminService.getChannel(selectedChannel.id).then(response => {
        if (response.success && response.data) {
          setSelectedChannel(response.data);
        }
      });
    }
  };

  const handleGuestLinkToggleActive = () => {
    setGuestLinkRefreshTrigger(prev => prev + 1);
  };

  const formatBytes = (bytes: bigint): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0n) return '0 Bytes';
    const i = Math.floor(Math.log(Number(bytes)) / Math.log(1024));
    return `${Number(bytes) / Math.pow(1024, i)} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Shield className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <Layout>

      {/* Navigation tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'channels', label: 'Channels', icon: FolderOpen },
              { id: 'files', label: 'Files', icon: FileText },
              { id: 'analytics', label: 'Analytics', icon: Activity },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                      <p className="text-xs text-green-600">+{stats.users.recent} this week</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FolderOpen className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Channels</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.channels.total}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Files</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.files.total}</p>
                      <p className="text-xs text-green-600">+{stats.files.recent} this week</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Database className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Storage Used</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatBytes(stats.files.totalStorageBytes)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Health */}
              {systemHealth && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center">
                      <Database className={`h-5 w-5 mr-2 ${systemHealth.database.status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Database</p>
                        <p className="text-xs text-gray-600">{systemHealth.database.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Uptime</p>
                        <p className="text-xs text-gray-600">{formatUptime(systemHealth.server.uptime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Environment</p>
                        <p className="text-xs text-gray-600">{systemHealth.server.environment}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* User Details Panel */}
              {selectedUser && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        onClick={handleChannelAssignment}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Manage Channels
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleUserEdit(selectedUser)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit User
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Role</label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedUser.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {selectedUser.role}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedUser.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Channels</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser._count.channels}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Created</label>
                      <p className="mt-1 text-sm text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Last Login</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedUser.lastLoginAt
                          ? new Date(selectedUser.lastLoginAt).toLocaleDateString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* User List */}
              <UserList
                onUserSelect={handleUserSelect}
                onUserEdit={handleUserEdit}
                onUserCreate={handleUserCreate}
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="space-y-6">
              {/* Channel Details Panel */}
              {selectedChannel && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Channel Details</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        onClick={handleCreateGuestLink}
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Generate Guest Link
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleChannelUserAssignment}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Users
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleChannelEdit(selectedChannel)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Channel
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedChannel.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Slug</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedChannel.slug}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">FTP Path</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{selectedChannel.ftpPath}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedChannel.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedChannel.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Description</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedChannel.description || 'No description'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Files</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedChannel._count?.files || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Users</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedChannel._count?.users || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Guest Links</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedChannel._count?.guestUploadLinks || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Created</label>
                      <p className="mt-1 text-sm text-gray-900">{new Date(selectedChannel.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Updated</label>
                      <p className="mt-1 text-sm text-gray-900">{new Date(selectedChannel.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Guest Link Management */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <GuestLinkList
                      channelId={selectedChannel.id}
                      refreshTrigger={guestLinkRefreshTrigger}
                      onEdit={handleEditGuestLink}
                      onDelete={handleGuestLinkDelete}
                      onToggleActive={handleGuestLinkToggleActive}
                    />
                  </div>
                </div>
              )}

              {/* Channel List */}
              <ChannelList
                onChannelSelect={handleChannelSelect}
                onChannelEdit={handleChannelEdit}
                onChannelCreate={handleChannelCreate}
                refreshTrigger={channelRefreshTrigger}
              />
            </div>
          )}

          {activeTab === 'files' && (
            <FileAdministration />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard />
          )}

          {activeTab === 'settings' && (
            <SystemConfiguration />
          )}
        </div>
      </main>

      {/* User Form Modal */}
      <UserForm
        user={selectedUser}
        isOpen={isUserFormOpen}
        onClose={handleUserFormClose}
        onSave={handleUserFormSave}
      />

      {/* Channel Assignment Modal */}
      {selectedUser && (
        <UserChannelAssignment
          userId={selectedUser.id}
          userName={selectedUser.email}
          isOpen={isChannelAssignmentOpen}
          onClose={handleChannelAssignmentClose}
          onSave={handleChannelAssignmentSave}
        />
      )}

      {/* Channel Form Modal */}
      <ChannelForm
        channel={selectedChannel}
        isOpen={isChannelFormOpen}
        onClose={handleChannelFormClose}
        onSave={handleChannelFormSave}
      />

      {/* Channel User Assignment Modal */}
      {selectedChannel && (
        <ChannelUserAssignment
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
          isOpen={isChannelUserAssignmentOpen}
          onClose={handleChannelUserAssignmentClose}
          onSave={handleChannelUserAssignmentSave}
        />
      )}

      {/* Guest Link Modal */}
      {selectedChannel && (
        <GuestLinkModal
          isOpen={isGuestLinkModalOpen}
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
          editLink={editingGuestLink}
          onClose={handleGuestLinkModalClose}
          onSuccess={handleGuestLinkSuccess}
        />
      )}
    </Layout>
  );
};

export default AdminDashboard;