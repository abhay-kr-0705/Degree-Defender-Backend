import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/router';
import { Search, Filter, Upload, Eye, Download, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Certificates: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Simulate loading certificates
    setTimeout(() => {
      setCertificates([
        {
          id: '1',
          certificateNumber: 'RU/2023/BSC/001',
          studentName: 'Rahul Kumar Singh',
          course: 'Bachelor of Science in Computer Science',
          issueDate: '2023-06-15',
          status: 'VERIFIED',
          institution: 'Ranchi University',
          grade: 'First Class'
        },
        {
          id: '2',
          certificateNumber: 'RU/2022/MBA/045',
          studentName: 'Priya Sharma',
          course: 'Master of Business Administration',
          issueDate: '2022-05-20',
          status: 'PENDING',
          institution: 'Ranchi University',
          grade: 'Distinction'
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
        return <AlertCircle className="h-5 w-5 text-red-500" />;
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

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading certificates...</p>
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
                Certificates
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage and view certificate records
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button
                variant="primary"
                onClick={() => router.push('/certificates/upload')}
                className="inline-flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Certificate
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search certificates..."
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

          {/* Certificates Grid */}
          <div className="mt-6">
            {filteredCertificates.length === 0 ? (
              <Card className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <AlertCircle className="h-12 w-12" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No certificates found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by uploading your first certificate.'
                  }
                </p>
                {(!searchTerm && statusFilter === 'ALL') && (
                  <div className="mt-6">
                    <Button
                      variant="primary"
                      onClick={() => router.push('/certificates/upload')}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Certificate
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCertificates.map((certificate) => (
                  <Card key={certificate.id} className="hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getStatusIcon(certificate.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(certificate.status)}`}>
                            {certificate.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {certificate.studentName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {certificate.certificateNumber}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {certificate.course}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {certificate.institution}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">
                            Grade: {certificate.grade}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(certificate.issueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/certificates/${certificate.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* Handle download */}}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {(user?.role === 'SUPER_ADMIN' || user?.role === 'UNIVERSITY_ADMIN') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {/* Handle delete */}}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

export default Certificates;
