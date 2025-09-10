import React from 'react';
import { useRouter } from 'next/router';
import { Shield, FileCheck, Users, ArrowRight, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const PublicVerifyPage: React.FC = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/register');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  return (
    <Layout title="Certificate Verification - Degree Defenders">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary-100 rounded-full">
              <Shield className="h-12 w-12 text-primary-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
            Verify Academic Certificates
          </h1>
          <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
            Instantly verify the authenticity of academic certificates using our advanced 
            blockchain-powered verification system. Secure, fast, and reliable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleGetStarted} size="lg" className="px-8">
              Get Started
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button onClick={handleSignIn} variant="outline" size="lg" className="px-8">
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center p-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-success-100 rounded-full">
                <FileCheck className="h-8 w-8 text-success-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Multiple Verification Methods</h3>
            <p className="text-secondary-600">
              Verify certificates through manual entry, file upload, or QR code scanning
            </p>
          </Card>

          <Card className="text-center p-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary-100 rounded-full">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Blockchain Security</h3>
            <p className="text-secondary-600">
              Advanced blockchain technology ensures tamper-proof verification results
            </p>
          </Card>

          <Card className="text-center p-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-warning-100 rounded-full">
                <Users className="h-8 w-8 text-warning-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Trusted by Institutions</h3>
            <p className="text-secondary-600">
              Used by universities and employers worldwide for reliable verification
            </p>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-secondary-900 mb-12">
            How Certificate Verification Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  1
                </div>
              </div>
              <h4 className="font-semibold mb-2">Create Account</h4>
              <p className="text-sm text-secondary-600">
                Sign up for a free account to access verification services
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  2
                </div>
              </div>
              <h4 className="font-semibold mb-2">Upload Certificate</h4>
              <p className="text-sm text-secondary-600">
                Upload certificate image/PDF or enter details manually
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
              </div>
              <h4 className="font-semibold mb-2">AI Analysis</h4>
              <p className="text-sm text-secondary-600">
                Our AI extracts and validates certificate information
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  4
                </div>
              </div>
              <h4 className="font-semibold mb-2">Get Results</h4>
              <p className="text-sm text-secondary-600">
                Receive instant verification results with confidence score
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <Card className="p-8 mb-16">
          <h2 className="text-2xl font-bold text-center text-secondary-900 mb-8">
            Why Choose Our Verification System?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-success-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Instant Verification</h4>
                <p className="text-secondary-600">Get results in seconds, not days</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-success-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">99.9% Accuracy</h4>
                <p className="text-secondary-600">Advanced AI ensures reliable results</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-success-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Secure & Private</h4>
                <p className="text-secondary-600">Your data is encrypted and protected</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-success-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Global Recognition</h4>
                <p className="text-secondary-600">Accepted by employers worldwide</p>
              </div>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Verify Certificates?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands of users who trust our verification system
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleGetStarted} 
              variant="secondary" 
              size="lg" 
              className="px-8 bg-white text-primary-600 hover:bg-gray-50"
            >
              Create Free Account
            </Button>
            <Button 
              onClick={handleSignIn} 
              variant="outline" 
              size="lg" 
              className="px-8 border-white text-white hover:bg-white hover:text-primary-600"
            >
              Sign In to Verify
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PublicVerifyPage;
