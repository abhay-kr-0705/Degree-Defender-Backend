import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, Shield, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    if (router.pathname !== '/') {
      router.push('/');
    }
  };

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Verify Certificate', href: '/verify' },
    { name: 'About', href: '/about' },
  ];

  const authenticatedNavigation = [
    ...(user?.role !== 'PUBLIC' ? [{ name: 'Dashboard', href: '/dashboard' }] : []),
    { name: 'Certificates', href: '/certificates' },
    { name: 'Verifications', href: '/verifications' },
  ];

  const adminNavigation = [
    { name: 'Admin', href: '/admin' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Institutions', href: '/admin/institutions' },
  ];

  const currentNavigation = isAuthenticated 
    ? [...navigation, ...authenticatedNavigation, ...(user?.role === 'SUPER_ADMIN' ? adminNavigation : [])]
    : navigation;

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center cursor-pointer" onClick={() => {
              if (router.pathname !== '/') {
                router.push('/');
              }
            }}>
              <img 
                src="/images/logo.png" 
                alt="Degree Defenders Logo" 
                className="h-10 w-10 mr-3"
              />
              <span className="text-xl font-bold text-secondary-900">Degree Defenders</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {currentNavigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  if (router.pathname !== item.href) {
                    router.push(item.href);
                  }
                }}
                className={`text-sm font-medium transition-colors ${
                  router.pathname === item.href
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-secondary-700 hover:text-primary-600'
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-medium text-secondary-700 hover:text-primary-600"
                >
                  <User className="h-5 w-5" />
                  <span>{user?.firstName} {user?.lastName}</span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        if (router.pathname !== '/profile') {
                          router.push('/profile');
                        }
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (router.pathname !== '/login') {
                      router.push('/login');
                    }
                  }}
                >
                  Sign In
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => {
                    if (router.pathname !== '/register') {
                      router.push('/register');
                    }
                  }}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-secondary-700 hover:text-primary-600"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {currentNavigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    if (router.pathname !== item.href) {
                      router.push(item.href);
                    }
                    setIsMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md ${
                    router.pathname === item.href
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-secondary-700 hover:text-primary-600 hover:bg-secondary-50'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {/* Mobile user menu */}
            <div className="pt-4 pb-3 border-t border-secondary-200">
              {isAuthenticated ? (
                <div className="px-2 space-y-1">
                  <div className="px-3 py-2">
                    <div className="text-base font-medium text-secondary-800">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-sm text-secondary-500">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (router.pathname !== '/profile') {
                        router.push('/profile');
                      }
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-md"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="px-2 space-y-1">
                  <button
                    onClick={() => {
                      if (router.pathname !== '/login') {
                        router.push('/login');
                      }
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-md"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      if (router.pathname !== '/register') {
                        router.push('/register');
                      }
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-md"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
