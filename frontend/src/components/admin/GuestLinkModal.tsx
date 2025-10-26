import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ApiResponse, GuestUploadLink } from '../../types';
import Button from '../Button';
import Modal from '../Modal';
import {
  Link,
  Calendar,
  Hash,
  FolderOpen,
  Save,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

interface GuestLinkModalProps {
  isOpen: boolean;
  channelId: string;
  channelName: string;
  editLink?: GuestUploadLink | null;
  onClose: () => void;
  onSuccess: (link: GuestUploadLink) => void;
}

interface FormData {
  description: string;
  expiresAt: string;
  maxUploads: string;
  guestFolder: string;
}

interface FormErrors {
  description?: string;
  expiresAt?: string;
  maxUploads?: string;
  guestFolder?: string;
}

const GuestLinkModal: React.FC<GuestLinkModalProps> = ({
  isOpen,
  channelId,
  channelName,
  editLink,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<FormData>({
    description: '',
    expiresAt: '',
    maxUploads: '',
    guestFolder: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<GuestUploadLink | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Initialize form data when modal opens or editLink changes
  useEffect(() => {
    if (editLink) {
      setFormData({
        description: editLink.description || '',
        expiresAt: editLink.expiresAt ? new Date(editLink.expiresAt).toISOString().slice(0, 16) : '',
        maxUploads: editLink.maxUploads ? editLink.maxUploads.toString() : '',
        guestFolder: editLink.guestFolder || ''
      });
    } else {
      setFormData({
        description: '',
        expiresAt: '',
        maxUploads: '',
        guestFolder: ''
      });
    }
    setErrors({});
    setCreatedLink(null);
    setCopySuccess(false);
  }, [editLink, isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Description validation (optional but if provided, should be reasonable length)
    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    // Expiration date validation (optional but if provided, should be in future)
    if (formData.expiresAt) {
      const expirationDate = new Date(formData.expiresAt);
      const now = new Date();
      if (expirationDate <= now) {
        newErrors.expiresAt = 'Expiration date must be in the future';
      }
    }

    // Max uploads validation (optional but if provided, should be positive integer)
    if (formData.maxUploads) {
      const maxUploads = parseInt(formData.maxUploads);
      if (isNaN(maxUploads) || maxUploads < 1 || maxUploads > 10000) {
        newErrors.maxUploads = 'Max uploads must be a number between 1 and 10,000';
      }
    }

    // Guest folder validation (optional but if provided, should be valid path)
    if (formData.guestFolder) {
      const folderPattern = /^[a-zA-Z0-9/_-]+$/;
      if (!folderPattern.test(formData.guestFolder)) {
        newErrors.guestFolder = 'Guest folder can only contain letters, numbers, hyphens, underscores, and forward slashes';
      }
      if (formData.guestFolder.startsWith('/') || formData.guestFolder.endsWith('/')) {
        newErrors.guestFolder = 'Guest folder should not start or end with forward slashes';
      }
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
      const requestData = {
        channelId,
        description: formData.description.trim() || undefined,
        expiresAt: formData.expiresAt || undefined,
        maxUploads: formData.maxUploads ? parseInt(formData.maxUploads) : undefined,
        guestFolder: formData.guestFolder.trim() || undefined
      };

      let response: ApiResponse<GuestUploadLink>;

      if (editLink) {
        // Update existing guest link
        response = await adminService.updateGuestLink(editLink.id, requestData);
      } else {
        // Create new guest link
        response = await adminService.createGuestLink(requestData);
      }

      if (response.success && response.data) {
        setCreatedLink(response.data);
        onSuccess(response.data);
        
        // Don't close modal immediately for new links so user can copy URL
        if (editLink) {
          onClose();
        }
      } else {
        throw new Error(response.error?.message || 'Failed to save guest link');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle copy to clipboard
  const handleCopyUrl = async () => {
    if (!createdLink?.url) return;

    try {
      await navigator.clipboard.writeText(createdLink.url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = createdLink.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Generate default expiration date (30 days from now)
  const getDefaultExpirationDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 16);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editLink ? 'Edit Guest Link' : 'Create Guest Link'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Channel Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FolderOpen className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Channel: {channelName}</h4>
              <p className="text-xs text-blue-700">
                {editLink ? 'Update guest link settings' : 'Create a secure link for external file uploads'}
              </p>
            </div>
          </div>
        </div>

        {/* Success state - show created link */}
        {createdLink && !editLink && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <Check className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-900 mb-2">
                  Guest Link Created Successfully!
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-green-800 mb-1">
                      Guest Upload URL
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={createdLink.url}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm bg-white border border-green-300 rounded-md focus:outline-none"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCopyUrl}
                        className={copySuccess ? 'bg-green-100 text-green-800' : ''}
                      >
                        {copySuccess ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-green-700">
                    Share this URL with external users to allow file uploads to this channel.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Client project files, Event photos, etc."
              disabled={loading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Help identify the purpose of this guest link
            </p>
          </div>

          {/* Expiration Date */}
          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Expiration Date (Optional)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="datetime-local"
                id="expiresAt"
                value={formData.expiresAt}
                onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.expiresAt ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleInputChange('expiresAt', getDefaultExpirationDate())}
                disabled={loading}
              >
                30 Days
              </Button>
            </div>
            {errors.expiresAt && (
              <p className="mt-1 text-sm text-red-600">{errors.expiresAt}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Link will automatically deactivate after this date. Leave empty for no expiration.
            </p>
          </div>

          {/* Max Uploads */}
          <div>
            <label htmlFor="maxUploads" className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Maximum Uploads (Optional)
            </label>
            <input
              type="number"
              id="maxUploads"
              value={formData.maxUploads}
              onChange={(e) => handleInputChange('maxUploads', e.target.value)}
              min="1"
              max="10000"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.maxUploads ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 100"
              disabled={loading}
            />
            {errors.maxUploads && (
              <p className="mt-1 text-sm text-red-600">{errors.maxUploads}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Link will deactivate after this many uploads. Leave empty for unlimited uploads.
            </p>
          </div>

          {/* Guest Folder */}
          <div>
            <label htmlFor="guestFolder" className="block text-sm font-medium text-gray-700 mb-2">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              Guest Folder (Optional)
            </label>
            <input
              type="text"
              id="guestFolder"
              value={formData.guestFolder}
              onChange={(e) => handleInputChange('guestFolder', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.guestFolder ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., guest-uploads, client-files"
              disabled={loading}
            />
            {errors.guestFolder && (
              <p className="mt-1 text-sm text-red-600">{errors.guestFolder}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Organize guest uploads in a specific subfolder within the channel. Leave empty to upload to channel root.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              {createdLink && !editLink ? 'Done' : 'Cancel'}
            </Button>
            {(!createdLink || editLink) && (
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {editLink ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editLink ? 'Update Link' : 'Create Link'}
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default GuestLinkModal;