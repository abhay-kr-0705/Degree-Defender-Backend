import React from 'react';
import Link from 'next/link';
import { Shield, Search, Upload, CheckCircle, Users, BarChart3, Lock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <Search className="h-8 w-8 text-primary-600" />,
      title: 'Instant Verification',
      description: 'Verify certificates in seconds with our advanced OCR and AI-powered validation system.',
    },
    {
      icon: <Shield className="h-8 w-8 text-primary-600" />,
      title: 'Blockchain Security',
      description: 'Tamper-proof certificates secured by blockchain technology and cryptographic validation.',
    },
    {
      icon: <Upload className="h-8 w-8 text-primary-600" />,
      title: 'Easy Upload',
      description: 'Simple drag-and-drop interface for institutions to upload and manage certificates.',
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-primary-600" />,
      title: 'Anomaly Detection',
      description: 'Advanced AI algorithms detect forged documents, tampered grades, and suspicious patterns.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary-600" />,
      title: 'Multi-Role Access',
      description: 'Role-based access for institutions, verifiers, administrators, and the public.',
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary-600" />,
      title: 'Analytics Dashboard',
      description: 'Comprehensive reporting and analytics for monitoring verification trends and fraud detection.',
    },
  ];

  const stats = [
    { label: 'Certificates Verified', value: '50,000+' },
    { label: 'Institutions Connected', value: '200+' },
    { label: 'Fraud Cases Detected', value: '1,500+' },
    { label: 'Verification Accuracy', value: '99.8%' },
  ];

  return (
    <Layout title="Degree Defenders - Secure Certificate Verification">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 rounded-full text-blue-200 text-sm font-medium mb-8 border border-blue-400/30">
              <Shield className="h-4 w-4 mr-2" />
              Government of Jharkhand Initiative
            </div>
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/images/logo.png" 
                alt="Degree Defenders Logo" 
                className="h-16 w-16 md:h-20 md:w-20 mr-4"
              />
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent leading-relaxed pb-3">
                Degree Defenders
              </h1>
            </div>
            <p className="text-xl md:text-2xl mb-4 text-slate-200 max-w-4xl mx-auto font-light">
              Advanced Certificate Verification System
            </p>
            <p className="text-lg mb-10 text-slate-300 max-w-3xl mx-auto">
              Blockchain-powered authenticity validation for academic credentials with AI-driven fraud detection
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 px-8 py-4"
                onClick={() => window.location.href = '/verify'}
              >
                <Search className="h-5 w-5 mr-2" />
                Verify Certificate Now
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-4"
                onClick={() => window.location.href = '/login'}
              >
                Institution Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Platform Statistics</h2>
            <p className="text-slate-600">Real-time data from our verification network</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-100">
                <div className="text-4xl md:text-5xl font-extrabold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-3">
                  {stat.value}
                </div>
                <div className="text-slate-600 font-semibold text-sm uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Why Choose Degree Defenders?
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Our comprehensive solution addresses all aspects of certificate verification with cutting-edge technology
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-secondary-600">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-secondary-600">
              Simple, secure, and reliable verification process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Upload Certificate</h3>
              <p className="text-secondary-600">
                Upload a scanned copy or photo of the certificate you want to verify
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. AI Analysis</h3>
              <p className="text-secondary-600">
                Our AI extracts data and cross-references with institutional databases
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Get Results</h3>
              <p className="text-secondary-600">
                Receive instant verification results with confidence score and detailed report
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-secondary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Enterprise-Grade Security
              </h2>
              <p className="text-xl text-secondary-300 mb-8">
                Your data is protected with military-grade encryption and blockchain technology
              </p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Lock className="h-5 w-5 text-primary-400 mr-3" />
                  <span>End-to-end encryption</span>
                </li>
                <li className="flex items-center">
                  <Lock className="h-5 w-5 text-primary-400 mr-3" />
                  <span>Blockchain immutability</span>
                </li>
                <li className="flex items-center">
                  <Lock className="h-5 w-5 text-primary-400 mr-3" />
                  <span>Role-based access control</span>
                </li>
                <li className="flex items-center">
                  <Lock className="h-5 w-5 text-primary-400 mr-3" />
                  <span>Audit trail logging</span>
                </li>
              </ul>
            </div>
            <div className="text-center">
              <div className="w-64 h-64 bg-primary-600 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-32 w-32 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Secure Academic Credentials Today
          </h2>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Join the fight against academic fraud with our government-backed verification system
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-xl"
              onClick={() => window.location.href = '/register'}
            >
              Register Institution
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-blue-900"
              onClick={() => window.location.href = '/verify'}
            >
              Verify Certificate
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
