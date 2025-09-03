import React from 'react';
import Layout from '../components/layout/Layout';
import { Shield, Users, Award, Lock, Globe, CheckCircle } from 'lucide-react';

const About: React.FC = () => {
  const features = [
    {
      icon: Shield,
      title: 'Advanced Security',
      description: 'Blockchain-based verification with cryptographic validation ensures tamper-proof certificate records.'
    },
    {
      icon: Users,
      title: 'Multi-Stakeholder Platform',
      description: 'Designed for institutions, employers, government agencies, and students with role-based access control.'
    },
    {
      icon: Award,
      title: 'Legacy Support',
      description: 'Works with both new digital certificates and legacy paper certificates through OCR technology.'
    },
    {
      icon: Lock,
      title: 'Data Privacy',
      description: 'Secure handling of student information with comprehensive access control measures.'
    },
    {
      icon: Globe,
      title: 'Public Verification',
      description: 'Publicly accessible verification system for employers and admission offices.'
    },
    {
      icon: CheckCircle,
      title: 'AI-Powered Detection',
      description: 'Advanced OCR and AI algorithms detect anomalies, tampered documents, and formatting inconsistencies.'
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                About <span className="text-primary-600">Degree Defenders</span>
              </h1>
              <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                A comprehensive digital platform to authenticate and detect fake degrees and certificates issued by higher education institutions across Jharkhand.
              </p>
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">The Challenge</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Fighting Academic Fraud
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                With increasing digitization, fake degrees and forged academic certificates have become a major concern for institutions, employers, and government bodies.
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900">Current Problems</h3>
                  <ul className="mt-4 space-y-2 text-gray-600">
                    <li>• Manual verification processes causing delays</li>
                    <li>• Inconsistent verification methods</li>
                    <li>• Susceptibility to corruption and manipulation</li>
                    <li>• Lack of centralized verification system</li>
                    <li>• Difficulty in detecting sophisticated forgeries</li>
                  </ul>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900">Detection Capabilities</h3>
                  <ul className="mt-4 space-y-2 text-gray-600">
                    <li>• Tampered grades or photographs</li>
                    <li>• Forged seals or signatures</li>
                    <li>• Invalid certificate numbers</li>
                    <li>• Non-existent institutions or courses</li>
                    <li>• Duplicate or cloned documents</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Comprehensive Solution
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                Our platform combines cutting-edge technology with user-friendly design to provide a complete certificate verification solution.
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-8 md:gap-y-10">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="relative">
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.title}</p>
                      <p className="mt-2 ml-16 text-base text-gray-500">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Technology</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Built with Modern Tech Stack
              </p>
            </div>

            <div className="mt-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <h3 className="text-lg font-medium text-gray-900">Frontend</h3>
                  <p className="mt-2 text-gray-600">React.js & Next.js</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <h3 className="text-lg font-medium text-gray-900">Backend</h3>
                  <p className="mt-2 text-gray-600">Node.js & Express</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <h3 className="text-lg font-medium text-gray-900">Database</h3>
                  <p className="mt-2 text-gray-600">PostgreSQL</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <h3 className="text-lg font-medium text-gray-900">Blockchain</h3>
                  <p className="mt-2 text-gray-600">Ethereum & Infura</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Government Initiative */}
        <div className="py-16 bg-primary-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Government of Jharkhand Initiative
              </h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                This platform is developed as part of the Government of Jharkhand's commitment to preserving academic integrity and public trust in educational credentials across the state.
              </p>
              <div className="mt-8">
                <div className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-primary-100">
                  Ensuring Educational Authenticity for a Digital Jharkhand
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
