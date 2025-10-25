import React, { useState } from 'react';
import Layout from '../../components/Layout';
import UserList from '../../components/admin/UserList';
import UserForm from '../../components/admin/UserForm';
import UserChannelAssignment from '../../components/admin/UserChannelAssignment';
import Button from '../../components/Button';
import { Users, Settings, FolderOpen } from 'lucide-react';

const AdminUsersPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isChannelAssignmentOpen, setIsChannelAssignmentOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              User Management
            </h1>
            <p className="mt-2 text-gray-600">Manage user accounts, roles, and permissions</p>
          </div>

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
                    <p className="mt-1 text-sm text-gray-900">{selectedUser._count?.channels || 0}</p>
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
        </div>
      </div>

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
    </Layout>
  );
};

export default AdminUsersPage;