import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import Button from '../Button';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity
} from 'lucide-react';

interface CleanupStats {
  expiredActiveLinks: number;
  limitReachedActiveLinks: number;
  oldInactiveLinks: number;
  totalActiveLinks: number;
}

interface CleanupResult {
  deactivatedCount: number;
  deletedCount: number;
  errors: string[];
}

const GuestLinkCleanup: React.FC = () => {
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [lastCleanupResult, setLastCleanupResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getGuestLinkCleanupStats();
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch cleanup stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const triggerCleanup = async () => {
    try {
      setCleanupLoading(true);
      setError(null);
      const response = await adminService.triggerGuestLinkCleanup();
      
      if (response.success && response.data) {
        setLastCleanupResult(response.data.result);
        // Refresh stats after cleanup
        await fetchStats();
      } else {
        throw new Error(response.error?.message || 'Failed to trigger cleanup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCleanupLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'yellow' | 'red' | 'green';
    description: string;
  }> = ({ title, value, icon, color, description }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      green: 'bg-green-50 border-green-200 text-green-800',
    };

    const iconColorClasses = {
      blue: 'text-blue-600',
      yellow: 'text-yellow-600',
      red: 'text-red-600',
      green: 'text-green-600',
    };

    return (
      <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`${iconColorClasses[color]}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        </div>
        <p className="text-xs mt-2 opacity-75">{description}</p>
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
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load cleanup data</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchStats}>Try Again</Button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const needsCleanup = stats.expiredActiveLinks > 0 || stats.limitReachedActiveLinks > 0 || stats.oldInactiveLinks > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Guest Link Cleanup</h3>
          <p className="text-gray-600">Manage expired and unused guest upload links</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={triggerCleanup}
            disabled={cleanupLoading || !needsCleanup}
            variant={needsCleanup ? 'primary' : 'secondary'}
          >
            <Trash2 className={`w-4 h-4 mr-2 ${cleanupLoading ? 'animate-pulse' : ''}`} />
            {cleanupLoading ? 'Cleaning...' : 'Run Cleanup'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Links"
          value={stats.totalActiveLinks}
          icon={<Activity className="w-5 h-5" />}
          color="green"
          description="Currently active guest links"
        />
        <StatCard
          title="Expired Links"
          value={stats.expiredActiveLinks}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
          description="Active links that have expired"
        />
        <StatCard
          title="Limit Reached"
          value={stats.limitReachedActiveLinks}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          description="Links that reached upload limit"
        />
        <StatCard
          title="Old Inactive"
          value={stats.oldInactiveLinks}
          icon={<Trash2 className="w-5 h-5" />}
          color="blue"
          description="Old inactive links ready for deletion"
        />
      </div>

      {/* Cleanup Status */}
      {!needsCleanup && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-green-800">System Clean</h4>
              <p className="text-sm text-green-700">No guest links require cleanup at this time.</p>
            </div>
          </div>
        </div>
      )}

      {needsCleanup && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Cleanup Recommended</h4>
              <p className="text-sm text-yellow-700">
                There are {stats.expiredActiveLinks + stats.limitReachedActiveLinks + stats.oldInactiveLinks} items that can be cleaned up.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Last Cleanup Result */}
      {lastCleanupResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Last Cleanup Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{lastCleanupResult.deactivatedCount}</p>
              <p className="text-sm text-gray-600">Links Deactivated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{lastCleanupResult.deletedCount}</p>
              <p className="text-sm text-gray-600">Links Deleted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{lastCleanupResult.errors.length}</p>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
          </div>
          
          {lastCleanupResult.errors.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-red-800 mb-2">Errors:</h5>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <ul className="text-sm text-red-700 space-y-1">
                  {lastCleanupResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Automatic Cleanup</h4>
        <p className="text-sm text-blue-700">
          The system automatically runs cleanup every 24 hours. This manual cleanup allows you to run it immediately when needed.
        </p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>• Expired links are automatically deactivated</li>
          <li>• Links that reached their upload limit are deactivated</li>
          <li>• Old inactive links (90+ days) with no files are deleted</li>
        </ul>
      </div>
    </div>
  );
};

export default GuestLinkCleanup;