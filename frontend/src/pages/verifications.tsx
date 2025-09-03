import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/router';
import { Search, Filter, Eye, Download, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Verifications: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Simulate loading verifications
    setTimeout(() => {
      setVerifications([
        {
          id: '1',
          verificationCode: 'VER-2024-001',
          certificateNumber: 'RU/2023/BSC/001',
          studentName: 'Rahul Kumar Singh',
          requestedBy: 'TCS Limited',
          requestorEmail: 'hr@tcs.com',
          purpose: 'Employment Verification',
          status: 'VERIFIED',
          isValid: true,
          confidenceScore: 0.95,
          verifiedAt: '2024-01-15T10:30:00Z',
          createdAt: '2024-01-15T09:00:00Z'
        },
        {
          id: '2',
          verificationCode: 'VER-2024-002',
          certificateNumber: 'RU/2022/MBA/045',
          studentName: 'Priya Sharma',
          requestedBy: 'Infosys Limited',
          requestorEmail: 'recruitment@infosys.com',
          purpose: 'Job Application',
          status: 'PENDING',
          isValid: null,
          confidenceScore: null,
          verifiedAt: null,
          createdAt: '2024-01-16T14:20:00Z'
        },
        {
          id: '3',
          verificationCode: 'VER-2024-003',
          certificateNumber: 'BIT/2023/BTECH/123',
          studentName: 'Amit Kumar',
          requestedBy: 'IIT Bombay',
          requestorEmail: 'admissions@iitb.ac.in',
          purpose: 'Masters Admission',
          status: 'FLAGGED',
          isValid: false,
          confidenceScore: 0.45,
          verifiedAt: '2024-01-17T16:45:00Z',
          createdAt: '2024-01-17T15:30:00Z'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [isAuthenticated, router]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'FLAGGED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FLAGGED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getValidityBadge = (isValid: boolean | null) => {
    if (isValid === null) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isValid ? 'Valid' : 'Invalid'}
      </span>
    );
  };

  const filteredVerifications = verifications.filter(verification => {
    const matchesSearch = verification.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         verification.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         verification.verificationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         verification.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || verification.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading verifications...</p>
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
                Verifications
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Track and manage certificate verification requests
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {verifications.filter(v => v.status === 'VERIFIED').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {verifications.filter(v => v.status === 'PENDING').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Flagged</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {verifications.filter(v => v.status === 'FLAGGED').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg font-medium text-gray-900">{verifications.length}</dd>
                  </dl>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search verifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
              >
                <option value="ALL">All Status</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="FLAGGED">Flagged</option>
              </select>
            </div>
          </div>

          {/* Verifications List */}
          <div className="mt-6">
            {filteredVerifications.length === 0 ? (
              <Card className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <AlertCircle className="h-12 w-12" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No verifications found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'Try adjusting your search or filters.'
                    : 'No verification requests have been made yet.'
                  }
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredVerifications.map((verification) => (
                  <Card key={verification.id} className="hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(verification.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(verification.status)}`}>
                            {verification.status}
                          </span>
                          {getValidityBadge(verification.isValid)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {verification.verificationCode}
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Student</h4>
                          <p className="mt-1 text-sm text-gray-900">{verification.studentName}</p>
                          <p className="text-xs text-gray-500">{verification.certificateNumber}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Requested By</h4>
                          <p className="mt-1 text-sm text-gray-900">{verification.requestedBy}</p>
                          <p className="text-xs text-gray-500">{verification.requestorEmail}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Purpose</h4>
                          <p className="mt-1 text-sm text-gray-900">{verification.purpose}</p>
                        </div>
                      </div>

                      {verification.confidenceScore && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-500">Confidence Score</h4>
                          <div className="mt-1 flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  verification.confidenceScore >= 0.8 ? 'bg-green-500' :
                                  verification.confidenceScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${verification.confidenceScore * 100}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm text-gray-600">
                              {Math.round(verification.confidenceScore * 100)}%
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Created: {new Date(verification.createdAt).toLocaleDateString()}
                          {verification.verifiedAt && (
                            <span className="ml-4">
                              Verified: {new Date(verification.verifiedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/verifications/${verification.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* Handle download report */}}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Verifications;
