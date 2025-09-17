'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar, Clock, MapPin, Users, Tag, ArrowLeft,
  User, Building, ExternalLink, Mail, Share2, AlertCircle, MessageCircle, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import FavoriteButton from '@/components/FavoriteButton';

interface Speaker {
  id: string;
  name: string;
  role?: string;
  company?: string;
  bio?: string;
  imageUrl?: string;
  linkedinUrl?: string;
  profileSummary?: string;
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
  speakers: { speaker: Speaker }[];
  date?: string;
  day?: number;
  enrichedSummary?: string;
  keyTakeaways?: string[];
  industryContext?: string;
  relatedTopics?: string[];
  lastEnrichmentSync?: string;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [hasAutoEnriched, setHasAutoEnriched] = useState(false);
  const [personalizedReasons, setPersonalizedReasons] = useState<string[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(false);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/agenda/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Session not found');
      }
      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error('Error fetching session:', error);
      setError('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const enrichSession = async () => {
    try {
      setEnriching(true);
      const response = await fetch(`/api/sessions/${sessionId}/enrich`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
      }
    } catch (error) {
      console.error('Error enriching session:', error);
    } finally {
      setEnriching(false);
    }
  };

  const fetchPersonalizedReasons = async () => {
    try {
      setLoadingReasons(true);

      // Get user profile from localStorage if available
      const userProfileStr = localStorage.getItem('userProfile');
      const userProfile = userProfileStr ? JSON.parse(userProfileStr) : null;

      const response = await fetch(`/api/sessions/${sessionId}/personalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userProfile })
      });

      if (response.ok) {
        const data = await response.json();
        setPersonalizedReasons(data.reasons || []);
      }
    } catch (error) {
      console.error('Error fetching personalized reasons:', error);
    } finally {
      setLoadingReasons(false);
    }
  };

  useEffect(() => {
    fetchSession();
    checkFavoriteStatus();
  }, [sessionId]);

  // Fetch personalized reasons when session is loaded
  useEffect(() => {
    if (session && !loading) {
      fetchPersonalizedReasons();
    }
  }, [session?.id]);

  // Auto-enrich session data if not already enriched
  useEffect(() => {
    if (session && !loading && !hasAutoEnriched && !enriching) {
      const hasEnrichment = session.enrichedSummary && session.enrichedSummary.trim() !== '';
      const isRecent = session.lastEnrichmentSync &&
        (new Date().getTime() - new Date(session.lastEnrichmentSync).getTime()) < 24 * 60 * 60 * 1000; // 24 hours

      if (!hasEnrichment || !isRecent) {
        setHasAutoEnriched(true);
        enrichSession();
      }
    }
  }, [session, loading, hasAutoEnriched, enriching]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        const favoriteIds = new Set(data.favorites?.map((f: any) => f.sessionId) || []);
        setIsFavorite(favoriteIds.has(sessionId));
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const response = await fetch('/api/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (response.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    // Subtract 1 hour to get the correct Las Vegas display time
    const adjustedDate = new Date(date.getTime() - (1 * 60 * 60 * 1000));
    const adjustedHours = adjustedDate.getUTCHours();
    const adjustedMinutes = adjustedDate.getUTCMinutes();
    const period = adjustedHours >= 12 ? 'PM' : 'AM';
    const displayHours = adjustedHours % 12 || 12;
    return adjustedMinutes === 0
      ? `${displayHours}:00 ${period}`
      : `${displayHours}:${adjustedMinutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const shareSession = () => {
    if (navigator.share) {
      navigator.share({
        title: session?.title,
        text: `Check out this session at ITC Vegas 2025: ${session?.title}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const askAIAboutSession = () => {
    if (!session) return;

    // Prepare session data for AI context
    const sessionData = {
      id: session.id,
      title: session.title,
      description: session.description,
      track: session.track,
      speakers: session.speakers.map(s => ({
        name: s.speaker.name,
        role: s.speaker.role,
        company: s.speaker.company
      })),
      tags: session.tags,
      location: session.location,
      startTime: session.startTime,
      endTime: session.endTime
    };

    // Store session context in sessionStorage
    sessionStorage.setItem('askAIContext', JSON.stringify({
      type: 'session',
      data: sessionData,
      query: `Tell me everything about the session "${session.title}". Search the web for information about the speakers, the topics covered, and any relevant industry context. Include information from the ITC Vegas website if available.`
    }));

    // Navigate to chat
    router.push('/chat');
  };

  if (loading) {
    return (
      <>
        
        <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading session details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !session) {
    return (
      <>
        
        <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex items-center justify-center">
          <div className="text-center max-w-md bg-white/80 backdrop-blur rounded-2xl p-10 border border-purple-100 shadow-xl">
            <div className="p-3 bg-gradient-to-br from-red-100 to-pink-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-normal mb-3">
              <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Session Not Found</span>
            </h1>
            <p className="text-gray-600 mb-8">{error || 'The session you are looking for could not be found.'}</p>
            <button
              onClick={() => router.push('/agenda/simple')}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              View All Sessions
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      
      <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>

          {/* Session Header */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-purple-100 p-8 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-normal mb-4">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{session.title}</span>
                </h1>

                {/* Tags */}
                {session.tags && session.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {session.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-4 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-xl text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons - All aligned together */}
              <div className="flex items-center gap-2 ml-4">
                <FavoriteButton
                  itemId={session.id}
                  type="session"
                  showLabel={false}
                />
                <button
                  onClick={askAIAboutSession}
                  className="p-2.5 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                  title="Ask AI about this session"
                >
                  <MessageCircle className="h-6 w-6" />
                </button>
                <button
                  onClick={shareSession}
                  className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Share session"
                >
                  <Share2 className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(session.startTime)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-gray-600">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{session.location || 'TBD'}</p>
                </div>
              </div>
            </div>

            {/* Enhanced Description */}
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Session</h2>
              {enriching && !session.enrichedSummary ? (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="text-blue-800 font-medium">AI agents are researching this session for you</p>
                  </div>
                  <p className="text-gray-700 mb-3">
                    We're analyzing industry trends, speaker expertise, and related content to provide you with
                    enriched insights and personalized recommendations.
                  </p>
                  <div className="bg-white/70 rounded p-3 border border-blue-200">
                    <p className="text-sm text-gray-700">
                      <strong className="text-blue-700">Transform Your Business with AI:</strong> This intelligent research
                      capability demonstrates how agentic AI can automate time-consuming tasks.
                      PS Advisory specializes in helping insurance companies implement similar AI solutions
                      to streamline operations and enhance decision-making.
                    </p>
                    <a href="https://psadvisory.com" target="_blank" rel="noopener noreferrer"
                       className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
                      Discover how PS Advisory can accelerate your digital transformation →
                    </a>
                  </div>
                </div>
              ) : null}

              {session.enrichedSummary ? (
                <div className="space-y-4">
                  {session.enrichedSummary.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('**') && paragraph.includes(':**')) {
                      const [title, ...content] = paragraph.split(':**');
                      return (
                        <div key={idx}>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {title.replace(/\*\*/g, '')}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {content.join(':**').replace(/\*\*/g, '')}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  {session.description || 'No description available for this session.'}
                </p>
              )}
            </div>

            {/* Key Takeaways */}
            {session.keyTakeaways && session.keyTakeaways.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  Key Takeaways
                </h3>
                <ul className="space-y-2">
                  {session.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span className="text-gray-700">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Why You Should Attend */}
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Why You Should Attend
              </h3>
              {loadingReasons ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    <p className="text-purple-700 font-medium">AI is personalizing recommendations for you...</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Our AI is analyzing your profile and interests to generate personalized reasons why this session
                    would be valuable for your professional development.
                  </p>
                </div>
              ) : personalizedReasons.length > 0 ? (
                <ul className="space-y-3">
                  {personalizedReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-purple-600 mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-gray-700 leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-purple-600 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-gray-700 leading-relaxed">
                      Gain cutting-edge insights from industry leaders shaping the future of insurance technology
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-600 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-gray-700 leading-relaxed">
                      Learn practical strategies you can implement immediately in your organization
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-600 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-gray-700 leading-relaxed">
                      Network with peers and experts who share your challenges and goals
                    </span>
                  </li>
                </ul>
              )}
              {!loadingReasons && (
                <button
                  onClick={fetchPersonalizedReasons}
                  className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  Refresh recommendations
                </button>
              )}
            </div>

            {/* Industry Context */}
            {session.industryContext && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Industry Context</h3>
                <p className="text-gray-700">{session.industryContext}</p>
              </div>
            )}

            {/* Related Topics */}
            {session.relatedTopics && session.relatedTopics.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {session.relatedTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ask AI Link */}
            <div className="mt-6">
              <button
                onClick={askAIAboutSession}
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Ask AI about this session
              </button>
            </div>

            {/* Track and Level */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex gap-6">
              {session.track && (
                <div>
                  <span className="text-sm text-gray-500">Track</span>
                  <p className="font-medium text-gray-900">{session.track}</p>
                </div>
              )}
              {session.level && (
                <div>
                  <span className="text-sm text-gray-500">Level</span>
                  <p className="font-medium text-gray-900">{session.level}</p>
                </div>
              )}
            </div>
          </div>

          {/* Speakers Section */}
          {session.speakers && session.speakers.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Speakers
              </h2>
              
              <div className="space-y-6">
                {session.speakers.map(({ speaker }) => (
                  <Link
                    key={speaker.id}
                    href={`/speakers/${speaker.id}`}
                    className="block group"
                  >
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                      {/* Speaker Avatar */}
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {speaker.imageUrl ? (
                          <img 
                            src={speaker.imageUrl} 
                            alt={speaker.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-white" />
                        )}
                      </div>
                      
                      {/* Speaker Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {speaker.name}
                        </h3>
                        {(speaker.role || speaker.company) && (
                          <p className="text-gray-600 flex items-center gap-1">
                            {speaker.role}
                            {speaker.role && speaker.company && ' at '}
                            {speaker.company && (
                              <>
                                <Building className="w-4 h-4 ml-1" />
                                {speaker.company}
                              </>
                            )}
                          </p>
                        )}
                        {speaker.profileSummary && (
                          <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                            {speaker.profileSummary}
                          </p>
                        )}
                        
                        {/* External Links */}
                        <div className="flex items-center gap-3 mt-3">
                          {speaker.linkedinUrl && (
                            <a
                              href={speaker.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                              LinkedIn
                            </a>
                          )}
                          <span className="text-blue-600 text-sm group-hover:underline">
                            View Profile →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}