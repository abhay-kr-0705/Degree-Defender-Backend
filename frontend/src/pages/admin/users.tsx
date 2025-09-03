import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/router';
import { Search, Filter, UserPlus, Edit, Trash2, Shield, ShieldOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const AdminUsers: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
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
    
    // Simulate loading users
    setTimeout(() => {
      setUsers([
        {
          id: '1',
          email: 'admin@degreedefenders.gov.in',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'SUPER_ADMIN',
          isActive: true,
          emailVerified: true,
          lastLogin: '2024-01-20T10:30:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          institution: null
        },
        {
          id: '2',
          email: 'verifier@degreedefenders.gov.in',
          firstName: 'Certificate',
          lastName: 'Verifier',
          role: 'VERIFIER',
          isActive: true,
          emailVerified: true,
          lastLogin: '2024-01-19T14:20:00Z',
          createdAt: '2024-01-02T00:00:00Z',
          institution: null
        },
        {
          id: '3',
          email: 'admin@ranchiuniversity.ac.in',
          firstName: 'Ranchi University',
          lastName: 'Admin',
          role: 'UNIVERSITY_ADMIN',
          isActive: true,
          emailVerified: true,
          lastLogin: '2024-01-18T09:15:00Z',
          createdAt: '2024-01-03T00:00:00Z',
          institution: { name: 'Ranchi University' }
        },
        {
          id: '4',
          email: 'admin@bitmesra.ac.in',
          firstName: 'BIT Mesra',
          lastName: 'Admin',
          role: 'UNIVERSITY_ADMIN',
          isActive: true,
          emailVerified: true,
          lastLogin: '2024-01-17T16:45:00Z',
          createdAt: '2024-01-04T00:00:00Z',
          institution: { name: 'Birla Institute of Technology' }
        },
        {
          id: '5',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'PUBLIC',
          isActive: false,
          emailVerified: false,
          lastLogin: null,
          createdAt: '2024-01-15T12:00:00Z',
          institution: null
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [isAuthenticated, user, router]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800';
      case 'UNIVERSITY_ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'VERIFIER':
        return 'bg-green-100 text-green-800';
      case 'PUBLIC':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, isActive: !currentStatus } : u
    ));
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && user.isActive) ||
                         (statusFilter === 'INACTIVE' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
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
                User Management
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage system users and their permissions
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button
                variant="primary"
                onClick={() => {/* Handle create user */}}
                className="inline-flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldOff className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inactive</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => !u.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.role.includes('ADMIN')).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="UNIVERSITY_ADMIN">University Admin</option>
                <option value="VERIFIER">Verifier</option>
                <option value="PUBLIC">Public</option>
              </select>
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
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="mt-6">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Institution
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.institution?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {/* Handle edit */}}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                              className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                            >
                              {user.isActive ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                            </Button>
                            {user.role !== 'SUPER_ADMIN' && (
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminUsers;
