import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/router';
import { 
  Users, 
  Building2, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Shield,
  Activity,
  Database
} from 'lucide-react';
import Card from '../components/ui/Card';

const Admin: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    // Simulate loading stats
    setTimeout(() => {
      setStats({
        overview: {
          totalCertificates: 1247,
          verifiedCertificates: 1089,
          pendingCertificates: 98,
          flaggedCertificates: 60,
          verificationRate: 87.3
        },
        verifications: {
          total: 3456,
          recent: 234,
          trends: []
        },
        anomalies: {
          total: 89,
          critical: 12,
          topTypes: [
            { type: 'Tampered Grade', count: 23 },
            { type: 'Invalid Seal', count: 18 },
            { type: 'Duplicate Certificate', count: 15 }
          ]
        },
        institutions: {
          total: 45,
          active: 42
        },
        users: {
          total: 156,
          active: 142,
          byRole: {
            'SUPER_ADMIN': 2,
            'UNIVERSITY_ADMIN': 45,
            'VERIFIER': 23,
            'PUBLIC': 86
          }
        }
      });
      setLoading(false);
    }, 1000);
  }, [isAuthenticated, user, router]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Admin Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                System overview and management controls
              </p>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Certificates</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.overview.totalCertificates}</dd>
                  </dl>
                </div>
              </div>
            </Card>
            
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.overview.verifiedCertificates}</dd>
                  </dl>
                </div>
              </div>
            </Card>
            
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Flagged</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.overview.flaggedCertificates}</dd>
                  </dl>
                </div>
              </div>
            </Card>
            
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verification Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.overview.verificationRate}%</dd>
                  </dl>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card 
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push('/admin/users')}
              >
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Manage Users</h4>
                    <p className="text-sm text-gray-500">{stats?.users.total} total users</p>
                  </div>
                </div>
              </Card>
              
              <Card 
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push('/admin/institutions')}
              >
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Institutions</h4>
                    <p className="text-sm text-gray-500">{stats?.institutions.total} institutions</p>
                  </div>
                </div>
              </Card>
              
              <Card 
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push('/admin/anomalies')}
              >
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Anomalies</h4>
                    <p className="text-sm text-gray-500">{stats?.anomalies.total} detected</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* User Distribution */}
            <Card className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">User Distribution</h3>
              <div className="space-y-3">
                {Object.entries(stats?.users.byRole || {}).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Anomaly Types */}
            <Card className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Anomaly Types</h3>
              <div className="space-y-3">
                {stats?.anomalies.topTypes.map((anomaly, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{anomaly.type}</span>
                    <span className="text-sm text-gray-900">{anomaly.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* System Health */}
          <div className="mt-8">
            <Card className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Health</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-green-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">API Status</p>
                    <p className="text-sm text-green-600">Operational</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-green-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Database</p>
                    <p className="text-sm text-green-600">Connected</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-green-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Blockchain</p>
                    <p className="text-sm text-green-600">Synced</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
