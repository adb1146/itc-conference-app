'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User, Building, Briefcase, Target, Heart, Clock,
  Save, ArrowLeft, Bell, Link as LinkIcon, Calendar,
  Star, Sparkles, MessageSquare, Settings, LogOut,
  CheckCircle, X, Loader2
} from 'lucide-react';
import UserDashboard from '@/components/UserDashboard';
import { signOut } from 'next-auth/react';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  company: string;
  organizationType: string;
  interests: string[];
  goals: string[];
  usingSalesforce: boolean;
  interestedInSalesforce: boolean;
  profile?: {
    bio: string;
    linkedinUrl: string;
    position: string;
    yearsExperience: number;
    timezone: string;
    notifications: boolean;
  };
}

const ORGANIZATION_TYPES = [
  'Carrier',
  'Broker',
  'MGA/MGU',
  'Reinsurer',
  'InsurTech',
  'Vendor/Service Provider',
  'Consultant',
  'Other'
];

const ROLES = [
  'Executive/C-Suite',
  'VP/Director',
  'Product Manager',
  'Developer/Engineer',
  'Sales/Business Development',
  'Marketing',
  'Operations',
  'Claims',
  'Underwriting',
  'Actuary',
  'Consultant',
  'Other'
];

const INTERESTS = [
  'Artificial Intelligence',
  'Machine Learning',
  'Claims Automation',
  'Underwriting Innovation',
  'Digital Distribution',
  'Customer Experience',
  'Data Analytics',
  'Cybersecurity',
  'Blockchain',
  'IoT & Telematics',
  'Climate Risk',
  'Embedded Insurance',
  'API & Integration',
  'Cloud Infrastructure',
  'RegTech & Compliance'
];

const GOALS = [
  'Learn about new technologies',
  'Network with peers',
  'Find vendors/partners',
  'Discover investment opportunities',
  'Recruit talent',
  'Share knowledge',
  'Build brand awareness',
  'Explore career opportunities'
];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    role: '',
    company: '',
    organizationType: '',
    interests: [],
    goals: [],
    usingSalesforce: false,
    interestedInSalesforce: false,
    profile: {
      bio: '',
      linkedinUrl: '',
      position: '',
      yearsExperience: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notifications: true
    }
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session) {
      fetchProfile();
    }
  }, [session, status]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const toggleGoal = (goal: string) => {
    setProfileData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">


        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* User Dashboard Navigation */}
      <UserDashboard activeTab="profile" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-purple-100 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl shadow-md">
                <User className="w-7 h-7 text-purple-600" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-normal">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">My Profile</span>
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg ${
                saving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-6 mb-8">
            <h2 className="text-xl font-normal border-b border-purple-200 pb-3">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-medium">Basic Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white/50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                  <span className="ml-2 text-xs font-normal text-gray-500">(Cannot be changed)</span>
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                  title="Email address cannot be changed for security reasons"
                />
                <p className="mt-1 text-xs text-gray-500">Your email is used for authentication and cannot be modified</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1 text-purple-600" />
                  Company
                </label>
                <input
                  type="text"
                  value={profileData.company}
                  onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white/50"
                  placeholder="Acme Insurance Co."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Position/Title
                </label>
                <input
                  type="text"
                  value={profileData.profile?.position || ''}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, position: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VP of Innovation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Type
                </label>
                <select
                  value={profileData.role}
                  onChange={(e) => setProfileData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a role</option>
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Type
                </label>
                <select
                  value={profileData.organizationType}
                  onChange={(e) => setProfileData(prev => ({ ...prev, organizationType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select organization type</option>
                  {ORGANIZATION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={profileData.profile?.yearsExperience || ''}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, yearsExperience: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <LinkIcon className="w-4 h-4 inline mr-1" />
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  value={profileData.profile?.linkedinUrl || ''}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, linkedinUrl: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio / About
              </label>
              <textarea
                value={profileData.profile?.bio || ''}
                onChange={(e) => setProfileData(prev => ({
                  ...prev,
                  profile: { ...prev.profile!, bio: e.target.value }
                }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tell us about yourself, your experience, and what you're looking to achieve at ITC Vegas..."
              />
            </div>
          </div>

          {/* Interests */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Areas of Interest
            </h2>
            <p className="text-sm text-gray-600">
              Select topics you're interested in. This helps us personalize your agenda and recommendations.
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    profileData.interests.includes(interest)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Conference Goals
            </h2>
            <p className="text-sm text-gray-600">
              What do you hope to achieve at ITC Vegas 2025?
            </p>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(goal => (
                <button
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    profileData.goals.includes(goal)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          {/* Salesforce */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Platform Information
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profileData.usingSalesforce}
                  onChange={(e) => setProfileData(prev => ({ ...prev, usingSalesforce: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700">I currently use Salesforce</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profileData.interestedInSalesforce}
                  onChange={(e) => setProfileData(prev => ({ ...prev, interestedInSalesforce: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700">I'm interested in learning about Salesforce for Insurance</span>
              </label>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Preferences
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profileData.profile?.notifications || false}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, notifications: e.target.checked }
                  }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-700">Email notifications</span>
                  <p className="text-sm text-gray-500">Receive updates about schedule changes and recommendations</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}