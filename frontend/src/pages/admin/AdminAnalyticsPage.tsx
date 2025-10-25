import React from 'react';
import Layout from '../../components/Layout';
import AnalyticsDashboard from '../../components/admin/AnalyticsDashboard';
import { Activity } from 'lucide-react';

const AdminAnalyticsPage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Activity className="w-8 h-8 mr-3 text-indigo-600" />
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-gray-600">System usage analytics and performance metrics</p>
          </div>

          <AnalyticsDashboard />
        </div>
      </div>
    </Layout>
  );
};

export default AdminAnalyticsPage;