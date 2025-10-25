import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ApiResponse } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Button';
import {
  Users,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Save,
  X
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CHANNEL_USER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface ChannelUserAssignmentProps {
  channelId: string;
  channelName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ChannelUserAssignment: React.FC<ChannelUserAssignmentProps> = ({
  channelId,
  channelName,
  isOpen,
  onClose,
  onSave
}) => {
  const { refreshUser } = useAuth();
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
  const [selectedAssigned, setSelectedAssigned] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen && channelId) {
      fetchUsers();
    }
  }, [isOpen, channelId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<{
        assignedUsers: User[];
        availableUsers: User[];
      }> = await adminService.getChannelUsers(channelId);

      if (response.success && response.data) {
        setAssignedUsers(response.data.assignedUsers || []);
        setAvailableUsers(response.data.availableUsers || []);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Set empty arrays on error to prevent undefined crashes
      setAssignedUsers([]);
      setAvailableUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding users to assignment
  const handleAddUsers = () => {
    if (selectedAvailable.length === 0) return;

    const usersToAdd = availableUsers.filter(user =>
      selectedAvailable.includes(user.id)
    );

    setAssignedUsers(prev => [...prev, ...usersToAdd]);
    setAvailableUsers(prev =>
      prev.filter(user => !selectedAvailable.includes(user.id))
    );
    setSelectedAvailable([]);
  };

  // Handle removing users from assignment
  const handleRemoveUsers = () => {
    if (selectedAssigned.length === 0) return;

    const usersToRemove = assignedUsers.filter(user =>
      selectedAssigned.includes(user.id)
    );

    setAvailableUsers(prev => [...prev, ...usersToRemove]);
    setAssignedUsers(prev =>
      prev.filter(user => !selectedAssigned.includes(user.id))
    );
    setSelectedAssigned([]);
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const userIds = assignedUsers.map(user => user.id);
      const response = await adminService.updateChannelUsers(channelId, userIds);

      if (response.success) {
        // Refresh user data to update channel assignments
        await refreshUser();
        // Call onSave to trigger parent refresh
        onSave();
        // Close modal
        onClose();
      } else {
        throw new Error(response.error?.message || 'Failed to update user assignments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Handle user selection
  const handleSelectAvailable = (userId: string) => {
    setSelectedAvailable(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAssigned = (userId: string) => {
    setSelectedAssigned(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Select/deselect all
  const handleSelectAllAvailable = () => {
    if (selectedAvailable.length === availableUsers.length) {
      setSelectedAvailable([]);
    } else {
      setSelectedAvailable(availableUsers.map(user => user.id));
    }
  };

  const handleSelectAllAssigned = () => {
    if (selectedAssigned.length === assignedUsers.length) {
      setSelectedAssigned([]);
    } else {
      setSelectedAssigned(assignedUsers.map(user => user.id));
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format relative time
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Manage User Assignments
                  </h3>
                  <p className="text-sm text-gray-500">
                    Channel: <span className="font-medium">{channelName}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  onClick={fetchUsers}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Assignment Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Available Users */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Available Users</h4>
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedAvailable.length === availableUsers.length && availableUsers.length > 0}
                        onChange={handleSelectAllAvailable}
                        className="mr-2"
                      />
                      Select All
                    </label>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-500">Loading...</span>
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No available users</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedAvailable.includes(user.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectAvailable(user.id)}
                        >
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedAvailable.includes(user.id)}
                              onChange={() => handleSelectAvailable(user.id)}
                              className="mt-1 mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.email}
                              </p>
                              <div className="flex items-center mt-1 space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  user.role === 'ADMIN'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {user.role}
                                </span>
                                <span className="text-xs text-gray-400">
                                  Last login: {formatRelativeTime(user.lastLoginAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Controls */}
              <div className="lg:col-span-1">
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="space-y-4">
                    <Button
                      onClick={handleAddUsers}
                      disabled={selectedAvailable.length === 0}
                      className="flex items-center"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Add Selected
                      {selectedAvailable.length > 0 && (
                        <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs">
                          {selectedAvailable.length}
                        </span>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={handleRemoveUsers}
                      disabled={selectedAssigned.length === 0}
                      className="flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Remove Selected
                      {selectedAssigned.length > 0 && (
                        <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded text-xs">
                          {selectedAssigned.length}
                        </span>
                      )}
                    </Button>
                  </div>

                  <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 mb-2">Statistics</p>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {assignedUsers.length}
                      </div>
                      <p className="text-xs text-gray-500">Assigned Users</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Users */}
              <div className="lg:col-span-1">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Assigned Users</h4>
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedAssigned.length === assignedUsers.length && assignedUsers.length > 0}
                        onChange={handleSelectAllAssigned}
                        className="mr-2"
                      />
                      Select All
                    </label>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-500">Loading...</span>
                    </div>
                  ) : assignedUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No users assigned</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Select users from the left to assign
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {assignedUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedAssigned.includes(user.id)
                              ? 'border-green-500 bg-green-100'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectAssigned(user.id)}
                        >
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedAssigned.includes(user.id)}
                              onChange={() => handleSelectAssigned(user.id)}
                              className="mt-1 mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.email}
                              </p>
                              <div className="flex items-center mt-1 space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  user.role === 'ADMIN'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {user.role}
                                </span>
                                <span className="text-xs text-gray-400">
                                  Last login: {formatRelativeTime(user.lastLoginAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Assignments
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="mt-3 sm:mt-0 sm:ml-3 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelUserAssignment;