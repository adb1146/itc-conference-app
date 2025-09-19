'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, LogOut, Sparkles } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

interface UserDashboardProps {
  activeTab?: 'favorites' | 'agenda' | 'profile' | 'chat';
}

export default function UserDashboard({ activeTab }: UserDashboardProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showPulse, setShowPulse] = useState(false);

  // Determine active tab from pathname if not provided
  const currentTab = activeTab || (
    pathname.includes('/smart-agenda') ? 'agenda' :
    pathname.includes('/profile') ? 'profile' :
    pathname.includes('/chat') ? 'chat' :
    'agenda'
  );

  // Check if user has created a Smart Agenda
  useEffect(() => {
    if (session?.user?.email) {
      const hasAgenda = localStorage.getItem(`smartAgenda_${session.user.email}`);
      if (!hasAgenda) {
        setShowPulse(true);
      }
    }
  }, [session]);

  const tabs = [
    {
      id: 'agenda',
      label: 'Smart Agenda',
      href: '/smart-agenda',
      icon: Sparkles,
      description: 'Your personalized schedule & favorites',
      highlight: showPulse
    },
    {
      id: 'profile',
      label: 'My Profile',
      href: '/profile',
      icon: User,
      description: 'Preferences & settings'
    }
  ];

  const handleSignOut = async () => {
    // Clear user-specific data from localStorage
    if (typeof window !== 'undefined') {
      // Clear all user-specific smartAgenda keys
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('smartAgenda_') || key.startsWith('userProfile_')) {
          localStorage.removeItem(key);
        }
      });

      // Also clear generic userProfile if it exists
      localStorage.removeItem('userProfile');
      localStorage.removeItem('itc-chat-history');
    }
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between py-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    currentTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {/* Pulse indicator for Smart Agenda */}
                  {tab.id === 'agenda' && showPulse && currentTab !== 'agenda' && (
                    <div className="absolute -top-1 -right-1">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                      </span>
                    </div>
                  )}
                  <Icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium flex items-center gap-1">
                      {tab.label}
                      {tab.id === 'agenda' && showPulse && currentTab !== 'agenda' && (
                        <Sparkles className="w-3 h-3 text-purple-500" />
                      )}
                    </div>
                    {currentTab === tab.id && (
                      <div className="text-xs text-gray-500">{tab.description}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex overflow-x-auto py-3 space-x-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                    currentTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {/* Mobile pulse indicator */}
                  {tab.id === 'agenda' && showPulse && currentTab !== 'agenda' && (
                    <div className="absolute -top-1 -right-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                    </div>
                  )}
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium flex items-center gap-1">
                    {tab.label}
                    {tab.id === 'agenda' && showPulse && currentTab !== 'agenda' && (
                      <Sparkles className="w-3 h-3 text-purple-500" />
                    )}
                  </span>
                </Link>
              );
            })}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}