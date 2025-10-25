import React from 'react';
import Layout from '../../components/Layout';
import FileAdministration from '../../components/admin/FileAdministration';
import { FileText } from 'lucide-react';

const AdminFilesPage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-purple-600" />
              File Management
            </h1>
            <p className="mt-2 text-gray-600">Monitor and manage all files across channels</p>
          </div>

          <FileAdministration />
        </div>
      </div>
    </Layout>
  );
};

export default AdminFilesPage;