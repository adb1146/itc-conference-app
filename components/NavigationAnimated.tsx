'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Calendar, MessageCircle, Users, Map,
  Home, Brain, ChevronDown, User, Search,
  Sparkles, Clock, Star, LogOut, Settings, UserPlus, Shield,
  ExternalLink, AlertTriangle, BookOpen
} from 'lucide-react';
import ITCLogo from '../logo/ITC Concierge Logo.png';

export default function NavigationAnimated() {
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

  // Add haptic feedback for mobile
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const navItems: Array<{
    href: string;
    label: string;
    icon: typeof Home;
    requireAuth?: boolean;
    highlight?: boolean;
  }> = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/agenda', label: 'Agenda', icon: Calendar },
    { href: '/chat', label: 'AI Concierge', icon: Brain },
    { href: '/speakers', label: 'Speakers', icon: Users },
    { href: '/smart-agenda', label: 'Smart Agenda', icon: Sparkles, requireAuth: true },
    { href: '/guide', label: 'Guide', icon: BookOpen, highlight: true },
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
    triggerHaptic();
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

  const handleMenuToggle = () => {
    triggerHaptic();
    setIsOpen(!isOpen);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20 md:h-24 lg:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center">
            <div className="relative">
              <Image
                src={ITCLogo}
                alt="ITC Vegas 2025 Concierge"
                width={320}
                height={80}
                className="h-12 sm:h-14 md:h-16 lg:h-18 w-auto"
                priority
                suppressHydrationWarning
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              // Skip auth-required items if not logged in
              if (item.requireAuth && !session) return null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all min-h-[40px] whitespace-nowrap ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs lg:text-sm">{item.label}</span>
                  {item.highlight && (
                    <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-medium">
                      New
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Search Button and Dropdown */}
            <div className="relative search-container">
              <button
                onClick={handleSearchClick}
                className={`p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-h-[40px] min-w-[40px] ${
                  searchOpen ? 'bg-gray-100' : ''
                }`}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Animated Search Dropdown */}
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                  >
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
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="mt-3 max-h-96 overflow-y-auto"
                        >
                          <p className="text-xs text-gray-500 mb-2 px-1">
                            Found {searchResults.length} results
                          </p>
                          <div className="space-y-1">
                            {searchResults.map((result, index) => {
                              const Icon = getResultIcon(result.type);
                              return (
                                <motion.div
                                  key={`${result.type}-${result.id}`}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                >
                                  <Link
                                    href={result.url}
                                    onClick={() => {
                                      triggerHaptic();
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
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            {status === 'loading' ? (
              <div className="px-3 py-2 text-sm text-gray-600">Loading...</div>
            ) : session ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => {
                    triggerHaptic();
                    setUserMenuOpen(!userMenuOpen);
                  }}
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

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                    >
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
                        href="/guide"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Getting Started</span>
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>

                      {(session.user?.email === 'test@example.com' || (session.user as any)?.isAdmin) && (
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
                    </motion.div>
                  )}
                </AnimatePresence>
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
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={handleSearchClick}
              className={`p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                searchOpen ? 'bg-gray-100' : ''
              }`}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={handleMenuToggle}
              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Animated Mobile Search Dropdown */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden fixed inset-x-0 top-52 sm:top-56 bg-white shadow-lg border-t border-gray-200 z-40 search-container"
          >
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 max-h-64 overflow-y-auto"
                >
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
                            triggerHaptic();
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
                </motion.div>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu with Slide Animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden bg-white border-t border-gray-200 shadow-lg overflow-hidden"
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto"
            >
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                // Skip auth-required items if not logged in
                if (item.requireAuth && !session) return null;

                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        triggerHaptic();
                        setIsOpen(false);
                      }}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all min-h-[44px] ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      {item.highlight && (
                        <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          New
                        </span>
                      )}
                    </Link>
                  </motion.div>
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
                      onClick={() => {
                        triggerHaptic();
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-3 px-3 py-3 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                    >
                      <User className="w-5 h-5" />
                      <span>Profile Settings</span>
                    </Link>
                    <Link
                      href="/guide"
                      onClick={() => {
                        triggerHaptic();
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-3 px-3 py-3 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                    >
                      <BookOpen className="w-5 h-5" />
                      <span>Getting Started</span>
                    </Link>
                    <button
                      onClick={() => {
                        triggerHaptic();
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
                      onClick={() => {
                        triggerHaptic();
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-3 px-3 py-3 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                    >
                      <User className="w-5 h-5" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => {
                        triggerHaptic();
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-3 px-3 py-3 w-full text-left bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg transition-colors min-h-[44px]"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span>Register</span>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}