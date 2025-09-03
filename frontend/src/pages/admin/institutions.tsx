import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/router';
import { Search, Filter, Building2, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const AdminInstitutions: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    // Simulate loading institutions
    setTimeout(() => {
      setInstitutions([
        {
          id: '1',
          name: 'Ranchi University',
          code: 'RU001',
          type: 'University',
          address: 'Ranchi, Jharkhand',
          city: 'Ranchi',
          state: 'Jharkhand',
          pincode: '834008',
          phone: '+91-651-2345678',
          email: 'admin@ranchiuniversity.ac.in',
          website: 'https://ranchiuniversity.ac.in',
          establishedYear: 1960,
          isActive: true,
          isVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Birla Institute of Technology',
          code: 'BIT001',
          type: 'Institute',
          address: 'Mesra, Ranchi, Jharkhand',
          city: 'Ranchi',
          state: 'Jharkhand',
          pincode: '835215',
          phone: '+91-651-2275444',
          email: 'admin@bitmesra.ac.in',
          website: 'https://bitmesra.ac.in',
          establishedYear: 1955,
          isActive: true,
          isVerified: true,
          createdAt: '2024-01-02T00:00:00Z'
        },
        {
          id: '3',
          name: 'Jharkhand University of Technology',
          code: 'JUT001',
          type: 'University',
          address: 'Ranchi, Jharkhand',
          city: 'Ranchi',
          state: 'Jharkhand',
          pincode: '834004',
          phone: '+91-651-2234567',
          email: 'admin@jut.ac.in',
          website: 'https://jut.ac.in',
          establishedYear: 2009,
          isActive: true,
          isVerified: false,
          createdAt: '2024-01-03T00:00:00Z'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [isAuthenticated, user, router]);

  const handleToggleStatus = (institutionId: string, currentStatus: boolean) => {
    setInstitutions(institutions.map(inst => 
      inst.id === institutionId ? { ...inst, isActive: !currentStatus } : inst
    ));
  };

  const handleToggleVerification = (institutionId: string, currentStatus: boolean) => {
    setInstitutions(institutions.map(inst => 
      inst.id === institutionId ? { ...inst, isVerified: !currentStatus } : inst
    ));
  };

  const filteredInstitutions = institutions.filter(institution => {
    const matchesSearch = institution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         institution.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         institution.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && institution.isActive) ||
                         (statusFilter === 'INACTIVE' && !institution.isActive) ||
                         (statusFilter === 'VERIFIED' && institution.isVerified) ||
                         (statusFilter === 'UNVERIFIED' && !institution.isVerified);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading institutions...</p>
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
                Institution Management
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage educational institutions and their verification status
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button
                variant="primary"
                onClick={() => {/* Handle create institution */}}
                className="inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Institution
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg font-medium text-gray-900">{institutions.length}</dd>
                  </dl>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {institutions.filter(i => i.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {institutions.filter(i => i.isVerified).length}
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {institutions.filter(i => !i.isVerified).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search institutions..."
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
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="VERIFIED">Verified</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>
          </div>

          {/* Institutions Grid */}
          <div className="mt-6">
            {filteredInstitutions.length === 0 ? (
              <Card className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No institutions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by adding your first institution.'
                  }
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredInstitutions.map((institution) => (
                  <Card key={institution.id} className="hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            institution.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {institution.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            institution.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {institution.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {institution.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {institution.code} • {institution.type}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {institution.address}
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-500">
                            📧 {institution.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            📞 {institution.phone}
                          </p>
                          <p className="text-sm text-gray-500">
                            📅 Est. {institution.establishedYear}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/institutions/${institution.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(institution.id, institution.isActive)}
                            className={institution.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          >
                            {institution.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVerification(institution.id, institution.isVerified)}
                            className={institution.isVerified ? 'text-yellow-600 hover:text-yellow-700' : 'text-blue-600 hover:text-blue-700'}
                          >
                            {institution.isVerified ? '❌' : '✅'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* Handle delete */}}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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

export default AdminInstitutions;
