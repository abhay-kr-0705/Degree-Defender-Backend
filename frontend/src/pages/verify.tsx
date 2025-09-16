import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Upload, QrCode, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuthStore } from '../store/authStore';
import apiClient, { VerificationResult, QRVerificationResult } from '../lib/api';
import MobileQRScanner from '../components/ui/MobileQRScanner';

const verificationSchema = z.object({
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  studentName: z.string().min(2, 'Student name must be at least 2 characters'),
  requestedBy: z.string().min(2, 'Requestor name is required'),
  requestorEmail: z.string().email('Valid email is required'),
  purpose: z.string().optional(),
});

type VerificationForm = z.infer<typeof verificationSchema>;

const VerifyPage: React.FC = () => {
  const [verificationMethod, setVerificationMethod] = useState<'manual' | 'upload' | 'qr'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | QRVerificationResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
  });

  // Set default values from authenticated user
  useEffect(() => {
    if (user) {
      setValue('requestedBy', `${user.firstName} ${user.lastName}`);
      setValue('requestorEmail', user.email);
    }
  }, [user, setValue]);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      toast.success('Certificate uploaded successfully');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleManualVerification = async (data: VerificationForm) => {
    setIsLoading(true);
    try {
      const result = await apiClient.verifyCertificate({
        certificateNumber: data.certificateNumber,
        studentName: data.studentName,
        requestedBy: data.requestedBy,
        requestorEmail: data.requestorEmail,
        purpose: data.purpose,
      });
      
      setVerificationResult(result);
      toast.success('Certificate verification completed');
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileVerification = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a certificate first');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('certificate', uploadedFile);
      formData.append('requestedBy', user ? `${user.firstName} ${user.lastName}` : 'User');
      formData.append('requestorEmail', user?.email || '');
      formData.append('purpose', 'Certificate verification via file upload');

      const result = await apiClient.publicVerifyFile(formData);
      setVerificationResult(result);
      toast.success('Certificate verification completed');
    } catch (error: any) {
      toast.error(error.message || 'File verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRVerification = async (qrData: string) => {
    setIsLoading(true);
    try {
      const result = await apiClient.adminVerifyQRCode(qrData);
      setVerificationResult(result);
      toast.success('QR code verification completed');
    } catch (error: any) {
      toast.error(error.message || 'QR verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setUploadedFile(null);
    reset();
  };

  const getStatusIcon = (isValid: boolean | undefined) => {
    return isValid ? (
      <CheckCircle className="h-8 w-8 text-success-600" />
    ) : (
      <XCircle className="h-8 w-8 text-danger-600" />
    );
  };

  const getStatusColor = (isValid: boolean | undefined) => {
    return isValid ? 'border-success-200 bg-success-50' : 'border-danger-200 bg-danger-50';
  };

  const getVerificationStatus = (result: VerificationResult | QRVerificationResult) => {
    if ('verification' in result) {
      return result.verification;
    } else if ('qrVerification' in result) {
      return {
        isValid: result.qrVerification.isValid,
        confidenceScore: result.qrVerification.blockchainValid ? 100 : 50,
        flaggedReasons: result.qrVerification.blockchainValid ? [] : ['Blockchain verification failed'],
        verifiedAt: result.qrVerification.qrTimestamp
      };
    }
    return { isValid: false, confidenceScore: 0, flaggedReasons: ['Unknown verification type'], verifiedAt: '' };
  };

  const getVerificationCode = (result: VerificationResult | QRVerificationResult) => {
    if ('verificationCode' in result) {
      return result.verificationCode;
    }
    return `QR-${Date.now()}`;
  };

  return (
    <ProtectedRoute fallbackPath="/login">
      <Layout title="Verify Certificate - Degree Defenders">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
            Certificate Verification
          </h1>
          <p className="text-xl text-secondary-600">
            Verify the authenticity of academic certificates instantly
          </p>
        </div>

        {!verificationResult ? (
          <>
            {/* Verification Method Selection */}
            <Card className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Choose Verification Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setVerificationMethod('manual')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    verificationMethod === 'manual'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <Search className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                  <div className="font-medium">Manual Entry</div>
                  <div className="text-sm text-secondary-600">Enter certificate details</div>
                </button>

                <button
                  onClick={() => setVerificationMethod('upload')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    verificationMethod === 'upload'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                  <div className="font-medium">Upload File</div>
                  <div className="text-sm text-secondary-600">Upload certificate image/PDF</div>
                </button>

                <button
                  onClick={() => setVerificationMethod('qr')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    verificationMethod === 'qr'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <QrCode className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                  <div className="font-medium">QR Code</div>
                  <div className="text-sm text-secondary-600">Scan certificate QR code</div>
                </button>
              </div>
            </Card>

            {/* Manual Verification Form */}
            {verificationMethod === 'manual' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Enter Certificate Details</h2>
                <form onSubmit={handleSubmit(handleManualVerification)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Certificate Number"
                      {...register('certificateNumber')}
                      error={errors.certificateNumber?.message}
                      placeholder="Enter certificate number"
                    />
                    <Input
                      label="Student Name"
                      {...register('studentName')}
                      error={errors.studentName?.message}
                      placeholder="Enter student full name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Requested By"
                      {...register('requestedBy')}
                      error={errors.requestedBy?.message}
                      placeholder="Your name or organization"
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      {...register('requestorEmail')}
                      error={errors.requestorEmail?.message}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <Input
                    label="Purpose (Optional)"
                    {...register('purpose')}
                    error={errors.purpose?.message}
                    placeholder="Reason for verification (e.g., employment, admission)"
                  />

                  <Button
                    type="submit"
                    loading={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Verify Certificate
                  </Button>
                </form>
              </Card>
            )}

            {/* File Upload */}
            {verificationMethod === 'upload' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Upload Certificate</h2>
                
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-secondary-300 hover:border-secondary-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-secondary-400" />
                  {uploadedFile ? (
                    <div>
                      <p className="text-lg font-medium text-secondary-900 mb-2">
                        {uploadedFile.name}
                      </p>
                      <p className="text-sm text-secondary-600">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-secondary-900 mb-2">
                        {isDragActive ? 'Drop the file here' : 'Drag & drop certificate here'}
                      </p>
                      <p className="text-sm text-secondary-600">
                        or click to browse (PDF, JPG, PNG, TIFF up to 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {uploadedFile && (
                  <div className="mt-6">
                    <Button
                      onClick={handleFileVerification}
                      loading={isLoading}
                      className="w-full"
                      size="lg"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Process Certificate
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* QR Code Scanner */}
            {verificationMethod === 'qr' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Scan QR Code</h2>
                <MobileQRScanner
                  onScan={handleQRVerification}
                  onError={(error) => {
                    toast.error(error);
                    setVerificationMethod('manual');
                  }}
                  onClose={() => setVerificationMethod('manual')}
                />
              </Card>
            )}
          </>
        ) : (
          /* Verification Results */
          <Card className={`border-2 ${getStatusColor(getVerificationStatus(verificationResult).isValid)}`}>
            <div className="text-center mb-6">
              {getStatusIcon(getVerificationStatus(verificationResult).isValid)}
              <h2 className="text-2xl font-bold mt-4 mb-2">
                {getVerificationStatus(verificationResult).isValid ? 'Certificate Verified' : 'Verification Failed'}
              </h2>
              <p className="text-lg text-secondary-600">
                Confidence Score: {getVerificationStatus(verificationResult).confidenceScore}%
              </p>
            </div>

            {/* Certificate Details */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Certificate Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-secondary-600">Certificate Number</div>
                  <div className="font-medium">{verificationResult.certificate?.certificateNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600">Student Name</div>
                  <div className="font-medium">{verificationResult.certificate?.studentName}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600">Course</div>
                  <div className="font-medium">{verificationResult.certificate?.course}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600">Passing Year</div>
                  <div className="font-medium">{verificationResult.certificate?.passingYear}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600">Institution</div>
                  <div className="font-medium">
                    {typeof verificationResult.certificate?.institution === 'string' 
                      ? verificationResult.certificate.institution 
                      : verificationResult.certificate?.institution?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600">Issue Date</div>
                  <div className="font-medium">
                    {verificationResult.certificate?.dateOfIssue 
                      ? new Date(verificationResult.certificate.dateOfIssue).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Code */}
            <div className="bg-secondary-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-secondary-600 mb-1">Verification Code</div>
              <div className="font-mono text-lg font-medium">{getVerificationCode(verificationResult)}</div>
              <div className="text-sm text-secondary-500 mt-1">
                Save this code for future reference
              </div>
            </div>

            {/* Flagged Reasons */}
            {getVerificationStatus(verificationResult).flaggedReasons?.length > 0 && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-5 w-5 text-warning-600 mr-2" />
                  <div className="font-medium text-warning-800">Issues Detected</div>
                </div>
                <ul className="list-disc list-inside text-sm text-warning-700">
                  {getVerificationStatus(verificationResult).flaggedReasons.map((reason: string, index: number) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={resetVerification} variant="outline" className="w-full">
              Verify Another Certificate
            </Button>
          </Card>
        )}
      </div>
    </Layout>
    </ProtectedRoute>
  );
};

export default VerifyPage;
