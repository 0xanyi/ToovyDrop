import React, { useState, useEffect } from 'react';
import { adminService as _adminService } from '../../services/adminService';
import { ApiResponse } from '../../types';
import Button from '../Button';
import LoginBackgroundUpload from './LoginBackgroundUpload';
import {
  Settings as _Settings,
  Database,
  Shield,
  Mail,
  HardDrive,
  Users as _Users,
  FileText,
  Globe,
  Bell as _Bell,
  Key as _Key,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap as _Zap,
  Lock as _Lock,
  Eye,
  EyeOff
} from 'lucide-react';

interface SystemConfig {
  general: {
    siteName: string;
    siteDescription: string;
    defaultLanguage: string;
    timezone: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  storage: {
    maxFileSize: number;
    maxStoragePerUser: number;
    maxStoragePerChannel: number;
    allowedFileTypes: string[];
    autoCleanupEnabled: boolean;
    autoCleanupDays: number;
  };
  security: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    twoFactorEnabled: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    emailNotificationsEnabled: boolean;
  };
  notifications: {
    emailOnUserRegistration: boolean;
    emailOnFileUpload: boolean;
    emailOnChannelCreation: boolean;
    emailOnSystemAlert: boolean;
    webhookEnabled: boolean;
    webhookUrl: string;
  };
  backup: {
    autoBackupEnabled: boolean;
    backupFrequency: string;
    retentionDays: number;
    backupLocation: string;
  };
}

interface ConfigSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  description,
  icon,
  children,
  isExpanded = true,
  onToggle
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div
        className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 text-gray-400">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          {onToggle && (
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
};

