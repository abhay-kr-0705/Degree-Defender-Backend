import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="/images/logo.png" 
                alt="Degree Defenders Logo" 
                className="h-8 w-8 mr-3"
              />
              <span className="text-xl font-bold text-white">Degree Defenders</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Authenticity Validator for Academia - Secure certificate verification system 
              for the Government of Jharkhand, Department of Higher and Technical Education.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/verify" className="text-gray-300 hover:text-white transition-colors">
                  Verify Certificate
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-300 hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="/help" className="text-gray-300 hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <span className="text-gray-300">
                  📍 Ranchi, Jharkhand, India
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-gray-300">
                  📞 +91-651-XXXXXXX
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-gray-300">
                  ✉️ support@degreedefenders.gov.in
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Government of Jharkhand. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </a>
              <a href="/accessibility" className="text-gray-400 hover:text-white text-sm transition-colors">
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
