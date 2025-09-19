'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, Calendar, UserCheck, Clock, 
  TrendingUp, Activity, Database, Settings,
  ChevronRight, Shield, Loader2
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalSpeakers: number;
  totalFavorites: number;
  recentUsers: number;
  adminUsers: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    // Only allow users flagged as admins
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    
    if (!isAdmin) {
      router.push('/');
      return;
    }

    fetchStats();
  }, [session, status, router]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      console.log('Dashboard - Stats API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard - Stats data received:', data);
        setStats(data);
      } else {
        console.error('Dashboard - Stats API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isAdmin = Boolean((session?.user as any)?.isAdmin);
  
  if (!isAdmin) {
    return null;
  }

  const adminCards = [
    {
      title: 'User Management',
      description: 'View and manage all registered users',
      icon: Users,
      href: '/admin/users',
      color: 'from-blue-500 to-blue-600',
      stats: stats?.totalUsers || 0,
      label: 'Total Users'
    },
    {
      title: 'Session Management',
      description: 'Manage conference sessions and schedule',
      icon: Calendar,
      href: '/admin/sessions',
      color: 'from-purple-500 to-purple-600',
      stats: stats?.totalSessions || 0,
      label: 'Total Sessions'
    },
    {
      title: 'Speaker Management',
      description: 'Manage speaker profiles and information',
      icon: UserCheck,
      href: '/admin/speakers',
      color: 'from-green-500 to-green-600',
      stats: stats?.totalSpeakers || 0,
      label: 'Total Speakers'
    },
    {
      title: 'Data Sync',
      description: 'Sync conference data from external sources',
      icon: Database,
      href: '/admin/sync',
      color: 'from-orange-500 to-orange-600',
      stats: 'Manual',
      label: 'Sync Type'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-300 mt-1">ITC Vegas 2025 Conference Management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Registered Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{stats?.adminUsers || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Admin Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{stats?.recentUsers || 0}</div>
              <div className="text-sm text-gray-600 mt-1">New This Week</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{stats?.totalFavorites || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Total Favorites</div>
            </div>
          </div>
        </div>
      </div>

      {/* Management Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Management Tools</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${card.color} text-white mb-4`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                        <p className="text-gray-600 text-sm mb-4">{card.description}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-gray-900">{card.stats}</div>
                            <div className="text-xs text-gray-500">{card.label}</div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              Export Users CSV
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
              Backup Database
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              Send Announcement
            </button>
            <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm">
              View Logs
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">System initialized - Admin dashboard ready</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">Database connected successfully</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