const SystemConfiguration: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  // Helper function to get auth token
  const getAuthToken = (): string | null => {
    const authTokens = localStorage.getItem('authTokens');
    if (authTokens) {
      try {
        const tokens = JSON.parse(authTokens);
        return tokens.accessToken;
      } catch (error) {
        console.error('Error parsing auth tokens:', error);
        return null;
      }
    }
    return null;
  };

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general', 'storage', 'security']));
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: This endpoint would need to be implemented in the backend
      const response: ApiResponse<SystemConfig> = await fetch(`${apiUrl}/api/admin/config`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      }).then(res => res.json());

      if (response.success && response.data) {
        setConfig(response.data);
      } else {
        // Use default configuration for now
        setConfig({
          general: {
            siteName: 'ChannelDrop',
            siteDescription: 'Secure file sharing platform',
            defaultLanguage: 'en',
            timezone: 'UTC',
            maintenanceMode: false,
            maintenanceMessage: 'System under maintenance. Please try again later.'
          },
          storage: {
            maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
            maxStoragePerUser: 50 * 1024 * 1024 * 1024, // 50GB
            maxStoragePerChannel: 100 * 1024 * 1024 * 1024, // 100GB
            allowedFileTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'],
            autoCleanupEnabled: false,
            autoCleanupDays: 30
          },
          security: {
            passwordMinLength: 8,
            passwordRequireUppercase: true,
            passwordRequireLowercase: true,
            passwordRequireNumbers: true,
            passwordRequireSpecialChars: true,
            sessionTimeoutMinutes: 60,
            maxLoginAttempts: 5,
            lockoutDurationMinutes: 15,
            twoFactorEnabled: false
          },
          email: {
            smtpHost: '',
            smtpPort: 587,
            smtpSecure: false,
            smtpUser: '',
            smtpPassword: '',
            fromEmail: 'noreply@toovydrop.com',
            fromName: 'ChannelDrop',
            emailNotificationsEnabled: false
          },
          notifications: {
            emailOnUserRegistration: false,
            emailOnFileUpload: false,
            emailOnChannelCreation: false,
            emailOnSystemAlert: true,
            webhookEnabled: false,
            webhookUrl: ''
          },
          backup: {
            autoBackupEnabled: false,
            backupFrequency: 'daily',
            retentionDays: 30,
            backupLocation: 'local'
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (section?: keyof SystemConfig) => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Note: This endpoint would need to be implemented in the backend
      const response = await fetch(`${apiUrl}/api/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(section ? { [section]: config[section] } : config)
      }).then(res => res.json());

      if (response.success) {
        setSuccess(`${section ? 'Section' : 'Configuration'} saved successfully`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.error?.message || 'Failed to save configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      // Note: This endpoint would need to be implemented in the backend
      const response = await fetch(`${apiUrl}/api/admin/config/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Email from ChannelDrop',
          message: 'This is a test email to verify your SMTP configuration.'
        })
      }).then(res => res.json());

      if (response.success) {
        setSuccess('Test email sent successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.error?.message || 'Failed to send test email');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const updateConfig = (section: keyof SystemConfig, field: string, value: any) => {
    if (!config) return;

    setConfig(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value
      }
    }));
  };

  // Utility function for potential future use
  // const formatBytes = (bytes: number): string => {
  //   if (bytes === 0) return '0 B';
  //   const k = 1024;
  //   const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load configuration</h3>
        <p className="text-gray-500 mb-4">{error || 'Configuration not available'}</p>
        <Button onClick={fetchConfig}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
          <p className="text-gray-600">Manage system settings and preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={fetchConfig} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleSaveConfig()} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Login Background Upload */}
      <LoginBackgroundUpload />

      {/* General Configuration */}
      <ConfigSection
        title="General Settings"
        description="Basic site configuration and appearance"
        icon={<Globe className="w-5 h-5" />}
        isExpanded={expandedSections.has('general')}
        onToggle={() => toggleSection('general')}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={config.general.siteName}
                onChange={(e) => updateConfig('general', 'siteName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Language
              </label>
              <select
                value={config.general.defaultLanguage}
                onChange={(e) => updateConfig('general', 'defaultLanguage', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Description
            </label>
            <textarea
              value={config.general.siteDescription}
              onChange={(e) => updateConfig('general', 'siteDescription', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={config.general.timezone}
                onChange={(e) => updateConfig('general', 'timezone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                checked={config.general.maintenanceMode}
                onChange={(e) => updateConfig('general', 'maintenanceMode', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                Enable Maintenance Mode
              </label>
            </div>
          </div>

          {config.general.maintenanceMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maintenance Message
              </label>
              <textarea
                value={config.general.maintenanceMessage}
                onChange={(e) => updateConfig('general', 'maintenanceMessage', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => handleSaveConfig('general')} disabled={saving}>
              Save General Settings
            </Button>
          </div>
        </div>
      </ConfigSection>

      {/* Storage Configuration */}
      <ConfigSection
        title="Storage Settings"
        description="File storage limits and cleanup policies"
        icon={<HardDrive className="w-5 h-5" />}
        isExpanded={expandedSections.has('storage')}
        onToggle={() => toggleSection('storage')}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max File Size
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.storage.maxFileSize / (1024 * 1024 * 1024)}
                  onChange={(e) => updateConfig('storage', 'maxFileSize', parseFloat(e.target.value) * 1024 * 1024 * 1024)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  GB
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Storage Per User
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.storage.maxStoragePerUser / (1024 * 1024 * 1024)}
                  onChange={(e) => updateConfig('storage', 'maxStoragePerUser', parseFloat(e.target.value) * 1024 * 1024 * 1024)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  GB
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Storage Per Channel
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.storage.maxStoragePerChannel / (1024 * 1024 * 1024)}
                  onChange={(e) => updateConfig('storage', 'maxStoragePerChannel', parseFloat(e.target.value) * 1024 * 1024 * 1024)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  GB
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed File Types
            </label>
            <div className="space-y-2">
              {[
                { label: 'Images', value: 'image/*' },
                { label: 'Videos', value: 'video/*' },
                { label: 'Audio', value: 'audio/*' },
                { label: 'PDF Documents', value: 'application/pdf' },
                { label: 'Text Files', value: 'text/*' }
              ].map((type) => (
                <label key={type.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.storage.allowedFileTypes.includes(type.value)}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...config.storage.allowedFileTypes, type.value]
                        : config.storage.allowedFileTypes.filter(t => t !== type.value);
                      updateConfig('storage', 'allowedFileTypes', newTypes);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.storage.autoCleanupEnabled}
                onChange={(e) => updateConfig('storage', 'autoCleanupEnabled', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                Enable Auto Cleanup
              </label>
            </div>
            {config.storage.autoCleanupEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cleanup After (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.storage.autoCleanupDays}
                  onChange={(e) => updateConfig('storage', 'autoCleanupDays', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => handleSaveConfig('storage')} disabled={saving}>
              Save Storage Settings
            </Button>
          </div>
        </div>
      </ConfigSection>

      {/* Security Configuration */}
      <ConfigSection
        title="Security Settings"
        description="Password policies and security configurations"
        icon={<Shield className="w-5 h-5" />}
        isExpanded={expandedSections.has('security')}
        onToggle={() => toggleSection('security')}
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Password Requirements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Length
                </label>
                <input
                  type="number"
                  min="6"
                  max="128"
                  value={config.security.passwordMinLength}
                  onChange={(e) => updateConfig('security', 'passwordMinLength', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-3 pt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.security.passwordRequireUppercase}
                    onChange={(e) => updateConfig('security', 'passwordRequireUppercase', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">Require Uppercase Letters</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.security.passwordRequireLowercase}
                    onChange={(e) => updateConfig('security', 'passwordRequireLowercase', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">Require Lowercase Letters</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.security.passwordRequireNumbers}
                    onChange={(e) => updateConfig('security', 'passwordRequireNumbers', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">Require Numbers</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.security.passwordRequireSpecialChars}
                    onChange={(e) => updateConfig('security', 'passwordRequireSpecialChars', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">Require Special Characters</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Session & Login Security</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={config.security.sessionTimeoutMinutes}
                  onChange={(e) => updateConfig('security', 'sessionTimeoutMinutes', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.security.maxLoginAttempts}
                  onChange={(e) => updateConfig('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lockout Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={config.security.lockoutDurationMinutes}
                  onChange={(e) => updateConfig('security', 'lockoutDurationMinutes', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.security.twoFactorEnabled}
              onChange={(e) => updateConfig('security', 'twoFactorEnabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Enable Two-Factor Authentication
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => handleSaveConfig('security')} disabled={saving}>
              Save Security Settings
            </Button>
          </div>
        </div>
      </ConfigSection>

      {/* Email Configuration */}
      <ConfigSection
        title="Email Settings"
        description="SMTP configuration and email notifications"
        icon={<Mail className="w-5 h-5" />}
        isExpanded={expandedSections.has('email')}
        onToggle={() => toggleSection('email')}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host
              </label>
              <input
                type="text"
                value={config.email.smtpHost}
                onChange={(e) => updateConfig('email', 'smtpHost', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Port
              </label>
              <input
                type="number"
                value={config.email.smtpPort}
                onChange={(e) => updateConfig('email', 'smtpPort', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Username
              </label>
              <input
                type="text"
                value={config.email.smtpUser}
                onChange={(e) => updateConfig('email', 'smtpUser', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.smtpPassword ? 'text' : 'password'}
                  value={config.email.smtpPassword}
                  onChange={(e) => updateConfig('email', 'smtpPassword', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('smtpPassword')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.smtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email
              </label>
              <input
                type="email"
                value={config.email.fromEmail}
                onChange={(e) => updateConfig('email', 'fromEmail', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={config.email.fromName}
                onChange={(e) => updateConfig('email', 'fromName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.email.emailNotificationsEnabled}
              onChange={(e) => updateConfig('email', 'emailNotificationsEnabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Enable Email Notifications
            </label>
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={handleTestEmail} disabled={saving}>
              Send Test Email
            </Button>
            <Button onClick={() => handleSaveConfig('email')} disabled={saving}>
              Save Email Settings
            </Button>
          </div>
        </div>
      </ConfigSection>

      {/* System Information */}
      <ConfigSection
        title="System Information"
        description="Current system status and information"
        icon={<Info className="w-5 h-5" />}
        isExpanded={expandedSections.has('system')}
        onToggle={() => toggleSection('system')}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400 mr-2" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">System Status</p>
                <div className="space-y-1">
                  <p>• Application: Running</p>
                  <p>• Database: Connected</p>
                  <p>• File Storage: Operational</p>
                  <p>• Email Service: {config.email.emailNotificationsEnabled ? 'Configured' : 'Not Configured'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Configuration Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">General:</span>
                  <span className="text-green-600">✓ Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage:</span>
                  <span className="text-green-600">✓ Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security:</span>
                  <span className="text-green-600">✓ Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className={config.email.smtpHost ? "text-green-600" : "text-yellow-600"}>
                    {config.email.smtpHost ? "✓ Configured" : "⚠ Incomplete"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Backup Database
                </Button>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Logs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ConfigSection>
    </div>
  );
};

export default SystemConfiguration;