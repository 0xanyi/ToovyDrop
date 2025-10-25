import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ApiResponse } from '../../types';
import Button from '../Button';
import {
  FolderOpen,
  Save,
  X,
  FolderPlus
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ftpPath: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  _count: {
    files: number;
    guestUploadLinks: number;
    users: number;
  };
}

interface ChannelFormProps {
  channel?: Channel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  name: string;
  description: string;
  ftpPath: string;
}

interface FormErrors {
  name?: string;
  ftpPath?: string;
}

const ChannelForm: React.FC<ChannelFormProps> = ({
  channel,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    ftpPath: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when channel changes
  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name,
        description: channel.description || '',
        ftpPath: channel.ftpPath
      });
    } else {
      setFormData({
        name: '',
        description: '',
        ftpPath: ''
      });
    }
    setErrors({});
  }, [channel, isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Channel name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Channel name must be less than 100 characters';
    } else if (!/^[a-zA-Z0-9\s_-]+$/.test(formData.name)) {
      newErrors.name = 'Channel name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // FTP path validation
    const ftpPathPattern = /^\/[a-zA-Z0-9/_-]*$/;
    if (formData.ftpPath && !ftpPathPattern.test(formData.ftpPath)) {
      newErrors.ftpPath = 'FTP path must start with / and contain only letters, numbers, hyphens, underscores, and forward slashes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let response: ApiResponse<any>;

      // Generate FTP path if not provided
      const ftpPath = formData.ftpPath || `/uploads/${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      if (channel) {
        // Update existing channel
        response = await adminService.updateChannel(channel.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          ftpPath: ftpPath.trim()
        });
      } else {
        // Create new channel
        response = await adminService.createChannel({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          ftpPath: ftpPath.trim()
        });
      }

      if (response.success) {
        onSave();
        onClose();
      } else {
        throw new Error(response.error?.message || 'Failed to save channel');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      // Set specific error messages
      if (errorMessage.includes('slug already exists')) {
        setErrors({ name: 'A channel with this name already exists' });
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Auto-generate FTP path when name changes (for new channels)
  const handleNameChange = (value: string) => {
    // Auto-generate FTP path for new channels if not manually set
    if (!channel && value.trim()) {
      const slug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      const generatedPath = `/uploads/${slug}`;
      setFormData(prev => ({ ...prev, name: value, ftpPath: generatedPath }));
    } else {
      handleInputChange('name', value);
    }

    // Clear specific error when user starts typing
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {channel ? <FolderOpen className="h-6 w-6 text-blue-600" /> : <FolderPlus className="h-6 w-6 text-blue-600" />}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {channel ? 'Edit Channel' : 'Create New Channel'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {channel ? 'Update channel information and settings' : 'Add a new channel to organize files and user access'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Channel Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="My Channel"
                  disabled={loading}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This will be used to generate a unique slug for the channel URL
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description of the channel's purpose"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Describe what this channel is used for (optional)
                </p>
              </div>

              {/* FTP Path */}
              <div>
                <label htmlFor="ftpPath" className="block text-sm font-medium text-gray-700 mb-2">
                  FTP Path
                </label>
                <input
                  type="text"
                  id="ftpPath"
                  value={formData.ftpPath}
                  onChange={(e) => handleInputChange('ftpPath', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.ftpPath ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="/uploads/my-channel"
                  disabled={loading}
                />
                {errors.ftpPath && (
                  <p className="mt-1 text-sm text-red-600">{errors.ftpPath}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Server path where files for this channel will be stored. Auto-generated from channel name if left empty.
                </p>
              </div>

              {/* Channel Info Preview */}
              {formData.name && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Channel Preview</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-2">Slug:</span>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                        {formData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}
                      </code>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-2">FTP Path:</span>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                        {formData.ftpPath || '/uploads/' + formData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {channel ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {channel ? 'Update Channel' : 'Create Channel'}
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
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

export default ChannelForm;