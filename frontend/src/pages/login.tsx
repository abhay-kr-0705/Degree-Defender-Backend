import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, Copy, Check, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

// Demo credentials for SIH judges
const DEMO_ACCOUNTS = [
  {
    role: 'Super Admin',
    email: 'admin@degreedefenders.gov.in',
    password: 'Admin@123',
    description: 'Full system access - manage all institutions and users',
    color: 'bg-red-50 border-red-200'
  },
  {
    role: 'University Admin',
    email: 'university@degreedefenders.gov.in',
    password: 'University@123',
    description: 'Upload certificates, manage institution data',
    color: 'bg-blue-50 border-blue-200'
  },
  {
    role: 'Verifier (Employer)',
    email: 'verifier@degreedefenders.gov.in',
    password: 'Verifier@123',
    description: 'Verify certificates for hiring/recruitment',
    color: 'bg-green-50 border-green-200'
  },
  {
    role: 'Student',
    email: 'student@degreedefenders.gov.in',
    password: 'Student@123',
    description: 'View and share certificates',
    color: 'bg-purple-50 border-purple-200'
  }
];

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fillCredentials = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    toast.success('Credentials filled! Click Sign In to login.');
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await login(data.email, data.password);
      toast.success('Login successful!');
      
      // Get user from auth store after login
      const { user } = useAuthStore.getState();
      
      // Redirect based on user role
      if (user?.role === 'PUBLIC') {
        router.push('/');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <Layout title="Sign In - Degree Defenders">
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Demo Accounts */}
            <div className="space-y-4">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 mb-4">
                  🎯 SIH 2025 Demo
                </div>
                <h2 className="text-2xl font-bold text-secondary-900 mb-2">
                  Demo Accounts for Judges
                </h2>
                <p className="text-sm text-secondary-600">
                  Click any account below to auto-fill credentials
                </p>
              </div>

              <div className="space-y-3">
                {DEMO_ACCOUNTS.map((account, index) => (
                  <Card key={index} className={`${account.color} border-2 hover:shadow-md transition-shadow cursor-pointer`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <UserCircle className="h-5 w-5 text-secondary-600" />
                          <h3 className="font-semibold text-secondary-900">{account.role}</h3>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fillCredentials(account.email, account.password)}
                          className="text-xs"
                        >
                          Use This Account
                        </Button>
                      </div>
                      
                      <p className="text-xs text-secondary-600 mb-3">{account.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white bg-opacity-50 rounded px-2 py-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-secondary-500">Email</p>
                            <p className="text-sm font-mono truncate">{account.email}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(account.email, 'Email')}
                            className="ml-2 p-1 hover:bg-white rounded transition-colors"
                            title="Copy email"
                          >
                            {copiedField === 'Email' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-secondary-400" />
                            )}
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between bg-white bg-opacity-50 rounded px-2 py-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-secondary-500">Password</p>
                            <p className="text-sm font-mono">{account.password}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(account.password, 'Password')}
                            className="ml-2 p-1 hover:bg-white rounded transition-colors"
                            title="Copy password"
                          >
                            {copiedField === 'Password' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-secondary-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Note:</strong> These are demo accounts for evaluation purposes only. 
                  In production, entities must register and get verified before accessing the system.
                </p>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-secondary-900">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-sm text-secondary-600">
                  Or{' '}
                  <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
                    create a new account
                  </Link>
                </p>
              </div>

              <Card>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                leftIcon={<Mail className="h-5 w-5" />}
                placeholder="Enter your email"
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                error={errors.password?.message}
                leftIcon={<Lock className="h-5 w-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
                placeholder="Enter your password"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                loading={isLoading}
                className="w-full"
                size="lg"
              >
                Sign In
              </Button>
            </form>
          </Card>

              <div className="text-center mt-4">
                <p className="text-sm text-secondary-600">
                  Need help?{' '}
                  <Link href="/support" className="font-medium text-primary-600 hover:text-primary-500">
                    Contact Support
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;
