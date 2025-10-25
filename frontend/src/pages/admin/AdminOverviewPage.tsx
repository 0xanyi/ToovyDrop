import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import {
  Users,
  FolderOpen,
  FileText,
  Database,
  Clock,
  Shield,
  BarChart3
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

const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

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
        fetch(`${apiUrl}/api/admin/dashboard/stats`, { headers }),
        fetch(`${apiUrl}/api/admin/system/health`, { headers })
      ]);

      if (!statsResponse.ok || !healthResponse.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const statsData = await statsResponse.json();
      const healthData = await healthResponse.json();

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
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin overview...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Shield className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              Admin Overview
            </h1>
            <p className="mt-2 text-gray-600">System statistics and health monitoring</p>
          </div>

          {stats && (
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
        </div>
      </div>
    </Layout>
  );
};

export default AdminOverviewPage;