import React, { useState } from 'react';
import Layout from '../../components/Layout';
import SystemConfiguration from '../../components/admin/SystemConfiguration';
import GuestLinkCleanup from '../../components/admin/GuestLinkCleanup';
import { Settings, Trash2 } from 'lucide-react';

const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'configuration' | 'cleanup'>('configuration');

  const tabs = [
    {
      id: 'configuration' as const,
      name: 'System Configuration',
      icon: Settings,
      description: 'Configure system settings and preferences'
    },
    {
      id: 'cleanup' as const,
      name: 'Guest Link Cleanup',
      icon: Trash2,
      description: 'Manage expired and unused guest links'
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Settings className="w-8 h-8 mr-3 text-gray-600" />
              System Settings
            </h1>
            <p className="mt-2 text-gray-600">Configure system settings and manage maintenance tasks</p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'configuration' && <SystemConfiguration />}
            {activeTab === 'cleanup' && <GuestLinkCleanup />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSettingsPage;