'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Calendar, Building, Target, Heart, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  company: string | null;
  interests: string[];
  goals: string[];
}

interface Favorite {
  id: string;
  session: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    room: string;
    track: string;
    day: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.email) {
      fetchProfile();
      fetchFavorites();
    }
  }, [status, session, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/user/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-full p-3">
                  <User className="h-12 w-12 text-blue-600" />
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold">{profile.name || 'User Profile'}</h1>
                  <p className="text-blue-100">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-gray-500" />
                  Professional Information
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Company:</span>
                    <span className="font-medium">{profile.company || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium">{profile.role || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-gray-500" />
                  Conference Goals
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.goals.length > 0 ? (
                    profile.goals.map((goal, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {goal}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">No goals specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Heart className="h-5 w-5 mr-2 text-gray-500" />
                Areas of Interest
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.length > 0 ? (
                  profile.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No interests specified</span>
                )}
              </div>
            </div>

            {/* Favorite Sessions */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                Favorite Sessions ({favorites.length})
              </h2>
              {favorites.length > 0 ? (
                <div className="space-y-3">
                  {favorites.map((favorite) => (
                    <div
                      key={favorite.id}
                      className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => router.push(`/agenda?day=${favorite.session.day}`)}
                    >
                      <h3 className="font-medium text-gray-900">{favorite.session.title}</h3>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>Day {favorite.session.day} • {favorite.session.startTime} - {favorite.session.endTime}</p>
                        <p>{favorite.session.room} • {favorite.session.track}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No favorite sessions yet. Browse the agenda to add favorites!</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => router.push('/agenda')}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Browse Agenda
                </button>
                <button
                  onClick={() => router.push('/profile/edit')}
                  className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}