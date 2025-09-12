'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Search, Filter, Heart, User, Tag, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Speaker {
  name: string;
  title?: string;
  role?: string;
  company?: string;
  bio?: string;
  imageUrl?: string;
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
}

export default function AgendaPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('2025-10-15');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, selectedDay, searchQuery, selectedTrack]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/agenda/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    let filtered = sessions;

    // Filter by day
    if (selectedDay) {
      filtered = filtered.filter(session => 
        session.startTime.startsWith(selectedDay)
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.speakers.some(s => 
          s.speaker.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Filter by track
    if (selectedTrack !== 'all') {
      filtered = filtered.filter(session => session.track === selectedTrack);
    }

    // Sort by start time
    filtered.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    setFilteredSessions(filtered);
  };

  const toggleFavorite = (sessionId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(sessionId)) {
      newFavorites.delete(sessionId);
    } else {
      newFavorites.add(sessionId);
    }
    setFavorites(newFavorites);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTracks = (): string[] => {
    const tracks = new Set(sessions.map(s => s.track).filter((track): track is string => track !== undefined && track !== null));
    return Array.from(tracks).sort();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Spacer for fixed navigation */}
      <div className="h-16"></div>
      
      {/* Header */}
      <div className="sticky top-16 z-30 bg-white shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold text-gray-900">Conference Agenda</h1>
          <p className="text-sm text-gray-600 mt-1">October 15-17, 2025 • Las Vegas</p>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
          {[
            { date: '2025-10-15', label: 'Day 1', subLabel: 'Oct 15' },
            { date: '2025-10-16', label: 'Day 2', subLabel: 'Oct 16' },
            { date: '2025-10-17', label: 'Day 3', subLabel: 'Oct 17' }
          ].map(day => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day.date)}
              className={`flex-1 py-3 px-4 rounded-xl transition-all ${
                selectedDay === day.date
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <div className="font-semibold">{day.label}</div>
              <div className={`text-xs ${
                selectedDay === day.date ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {day.subLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search sessions, speakers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Track Filter */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedTrack('all')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                selectedTrack === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              All Tracks
            </button>
            {getTracks().map(track => (
              <button
                key={track}
                onClick={() => setSelectedTrack(track)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                  selectedTrack === track
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {track}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="px-4 py-4 pb-20">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Session Header */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2">
                        {session.title}
                      </h3>
                      {session.track && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {session.track}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleFavorite(session.id)}
                      className="ml-3 p-2"
                    >
                      <Heart
                        className={`h-5 w-5 transition-colors ${
                          favorites.has(session.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Time and Location */}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                      {formatTime(session.startTime)} - {formatTime(session.endTime)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                      {session.location}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 text-sm leading-relaxed mb-3 line-clamp-2">
                    {session.description}
                  </p>

                  {/* Speakers */}
                  {session.speakers.length > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="space-y-3">
                        {session.speakers.map((s, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            {s.speaker.imageUrl ? (
                              <img 
                                src={s.speaker.imageUrl} 
                                alt={s.speaker.name}
                                className="h-10 w-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div 
                              className={`${s.speaker.imageUrl ? 'hidden' : ''} h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0`}
                            >
                              <span className="text-white font-semibold text-sm">
                                {s.speaker.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {s.speaker.name}
                              </div>
                              {s.speaker.role && (
                                <div className="text-xs text-gray-600 truncate">
                                  {s.speaker.role}
                                </div>
                              )}
                              {s.speaker.company && (
                                <div className="text-xs text-gray-500 truncate">
                                  {s.speaker.company}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {session.tags.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {session.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <Link 
        href="/chat"
        className="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-50 flex items-center justify-center group"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute right-full mr-2 bg-gray-900 text-white text-sm rounded-lg px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Ask AI Assistant
        </span>
      </Link>

      <Footer />
    </div>
  );
}