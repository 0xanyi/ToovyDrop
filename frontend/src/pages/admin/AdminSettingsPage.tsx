import React from 'react';
import Layout from '../../components/Layout';
import SystemConfiguration from '../../components/admin/SystemConfiguration';
import { Settings } from 'lucide-react';

const AdminSettingsPage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Settings className="w-8 h-8 mr-3 text-gray-600" />
              System Settings
            </h1>
            <p className="mt-2 text-gray-600">Configure system settings and preferences</p>
          </div>

          <SystemConfiguration />
        </div>
      </div>
    </Layout>
  );
};

export default AdminSettingsPage;