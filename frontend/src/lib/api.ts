import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Production ready - debug logging removed

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = Cookies.get('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          Cookies.remove('auth_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        } else if (error.response?.status === 403) {
          // Forbidden - user doesn't have permission
          toast.error('Access denied. Please check your permissions.');
        } else if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.');
        } else if (error.response?.data?.error) {
          toast.error(error.response.data.error);
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.request<ApiResponse<T>>(config);
      return response.data.data;
    } catch (error: any) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Request failed:', {
          url: config.url,
          baseURL: this.instance.defaults.baseURL,
          error: error.response?.data || error.message
        });
      }
      throw new Error(error.response?.data?.message || error.response?.data?.error || 'Request failed');
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>({
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    });
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>({
      method: 'GET',
      url: '/auth/me',
    });
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>({
      method: 'PUT',
      url: '/auth/profile',
      data,
    });
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    return this.request<void>({
      method: 'POST',
      url: '/auth/change-password',
      data,
    });
  }

  // Certificate methods
  async uploadCertificate(formData: FormData): Promise<Certificate> {
    return this.request<Certificate>({
      method: 'POST',
      url: '/certificates/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getCertificates(params?: CertificateFilters): Promise<PaginatedResponse<Certificate>> {
    return this.request<PaginatedResponse<Certificate>>({
      method: 'GET',
      url: '/certificates',
      params,
    });
  }

  async getCertificate(id: string): Promise<Certificate> {
    return this.request<Certificate>({
      method: 'GET',
      url: `/certificates/${id}`,
    });
  }

  async updateCertificateStatus(id: string, status: string, notes?: string): Promise<Certificate> {
    return this.request<Certificate>({
      method: 'PUT',
      url: `/certificates/${id}/status`,
      data: { status, notes },
    });
  }

  async deleteCertificate(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `/certificates/${id}`,
    });
  }

  // Verification methods
  async verifyCertificate(data: VerificationRequest): Promise<VerificationResult> {
    return this.request<VerificationResult>({
      method: 'POST',
      url: '/verifications/verify',
      data,
    });
  }

  async getVerification(verificationCode: string): Promise<Verification> {
    return this.request<Verification>({
      method: 'GET',
      url: `/verifications/${verificationCode}`,
    });
  }

  async getVerifications(params?: VerificationFilters): Promise<PaginatedResponse<Verification>> {
    return this.request<PaginatedResponse<Verification>>({
      method: 'GET',
      url: '/verifications',
      params,
    });
  }

  async verifyQRCode(qrData: string): Promise<QRVerificationResult> {
    return this.request<QRVerificationResult>({
      method: 'POST',
      url: '/verifications/qr-verify',
      data: { qrData },
    });
  }

  // Institution methods
  async getInstitutions(params?: InstitutionFilters): Promise<PaginatedResponse<Institution>> {
    return this.request<PaginatedResponse<Institution>>({
      method: 'GET',
      url: '/institutions',
      params,
    });
  }

  async getInstitution(id: string): Promise<Institution> {
    return this.request<Institution>({
      method: 'GET',
      url: `/institutions/${id}`,
    });
  }

  async createInstitution(data: CreateInstitutionData): Promise<Institution> {
    return this.request<Institution>({
      method: 'POST',
      url: '/institutions',
      data,
    });
  }

  async updateInstitution(id: string, data: Partial<Institution>): Promise<Institution> {
    return this.request<Institution>({
      method: 'PUT',
      url: `/institutions/${id}`,
      data,
    });
  }

  // Admin methods
  async getDashboardStats(timeframe?: string): Promise<DashboardStats> {
    return this.request<DashboardStats>({
      method: 'GET',
      url: '/admin/dashboard',
      params: { timeframe },
    });
  }

  async getAnomalies(params?: AnomalyFilters): Promise<PaginatedResponse<Anomaly>> {
    return this.request<PaginatedResponse<Anomaly>>({
      method: 'GET',
      url: '/admin/anomalies',
      params,
    });
  }

  async getUsers(params?: UserFilters): Promise<PaginatedResponse<User>> {
    return this.request<PaginatedResponse<User>>({
      method: 'GET',
      url: '/admin/users',
      params,
    });
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    return this.request<User>({
      method: 'PUT',
      url: `/admin/users/${id}/status`,
      data: { isActive },
    });
  }

  async getVerificationTrends(params?: TrendParams): Promise<TrendData> {
    return this.request<TrendData>({
      method: 'GET',
      url: '/admin/reports/verification-trends',
      params,
    });
  }

  // Public methods
  async publicVerify(data: PublicVerificationRequest): Promise<VerificationResult> {
    return this.request<VerificationResult>({
      method: 'POST',
      url: '/public/verify',
      data,
    });
  }

  async getPublicInstitutions(): Promise<Institution[]> {
    return this.request<Institution[]>({
      method: 'GET',
      url: '/public/institutions',
    });
  }
}

// Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
  institutionId?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  institution?: Institution;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentName: string;
  fatherName?: string;
  motherName?: string;
  rollNumber?: string;
  registrationNumber?: string;
  course: string;
  branch?: string;
  passingYear: number;
  grade?: string;
  cgpa?: number;
  percentage?: number;
  dateOfIssue: string;
  dateOfCompletion?: string;
  type: string;
  status: string;
  originalFileName?: string;
  ocrConfidence?: number;
  blockchainHash?: string;
  qrCode?: string;
  isLegacy: boolean;
  verificationCount: number;
  lastVerified?: string;
  createdAt: string;
  updatedAt: string;
  institution: Institution;
  anomalies?: Anomaly[];
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  establishedYear: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface Verification {
  id: string;
  verificationCode: string;
  status: string;
  requestedBy: string;
  requestorEmail: string;
  purpose?: string;
  isValid?: boolean;
  confidenceScore?: number;
  verificationNotes?: string;
  flaggedReasons: string[];
  verifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
  certificate: Certificate;
}

export interface Anomaly {
  id: string;
  type: string;
  severity: string;
  description: string;
  detectionMethod: string;
  confidence: number;
  createdAt: string;
  certificate: Certificate;
}

export interface VerificationRequest {
  certificateId?: string;
  certificateNumber?: string;
  studentName?: string;
  requestedBy: string;
  requestorEmail: string;
  requestorPhone?: string;
  purpose?: string;
}

export interface VerificationResult {
  verificationId: string;
  verificationCode: string;
  certificate: Partial<Certificate>;
  verification: {
    isValid: boolean;
    confidenceScore: number;
    flaggedReasons: string[];
    verifiedAt: string;
  };
}

export interface QRVerificationResult {
  certificate: Partial<Certificate>;
  qrVerification: {
    isValid: boolean;
    blockchainValid: boolean;
    qrTimestamp: string;
  };
}

export interface DashboardStats {
  overview: {
    totalCertificates: number;
    verifiedCertificates: number;
    pendingCertificates: number;
    flaggedCertificates: number;
    verificationRate: number;
  };
  verifications: {
    total: number;
    recent: number;
    trends: Array<{
      date: string;
      count: number;
      type: string;
    }>;
  };
  anomalies: {
    total: number;
    critical: number;
    topTypes: Array<{
      type: string;
      count: number;
      severity: string;
    }>;
  };
  institutions: {
    total: number;
    active: number;
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface CertificateFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  institutionId?: string;
  search?: string;
}

export interface VerificationFilters {
  page?: number;
  limit?: number;
  status?: string;
  institutionId?: string;
}

export interface InstitutionFilters {
  page?: number;
  limit?: number;
  type?: string;
  isActive?: boolean;
  search?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  institutionId?: string;
  search?: string;
}

export interface AnomalyFilters {
  page?: number;
  limit?: number;
  severity?: string;
  type?: string;
  institutionId?: string;
}

export interface TrendParams {
  timeframe?: string;
  groupBy?: string;
}

export interface TrendData {
  timeframe: string;
  groupBy: string;
  trends: Array<{
    date: string;
    count: number;
    type: string;
  }>;
  summary: {
    totalVerifications: number;
    validVerifications: number;
    averageConfidence: number;
  };
}

export interface CreateInstitutionData {
  name: string;
  code: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  establishedYear: number;
}

export interface PublicVerificationRequest {
  certificateNumber: string;
  studentName: string;
  requestedBy: string;
  requestorEmail: string;
  purpose?: string;
}

const apiClient = new ApiClient();
export default apiClient;
