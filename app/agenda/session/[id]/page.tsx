'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Calendar, Clock, MapPin, Users, Tag, ArrowLeft, Heart, 
  User, Building, ExternalLink, Mail, Share2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

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
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchSession();
    checkFavoriteStatus();
  }, [sessionId]);

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
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
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

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading session details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !session) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The session you are looking for could not be found.'}</p>
            <button
              onClick={() => router.push('/agenda/intelligent')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          {/* Session Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{session.title}</h1>
                
                {/* Tags */}
                {session.tags && session.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {session.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={toggleFavorite}
                  className={`p-3 rounded-lg transition-colors ${
                    isFavorite
                      ? 'text-red-500 bg-red-50'
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={shareSession}
                  className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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

            {/* Description */}
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Session</h2>
              <p className="text-gray-700 leading-relaxed">
                {session.description || 'No description available for this session.'}
              </p>
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
      <Footer />
    </>
  );
}