'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Users, 
  Tag, Building2, Briefcase, Star, ExternalLink,
  Globe, Award, TrendingUp, RefreshCw
} from 'lucide-react';

interface Speaker {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  imageUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  profileSummary?: string;
  companyProfile?: string;
  expertise?: string[];
  achievements?: string[];
  lastProfileSync?: string;
  sessions: Session[];
}

interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  track?: string;
  level?: string;
  tags: string[];
  coSpeakers: CoSpeaker[];
}

interface CoSpeaker {
  id: string;
  name: string;
  role: string;
  company: string;
}

export default function SpeakerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [fetchingProfile, setFetchingProfile] = useState(false);

  useEffect(() => {
    fetchSpeakerDetails();
    fetchFavorites();
  }, [params.id]);

  const fetchSpeakerDetails = async () => {
    try {
      const response = await fetch(`/api/speakers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSpeaker(data);
      }
    } catch (error) {
      console.error('Error fetching speaker:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        const ids = new Set<string>(data.favorites?.map((f: any) => f.sessionId as string) || []);
        setFavoriteIds(ids);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (sessionId: string) => {
    try {
      if (favoriteIds.has(sessionId)) {
        await fetch(`/api/favorites?sessionId=${sessionId}`, { method: 'DELETE' });
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(sessionId);
          return newSet;
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        setFavoriteIds(prev => new Set(prev).add(sessionId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const fetchLatestProfile = async () => {
    if (!speaker) return;
    
    setFetchingProfile(true);
    try {
      const response = await fetch(`/api/speakers/${speaker.id}/fetch-profile`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.speaker) {
          setSpeaker(prev => ({ ...prev!, ...data.speaker }));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setFetchingProfile(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDayFromTags = (tags: string[]) => {
    const dayTag = tags.find(tag => tag.startsWith('day'));
    return dayTag ? dayTag.replace('day', 'Day ') : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto pt-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Speaker not found</h2>
          <button
            onClick={() => router.push('/speakers')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Speakers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/speakers')}
          className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Speakers
        </button>

        {/* Speaker Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-3xl font-bold">
                {speaker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{speaker.name}</h1>
              <div className="flex items-center gap-4 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{speaker.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{speaker.company}</span>
                </div>
              </div>
              {speaker.bio && (
                <p className="text-gray-700 mb-4">{speaker.bio}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {speaker.sessions.length} Session{speaker.sessions.length !== 1 ? 's' : ''}
                </div>
                {speaker.linkedinUrl && (
                  <a
                    href={speaker.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    LinkedIn Profile
                  </a>
                )}
                {speaker.twitterUrl && (
                  <a
                    href={speaker.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Twitter
                  </a>
                )}
                {speaker.websiteUrl && (
                  <a
                    href={speaker.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                <button
                  onClick={fetchLatestProfile}
                  disabled={fetchingProfile}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchingProfile ? 'animate-spin' : ''}`} />
                  {fetchingProfile ? 'Fetching...' : 'Update Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        {(() => {
          // Filter out mock data
          const hasRealProfileSummary = speaker.profileSummary && 
            !speaker.profileSummary.toLowerCase().includes('mock profile') && 
            !speaker.profileSummary.toLowerCase().includes('mock data');
          
          const hasRealCompanyProfile = speaker.companyProfile && 
            !speaker.companyProfile.toLowerCase().includes('mock profile') && 
            !speaker.companyProfile.toLowerCase().includes('mock data');
          
          const hasExpertise = speaker.expertise && speaker.expertise.length > 0;
          const hasAchievements = speaker.achievements && speaker.achievements.length > 0;
          
          const hasAnyRealContent = hasRealProfileSummary || hasRealCompanyProfile || hasExpertise || hasAchievements;
          
          return (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Professional Profile</h2>
              
              {!hasAnyRealContent ? (
                <p className="text-gray-500 text-center py-8">No profile data found</p>
              ) : (
                <>
                  {/* Expertise */}
                  {hasExpertise && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Areas of Expertise
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {speaker.expertise?.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Achievements */}
                  {hasAchievements && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        Key Achievements
                      </h3>
                      <ul className="space-y-2">
                        {speaker.achievements?.map((achievement, index) => (
                          <li key={index} className="text-gray-700 flex items-start gap-2">
                            <span className="text-purple-600 mt-1">•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Professional Summary */}
                  {hasRealProfileSummary ? (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Professional Summary</h3>
                      <p className="text-gray-700 leading-relaxed">{speaker.profileSummary}</p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Professional Summary</h3>
                      <p className="text-gray-500">No data found</p>
                    </div>
                  )}
                  
                  {/* Company Profile */}
                  {hasRealCompanyProfile ? (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-green-600" />
                        About {speaker.company}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">{speaker.companyProfile}</p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-green-600" />
                        About {speaker.company}
                      </h3>
                      <p className="text-gray-500">No data found</p>
                    </div>
                  )}
                  
                  {/* Last Updated */}
                  {speaker.lastProfileSync && (
                    <div className="text-sm text-gray-500 mt-4">
                      Profile last updated: {new Date(speaker.lastProfileSync).toLocaleDateString()}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Sessions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Speaking Sessions</h2>
          
          {speaker.sessions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
              No sessions scheduled for this speaker
            </div>
          ) : (
            <div className="space-y-4">
              {speaker.sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Link
                        href={`/agenda/session/${session.id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {session.title}
                      </Link>
                      <p className="text-gray-600 mt-2 line-clamp-2">{session.description}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(session.id)}
                      className={`ml-4 p-2 rounded-lg transition-colors ${
                        favoriteIds.has(session.id)
                          ? 'text-yellow-500 bg-yellow-50'
                          : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                      }`}
                    >
                      <Star
                        className="w-5 h-5"
                        fill={favoriteIds.has(session.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  {/* Session Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{getDayFromTags(session.tags)} - {formatDate(session.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{session.location}</span>
                    </div>
                  </div>

                  {/* Co-speakers */}
                  {session.coSpeakers.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Co-speakers:</span>
                      <div className="flex flex-wrap gap-2">
                        {session.coSpeakers.map((coSpeaker) => (
                          <Link
                            key={coSpeaker.id}
                            href={`/speakers/${coSpeaker.id}`}
                            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {coSpeaker.name} ({coSpeaker.company})
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags and Track */}
                  <div className="flex flex-wrap gap-2">
                    {session.track && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {session.track}
                      </span>
                    )}
                    {session.level && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {session.level}
                      </span>
                    )}
                    {session.tags
                      .filter(tag => !tag.startsWith('day'))
                      .slice(0, 3)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                        >
                          <Tag className="w-3 h-3 inline mr-1" />
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}