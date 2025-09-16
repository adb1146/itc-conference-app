'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Star, Calendar, User, MessageSquare, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface UserDashboardProps {
  activeTab?: 'favorites' | 'agenda' | 'profile' | 'chat';
}

export default function UserDashboard({ activeTab }: UserDashboardProps) {
  const pathname = usePathname();

  // Determine active tab from pathname if not provided
  const currentTab = activeTab || (
    pathname.includes('/favorites') ? 'favorites' :
    pathname.includes('/smart-agenda') ? 'agenda' :
    pathname.includes('/profile') ? 'profile' :
    pathname.includes('/chat') ? 'chat' :
    'favorites'
  );

  const tabs = [
    {
      id: 'favorites',
      label: 'My Favorites',
      href: '/favorites',
      icon: Star,
      description: 'Sessions & speakers you\'ve saved'
    },
    {
      id: 'agenda',
      label: 'Smart Agenda',
      href: '/smart-agenda',
      icon: Calendar,
      description: 'Your personalized schedule'
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    currentTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium">{tab.label}</div>
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                    currentTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
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