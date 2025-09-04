import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  Users, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Shield,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuthStore } from '../store/authStore';
import apiClient from '../lib/api';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [timeframe, setTimeframe] = useState('30d');

  const { data: dashboardStats, isLoading } = useQuery(
    ['dashboard-stats', timeframe],
    () => apiClient.getDashboardStats(timeframe),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const { data: recentVerifications } = useQuery(
    'recent-verifications',
    () => apiClient.getVerifications({ limit: 5 }),
    {
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  );

  const { data: recentAnomalies } = useQuery(
    'recent-anomalies',
    () => apiClient.getAnomalies({ limit: 5 }),
    {
      enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'UNIVERSITY_ADMIN',
    }
  );

  const statCards = [
    {
      title: 'Total Certificates',
      value: dashboardStats?.overview.totalCertificates || 0,
      icon: <FileText className="h-8 w-8 text-primary-600" />,
      color: 'bg-primary-50 border-primary-200',
    },
    {
      title: 'Verified Certificates',
      value: dashboardStats?.overview.verifiedCertificates || 0,
      icon: <CheckCircle className="h-8 w-8 text-success-600" />,
      color: 'bg-success-50 border-success-200',
    },
    {
      title: 'Pending Verification',
      value: dashboardStats?.overview.pendingCertificates || 0,
      icon: <Clock className="h-8 w-8 text-warning-600" />,
      color: 'bg-warning-50 border-warning-200',
    },
    {
      title: 'Flagged Certificates',
      value: dashboardStats?.overview.flaggedCertificates || 0,
      icon: <XCircle className="h-8 w-8 text-danger-600" />,
      color: 'bg-danger-50 border-danger-200',
    },
  ];

  const verificationStats = [
    {
      title: 'Total Verifications',
      value: dashboardStats?.verifications.total || 0,
      subtitle: `${timeframe} period`,
    },
    {
      title: 'Recent Verifications',
      value: dashboardStats?.verifications.recent || 0,
      subtitle: 'Last 24 hours',
    },
    {
      title: 'Verification Rate',
      value: `${dashboardStats?.overview.verificationRate || 0}%`,
      subtitle: 'Success rate',
    },
  ];

  return (
    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'VERIFIER', 'STUDENT', 'PUBLIC']}>
      <Layout title="Dashboard - Degree Defenders">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-secondary-600">
            Here's an overview of your certificate verification activities
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {['7d', '30d', '90d'].map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(period)}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className={`border-2 ${stat.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-secondary-900">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {stat.icon}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Verification Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {verificationStats.map((stat, index) => (
            <Card key={index}>
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary-900 mb-1">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="text-sm font-medium text-secondary-900 mb-1">
                  {stat.title}
                </p>
                <p className="text-xs text-secondary-500">
                  {stat.subtitle}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Verifications */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-secondary-900">
                Recent Verifications
              </h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            
            {recentVerifications?.items && recentVerifications.items.length > 0 ? (
              <div className="space-y-4">
                {recentVerifications.items.map((verification: any) => (
                  <div key={verification.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-secondary-900">
                        {verification.certificate?.studentName}
                      </p>
                      <p className="text-sm text-secondary-600">
                        {verification.certificate?.certificateNumber}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {new Date(verification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {verification.isValid ? (
                        <CheckCircle className="h-5 w-5 text-success-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-danger-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        verification.isValid ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {verification.isValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
                <p className="text-secondary-600">No recent verifications</p>
              </div>
            )}
          </Card>

          {/* Recent Anomalies */}
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'UNIVERSITY_ADMIN') && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">
                  Recent Anomalies
                </h2>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
              
              {recentAnomalies?.items && recentAnomalies.items.length > 0 ? (
                <div className="space-y-4">
                  {recentAnomalies.items.map((anomaly: any) => (
                    <div key={anomaly.id} className="flex items-start space-x-3 p-4 bg-warning-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-secondary-900">
                          {anomaly.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-secondary-600">
                          {anomaly.description}
                        </p>
                        <p className="text-xs text-secondary-500">
                          Certificate: {anomaly.certificate?.certificateNumber}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        anomaly.severity === 'CRITICAL' 
                          ? 'bg-danger-100 text-danger-800'
                          : anomaly.severity === 'HIGH'
                          ? 'bg-warning-100 text-warning-800'
                          : 'bg-secondary-100 text-secondary-800'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
                  <p className="text-secondary-600">No recent anomalies detected</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex-col space-y-2">
              <FileText className="h-6 w-6" />
              <span>Upload Certificate</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
          </div>
        </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default Dashboard;
