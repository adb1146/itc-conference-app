'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  Menu, X, Calendar, MessageCircle, Users, Map,
  Home, Brain, ChevronDown, Bell, User, Search,
  Sparkles, Clock, Star, LogOut, Settings, UserPlus, Shield,
  ExternalLink, AlertTriangle
} from 'lucide-react';
import ITCLogo from '../logo/ITC Concierge Logo.png';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
      if (searchOpen && !(event.target as Element).closest('.search-container')) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, searchOpen]);

  // Perform global search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length > 1) {
        setSearching(true);
        try {
          const response = await fetch('/api/search/global', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery, limit: 8 })
          });

          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results || []);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const navItems: Array<{
    href: string;
    label: string;
    icon: typeof Home;
    requireAuth?: boolean;
    highlight?: boolean;
  }> = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/agenda', label: 'Conference Agenda', icon: Calendar },
    { href: '/chat', label: 'AI Concierge', icon: Brain },
    { href: '/speakers', label: 'Speakers', icon: Users },
    { href: '/smart-agenda', label: 'Smart Agenda', icon: Sparkles, requireAuth: true },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'speaker': return Users;
      case 'session': return Calendar;
      case 'track': return Map;
      case 'location': return Map;
      default: return Star;
    }
  };

  const handleSearchClick = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Function to handle sign out and clear user data
  const handleSignOut = () => {
    // Clear user-specific data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('itc-chat-history');

      // Clear all user-specific smartAgenda keys
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('smartAgenda_') || key.startsWith('userProfile_')) {
          localStorage.removeItem(key);
        }
      });

      // Also clear generic userProfile if it exists
      localStorage.removeItem('userProfile');
    }
    // Sign out
    signOut({ callbackUrl: '/' });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 sm:h-24">
          {/* Logo */}
          <Link href="/" className="min-h-[44px] flex items-center">
            <Image
              src={ITCLogo}
              alt="ITC Vegas 2025 Concierge"
              height={120}
              width={400}
              className="h-16 sm:h-18 md:h-22 lg:h-26 w-auto"
              priority
              style={{ objectFit: 'contain' }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              // Skip auth-required items if not logged in
              if (item.requireAuth && !session) return null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all min-h-[44px] ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{item.label}</span>
                  {item.highlight && (
                    <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Search Button and Dropdown */}
            <div className="relative search-container">
              <button
                onClick={handleSearchClick}
                className={`p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] ${
                  searchOpen ? 'bg-gray-100' : ''
                }`}
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Search Dropdown */}
              {searchOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search sessions, speakers, tracks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setSearchOpen(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }
                        }}
                      />
                      {searching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        </div>
                      )}
                      {searchQuery && !searching && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            searchInputRef.current?.focus();
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-3 max-h-96 overflow-y-auto">
                        <p className="text-xs text-gray-500 mb-2 px-1">
                          Found {searchResults.length} results
                        </p>
                        <div className="space-y-1">
                          {searchResults.map((result) => {
                            const Icon = getResultIcon(result.type);
                            return (
                              <Link
                                key={`${result.type}-${result.id}`}
                                href={result.url}
                                onClick={() => {
                                  setSearchOpen(false);
                                  setSearchQuery('');
                                  setSearchResults([]);
                                }}
                                className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <div className={`p-1.5 rounded-lg ${
                                  result.type === 'speaker' ? 'bg-blue-100 text-blue-600' :
                                  result.type === 'session' ? 'bg-purple-100 text-purple-600' :
                                  result.type === 'track' ? 'bg-green-100 text-green-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                    {result.title}
                                  </p>
                                  {result.description && (
                                    <p className="text-xs text-gray-500 line-clamp-1">
                                      {result.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {searchQuery.length > 1 && searchResults.length === 0 && !searching && (
                      <div className="mt-3 text-center py-4">
                        <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                        <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
                      </div>
                    )}

                    {searchQuery.length === 0 && (
                      <div className="mt-3 text-center py-4">
                        <p className="text-xs text-gray-400">
                          Start typing to search across the conference
                        </p>
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link
                          href={`/search?q=${encodeURIComponent(searchQuery)}`}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all results →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {session && (
              <button className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]">
                <Bell className="w-5 h-5" />
              </button>
            )}
            
            {/* User Menu */}
            {status === 'loading' ? (
              <div className="px-3 py-2 text-sm text-gray-600">Loading...</div>
            ) : session ? (
              <div className="relative user-menu-container">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-medium">
                      {session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">
                    {session.user?.name || session.user?.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{session.user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{session.user?.email}</p>
                    </div>
                    
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    
                    {Boolean((session.user as any)?.isAdmin) && (
                      <>
                        <div className="border-t border-gray-100 mt-1 pt-1"></div>
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </>
                    )}
                    
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/signin"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px] flex items-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all min-h-[44px] flex items-center"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu and Search */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={handleSearchClick}
              className={`p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                searchOpen ? 'bg-gray-100' : ''
              }`}
              aria-label="Search"
            >
              <Search className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {searchOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-white shadow-lg border-t border-gray-200 z-40 search-container">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search sessions, speakers, tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }
                }}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                </div>
              )}
              {searchQuery && !searching && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-64 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2 px-1">
                  Found {searchResults.length} results
                </p>
                <div className="space-y-1">
                  {searchResults.map((result) => {
                    const Icon = getResultIcon(result.type);
                    return (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.url}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className={`p-1.5 rounded-lg ${
                          result.type === 'speaker' ? 'bg-blue-100 text-blue-600' :
                          result.type === 'session' ? 'bg-purple-100 text-purple-600' :
                          result.type === 'track' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {result.title}
                          </p>
                          {result.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {result.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {searchQuery.length > 1 && searchResults.length === 0 && !searching && (
              <div className="mt-3 text-center py-4">
                <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
              </div>
            )}

            {searchQuery.length === 0 && (
              <div className="mt-3 text-center py-4">
                <p className="text-xs text-gray-400">
                  Start typing to search across the conference
                </p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all results →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              // Skip auth-required items if not logged in
              if (item.requireAuth && !session) return null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all min-h-[44px] ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.highlight && (
                    <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      NEW
                    </span>
                  )}
                </Link>
              );
            })}
            
            
            <div className="border-t border-gray-200 pt-3 mt-3">
              {session ? (
                <>
                  <div className="px-3 py-2 mb-2">
                    <p className="text-sm font-medium text-gray-900">{session.user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{session.user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-3 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  >
                    <User className="w-5 h-5" />
                    <span>Profile Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center space-x-3 px-3 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px]"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-3 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  >
                    <User className="w-5 h-5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-3 w-full text-left bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg transition-colors min-h-[44px]"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Register</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
