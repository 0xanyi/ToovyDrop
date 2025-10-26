import React, { useState } from 'react';
import Layout from '../../components/Layout';
import ChannelList from '../../components/admin/ChannelList';
import ChannelForm from '../../components/admin/ChannelForm';
import ChannelUserAssignment from '../../components/admin/ChannelUserAssignment';
import GuestLinkModal from '../../components/admin/GuestLinkModal';
import GuestLinkList from '../../components/admin/GuestLinkList';
import Button from '../../components/Button';
import { adminService } from '../../services/adminService';
import { GuestUploadLink } from '../../types';
import { FolderOpen, Settings, Users, Link } from 'lucide-react';

const AdminChannelsPage: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [isChannelFormOpen, setIsChannelFormOpen] = useState(false);
  const [isChannelUserAssignmentOpen, setIsChannelUserAssignmentOpen] = useState(false);
  const [channelRefreshTrigger, setChannelRefreshTrigger] = useState(0);

  // Guest link management state
  const [isGuestLinkModalOpen, setIsGuestLinkModalOpen] = useState(false);
  const [editingGuestLink, setEditingGuestLink] = useState<GuestUploadLink | null>(null);
  const [guestLinkRefreshTrigger, setGuestLinkRefreshTrigger] = useState(0);

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FolderOpen className="w-8 h-8 mr-3 text-green-600" />
              Channel Management
            </h1>
            <p className="mt-2 text-gray-600">Manage channels, permissions, and user assignments</p>
          </div>

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
        </div>
      </div>

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

export default AdminChannelsPage;