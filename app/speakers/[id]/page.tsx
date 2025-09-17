'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users,
  Tag, Building2, Briefcase, Star, ExternalLink,
  Globe, Award, TrendingUp, RefreshCw, MessageCircle, Camera
} from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';

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
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Define fetchLatestProfile first using useCallback
  const fetchLatestProfile = useCallback(async () => {
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
  }, [speaker]);

  const generateAvatar = async () => {
    if (!speaker) return;

    setFetchingImage(true);
    try {
      const response = await fetch(`/api/speakers/${speaker.id}/fetch-gravatar`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          setSpeaker(prev => ({ ...prev!, imageUrl: data.imageUrl }));
        }
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
    } finally {
      setFetchingImage(false);
    }
  };

  const uploadImageUrl = async () => {
    if (!speaker || !imageUrlInput) return;

    setFetchingImage(true);
    try {
      const response = await fetch(`/api/speakers/${speaker.id}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrlInput })
      });

      if (response.ok) {
        const data = await response.json();
        setSpeaker(prev => ({ ...prev!, imageUrl: imageUrlInput }));
        setShowImageUpload(false);
        setImageUrlInput('');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setFetchingImage(false);
    }
  };

  useEffect(() => {
    fetchSpeakerDetails();
    fetchFavorites();
  }, [params.id]);

  // Auto-fetch profile if missing
  useEffect(() => {
    if (speaker && !loading && !hasAutoFetched && !fetchingProfile) {
      // Check if profile data is missing or empty
      const hasRealProfileSummary = speaker.profileSummary &&
        speaker.profileSummary.trim() !== '' &&
        !speaker.profileSummary.toLowerCase().includes('mock profile') &&
        !speaker.profileSummary.toLowerCase().includes('mock data') &&
        !speaker.profileSummary.toLowerCase().includes('no data found');

      const hasRealCompanyProfile = speaker.companyProfile &&
        speaker.companyProfile.trim() !== '' &&
        !speaker.companyProfile.toLowerCase().includes('mock profile') &&
        !speaker.companyProfile.toLowerCase().includes('mock data') &&
        !speaker.companyProfile.toLowerCase().includes('no data found');

      // Auto-fetch if EITHER profile summary OR company profile is missing
      // (don't check expertise as it might have been auto-populated with minimal data)
      if (!hasRealProfileSummary || !hasRealCompanyProfile) {
        console.log('Auto-fetching profile for:', speaker.name);
        console.log('  Profile Summary:', speaker.profileSummary || 'null');
        console.log('  Company Profile:', speaker.companyProfile || 'null');
        setHasAutoFetched(true);
        fetchLatestProfile();
      }
    }
  }, [speaker, loading, hasAutoFetched, fetchingProfile]);

  const fetchSpeakerDetails = async () => {
    try {
      const response = await fetch(`/api/speakers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched speaker data:', {
          name: data.name,
          profileSummary: data.profileSummary ? data.profileSummary.substring(0, 50) : null,
          companyProfile: data.companyProfile ? data.companyProfile.substring(0, 50) : null,
          expertise: data.expertise
        });
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

  const askAIAboutSpeaker = () => {
    if (!speaker) return;

    // Prepare speaker data for AI context
    const speakerData = {
      id: speaker.id,
      name: speaker.name,
      role: speaker.role,
      company: speaker.company,
      bio: speaker.bio,
      expertise: speaker.expertise,
      achievements: speaker.achievements,
      sessions: speaker.sessions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        track: s.track,
        tags: s.tags
      }))
    };

    // Create the query message
    const query = `Tell me everything about ${speaker.name} from ${speaker.company}. What are their key areas of expertise? What sessions are they speaking at during ITC Vegas 2025? What should I know about their background and experience?`;

    // Store speaker context in sessionStorage for additional context
    sessionStorage.setItem('askAIContext', JSON.stringify({
      type: 'speaker',
      data: speakerData,
      query: query
    }));

    // Navigate to home page (AI Concierge) with the message
    router.push(`/?message=${encodeURIComponent(query)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white p-4">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="animate-pulse">
            <div className="h-8 bg-purple-200 rounded-xl w-1/3 mb-4"></div>
            <div className="h-32 bg-purple-100 rounded-xl mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-purple-100 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white p-4">
        <div className="max-w-6xl mx-auto pt-8 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">Speaker not found</h2>
          <button
            onClick={() => router.push('/speakers')}
            className="text-purple-600 hover:text-purple-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Speakers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/speakers')}
          className="mb-6 text-purple-600 hover:text-purple-700 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Speakers
        </button>

        {/* AI Research Status Message */}
        {fetchingProfile && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className="relative">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping absolute"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  AI agents are conducting deep research on {speaker.name}
                </p>
                <p className="text-xs text-gray-700 mb-3">
                  We're searching LinkedIn, company websites, news articles, and industry publications to build a comprehensive profile.
                  This process typically takes 15-30 seconds as our AI analyzes multiple sources simultaneously.
                </p>
                <div className="bg-white/70 rounded-lg p-3 border border-purple-200">
                  <p className="text-xs text-gray-800 mb-2">
                    <strong className="text-purple-700">Time Savings:</strong> What takes our AI 30 seconds would require 30-60 minutes
                    of manual research across multiple websites and databases.
                  </p>
                  <p className="text-xs text-gray-700 mb-2">
                    PS Advisory specializes in implementing this type of intelligent automation for insurance companies,
                    helping teams eliminate repetitive research tasks and focus on high-value activities.
                  </p>
                  <a href="https://psadvisory.com/ai-automation" target="_blank" rel="noopener noreferrer"
                     className="text-purple-600 hover:text-purple-700 text-xs font-medium inline-flex items-center gap-1">
                    See how PS Advisory removes friction from your workflows
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Speaker Info Card */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-purple-100 p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden">
                {speaker.imageUrl ? (
                  <img
                    src={speaker.imageUrl}
                    alt={speaker.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center ${speaker.imageUrl ? 'hidden' : ''}`}>
                  <span className="text-white text-3xl font-bold">
                    {speaker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              </div>
              {/* Image Action Button */}
              {!speaker.imageUrl && (
                <button
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  disabled={fetchingImage}
                  className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Add profile picture"
                >
                  {fetchingImage ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{speaker.name}</h1>
                <FavoriteButton
                  itemId={speaker.id}
                  type="speaker"
                  showLabel={true}
                  className="ml-4"
                />
              </div>
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
              {/* Bio section - always show something */}
              <p className="text-gray-700 mb-4">
                {speaker.bio && speaker.bio !== 'Speaker' && speaker.bio !== 'TBD' ? (
                  speaker.bio
                ) : (
                  `${speaker.name} is a ${speaker.role || 'speaker'} at ${speaker.company || 'TBD'} and will be presenting at ITC Vegas 2025.`
                )}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full text-sm font-medium">
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
                  className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-gray-100 to-purple-50 hover:from-gray-200 hover:to-purple-100 text-gray-700 rounded-full text-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchingProfile ? 'animate-spin' : ''}`} />
                  {fetchingProfile ? (
                    <span className="relative group">
                      AI Researching...
                      <span className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        Our AI agents are searching multiple data sources across the web to build a comprehensive profile.
                        This deep research typically takes 15-30 seconds but saves hours of manual work.
                      </span>
                    </span>
                  ) : 'Update Profile'}
                </button>
                <button
                  onClick={askAIAboutSpeaker}
                  className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200 text-purple-700 rounded-full text-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Ask AI about this speaker
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        {(() => {
          // Filter out mock data and empty strings
          const hasRealProfileSummary = speaker.profileSummary &&
            speaker.profileSummary.trim() !== '' &&
            !speaker.profileSummary.toLowerCase().includes('mock profile') &&
            !speaker.profileSummary.toLowerCase().includes('mock data') &&
            !speaker.profileSummary.toLowerCase().includes('no data found');

          const hasRealCompanyProfile = speaker.companyProfile &&
            speaker.companyProfile.trim() !== '' &&
            !speaker.companyProfile.toLowerCase().includes('mock profile') &&
            !speaker.companyProfile.toLowerCase().includes('mock data') &&
            !speaker.companyProfile.toLowerCase().includes('no data found');

          const hasExpertise = speaker.expertise && speaker.expertise.length > 0 &&
            !speaker.expertise.every((e: string) => e.trim() === '');
          const hasAchievements = speaker.achievements && speaker.achievements.length > 0;
          
          const hasAnyRealContent = hasRealProfileSummary || hasRealCompanyProfile || hasExpertise || hasAchievements;
          
          return (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Professional Profile</h2>

              {fetchingProfile && !hasAnyRealContent ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-700 font-medium mb-2">Our AI agents are researching {speaker.name} across the web</p>
                  <p className="text-gray-600 mb-3">We're gathering professional insights, recent accomplishments, and industry expertise to provide you with comprehensive speaker information.</p>
                  <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto mt-4">
                    <p className="text-sm text-blue-800">
                      <strong>Did you know?</strong> This AI-powered research saves hours of manual work.
                      PS Advisory can help your company leverage similar agentic AI capabilities to automate research,
                      remove friction from workflows, and accelerate decision-making.
                    </p>
                    <a href="https://psadvisory.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
                      Learn how PS Advisory can transform your operations →
                    </a>
                  </div>
                </div>
              ) : !hasAnyRealContent ? (
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
                      <div className="space-y-3 text-gray-700">
                        {(() => {
                          // Format the profile summary with proper structure
                          const formattedContent = speaker.profileSummary
                            ?.split('\n')
                            .map((line, lineIndex) => {
                              const trimmedLine = line.trim();

                              // Skip empty lines
                              if (!trimmedLine) return null;

                              // Check for various bullet point formats
                              const isBulletPoint = trimmedLine.match(/^[•\-\*]\s+/) ||
                                                   trimmedLine.startsWith('In ') ||
                                                   trimmedLine.startsWith('The team') ||
                                                   trimmedLine.startsWith('They ') ||
                                                   trimmedLine.includes('has been sold in all 50 states');

                              // Check for section headers (lines ending with colon)
                              const isSectionHeader = trimmedLine.endsWith(':') && trimmedLine.length < 100;

                              if (isSectionHeader) {
                                return (
                                  <h4 key={lineIndex} className="font-semibold text-gray-800 mt-4 mb-2">
                                    {trimmedLine}
                                  </h4>
                                );
                              }

                              if (isBulletPoint) {
                                // Remove bullet characters if present
                                const cleanedLine = trimmedLine.replace(/^[•\-\*]\s+/, '');
                                return (
                                  <div key={lineIndex} className="flex items-start gap-3 ml-4">
                                    <span className="text-blue-600 mt-1.5 flex-shrink-0">•</span>
                                    <span className="leading-relaxed">{cleanedLine}</span>
                                  </div>
                                );
                              }

                              // Regular paragraph
                              return (
                                <p key={lineIndex} className="leading-relaxed">
                                  {trimmedLine}
                                </p>
                              );
                            })
                            .filter(Boolean); // Remove null entries

                          return formattedContent;
                        })()}
                      </div>
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
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <div className="space-y-3 text-gray-700">
                          {(() => {
                            // Format the company profile with proper structure
                            const formattedContent = speaker.companyProfile
                              ?.split('\n')
                              .map((line, lineIndex) => {
                                const trimmedLine = line.trim();

                                // Skip empty lines
                                if (!trimmedLine) return null;

                                // Check for various bullet point formats
                                const isBulletPoint = trimmedLine.match(/^[•\-\*]\s+/) ||
                                                     trimmedLine.startsWith('The company') ||
                                                     trimmedLine.startsWith('They ');

                                // Check for section headers (lines ending with colon)
                                const isSectionHeader = trimmedLine.endsWith(':') && trimmedLine.length < 100;

                                if (isSectionHeader) {
                                  return (
                                    <h4 key={lineIndex} className="font-semibold text-gray-800 mt-3 mb-2">
                                      {trimmedLine}
                                    </h4>
                                  );
                                }

                                if (isBulletPoint) {
                                  // Remove bullet characters if present
                                  const cleanedLine = trimmedLine.replace(/^[•\-\*]\s+/, '');
                                  return (
                                    <div key={lineIndex} className="flex items-start gap-3 ml-4">
                                      <span className="text-green-600 mt-1.5 flex-shrink-0">•</span>
                                      <span className="leading-relaxed">{cleanedLine}</span>
                                    </div>
                                  );
                                }

                                // Regular paragraph
                                return (
                                  <p key={lineIndex} className="leading-relaxed">
                                    {trimmedLine}
                                  </p>
                                );
                              })
                              .filter(Boolean); // Remove null entries

                            return formattedContent;
                          })()}
                        </div>
                      </div>
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
                  className="bg-white/80 backdrop-blur rounded-2xl shadow-md hover:shadow-xl border border-purple-100 hover:border-purple-200 transition-all p-6"
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