'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Calendar, Clock, MapPin, Search, Filter, ChevronRight, Sparkles, Star, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  track?: string;
  tags: string[];
  speakers: any[];
}

interface TimeRange {
  label: string;
  startHour: number;
  endHour: number;
}

function SimpleAgendaContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('2025-10-14'); // Default to Tuesday
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize selectedTrack from URL parameter if present
  const trackParam = searchParams.get('track');
  const [selectedTrack, setSelectedTrack] = useState(trackParam || 'all');

  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isAISearch, setIsAISearch] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<Session[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const timeRanges: TimeRange[] = [
    { label: 'All Day', startHour: 0, endHour: 24 },
    { label: 'Morning (7AM-12PM)', startHour: 7, endHour: 12 },
    { label: 'Afternoon (12PM-5PM)', startHour: 12, endHour: 17 },
    { label: 'Evening (5PM+)', startHour: 17, endHour: 24 }
  ];

  useEffect(() => {
    fetchSessions();
    if (status === 'authenticated') {
      fetchFavorites();
    }
  }, [status]);

  // Handle clicks outside of search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Clear any pending search when component unmounts
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Filter sessions when day, track, or time range changes
    if (!isAISearch) {
      // Regular filtering
      filterSessions();
    } else {
      // Filter AI search results for the selected day
      filterAIResults();
    }
  }, [sessions, selectedDay, selectedTrack, selectedTimeRange, isAISearch]);

  useEffect(() => {
    // Only filter for non-AI searches when search query changes
    if (!isAISearch) {
      filterSessions();
    }
  }, [searchQuery]);

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

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites?.map((f: any) => f.sessionId) || []);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop event bubbling

    if (status !== 'authenticated') {
      // Could show a login prompt here
      return;
    }

    setFavoriteLoading(sessionId);
    const isFavorited = favorites.includes(sessionId);

    try {
      let response;
      if (isFavorited) {
        // DELETE request with query parameters
        response = await fetch(`/api/favorites?type=session&sessionId=${sessionId}`, {
          method: 'DELETE'
        });
      } else {
        // POST request with JSON body including type
        response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            type: 'session'
          })
        });
      }

      if (response.ok) {
        if (isFavorited) {
          setFavorites(favorites.filter(id => id !== sessionId));
        } else {
          setFavorites([...favorites, sessionId]);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(null);
    }
  };

  const filterSessions = () => {
    let filtered = sessions.filter(session => {
      const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
      return sessionDate === selectedDay;
    });

    if (searchQuery && !isAISearch) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(query) ||
        session.description?.toLowerCase().includes(query) ||
        session.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedTrack !== 'all') {
      filtered = filtered.filter(session => session.track === selectedTrack);
    }

    // Filter by time range
    if (selectedTimeRange !== 'all') {
      const timeRange = timeRanges.find(tr => tr.label === selectedTimeRange);
      if (timeRange) {
        filtered = filtered.filter(session => {
          const hour = new Date(session.startTime).getHours();
          return hour >= timeRange.startHour && hour < timeRange.endHour;
        });
      }
    }

    filtered.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    setFilteredSessions(filtered);
  };

  const filterAIResults = () => {
    if (aiSearchResults.length === 0) {
      setFilteredSessions([]);
      return;
    }

    let filtered = aiSearchResults.filter(session => {
      const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
      return sessionDate === selectedDay;
    });

    if (selectedTrack !== 'all') {
      filtered = filtered.filter(session => session.track === selectedTrack);
    }

    // Filter by time range
    if (selectedTimeRange !== 'all') {
      const timeRange = timeRanges.find(tr => tr.label === selectedTimeRange);
      if (timeRange) {
        filtered = filtered.filter(session => {
          const hour = new Date(session.startTime).getHours();
          return hour >= timeRange.startHour && hour < timeRange.endHour;
        });
      }
    }

    filtered.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    setFilteredSessions(filtered);
  };

  const performAISearch = async (query: string) => {
    if (!query.trim()) {
      setIsAISearch(false);
      setAiSearchResults([]);
      filterSessions();
      return;
    }

    setIsSearching(true);
    setIsAISearch(true);

    try {
      // Use the dedicated AI search endpoint for better session matching
      const response = await fetch('/api/agenda/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          selectedDay
        })
      });

      if (!response.ok) {
        // Fallback to basic search if AI fails
        setIsAISearch(false);
        filterSessions();
        return;
      }

      const data = await response.json();

      // Store search metadata for better UX
      if (data.searchMetadata) {
        setSearchMetadata(data.searchMetadata);
      }

      // Check if we got results
      if (data.sessions && data.sessions.length > 0) {
        // Store all AI results
        setAiSearchResults(data.sessions);

        // Filter for the selected day
        let dayFiltered = data.sessions.filter((session: Session) => {
          const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
          return sessionDate === selectedDay;
        });

        // Apply track filter if selected
        if (selectedTrack !== 'all') {
          dayFiltered = dayFiltered.filter((session: Session) => session.track === selectedTrack);
        }

        // Sort by time within the day
        dayFiltered.sort((a: Session, b: Session) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        setFilteredSessions(dayFiltered);
      } else {
        // No AI results, but keep AI mode active to show intelligent "no results" message
        setAiSearchResults([]);
        setFilteredSessions([]);
      }
    } catch (error) {
      console.error('AI search error:', error);
      // Fallback to basic search
      setIsAISearch(false);
      setAiSearchResults([]);
      filterSessions();
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear existing timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Generate search suggestions based on input
    if (value.trim().length > 0) {
      const suggestions = generateSearchSuggestions(value);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }

    // Set new timeout for AI search
    if (value.trim().length > 2) {
      searchDebounceRef.current = setTimeout(() => {
        performAISearch(value);
        setShowSuggestions(false); // Hide suggestions after search
      }, 500); // Wait 500ms after user stops typing
    } else if (value.trim().length === 0) {
      // Clear search immediately if empty
      setIsAISearch(false);
      setAiSearchResults([]);
      setSearchMetadata(null);
      filterSessions();
    }
  };

  const generateSearchSuggestions = (query: string): string[] => {
    const lower = query.toLowerCase();
    const suggestions: string[] = [];

    // Popular searches
    const popularSearches = [
      'AI sessions',
      'keynote speakers',
      'networking events',
      'breakfast sessions',
      'lunch sessions',
      'expo floor',
      'workshops',
      'panel discussions',
      'closing party',
      'golf tournament',
      'WIISE events',
      'LATAM sessions',
      'innovation talks',
      'insurtech trends',
      'digital transformation'
    ];

    // Add matching popular searches
    popularSearches.forEach(search => {
      if (search.toLowerCase().includes(lower) && suggestions.length < 5) {
        suggestions.push(search);
      }
    });

    // Add query-based suggestions
    if (lower.includes('ai') && suggestions.length < 5) {
      suggestions.push('AI and machine learning sessions');
    }
    if (lower.includes('net') && suggestions.length < 5) {
      suggestions.push('networking opportunities');
    }
    if (lower.includes('key') && suggestions.length < 5) {
      suggestions.push('keynote presentations');
    }
    if ((lower.includes('when') || lower.includes('time')) && suggestions.length < 5) {
      suggestions.push('when does expo floor open');
    }

    return suggestions.slice(0, 5);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Don't refocus to avoid reopening suggestions
    performAISearch(suggestion);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    // The database times are stored as UTC but represent Las Vegas local time
    // So we need to extract the UTC values and format them without timezone conversion
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();

    // Subtract 1 hour to match the CSV times (there's a 1-hour offset in the data)
    const adjustedDate = new Date(date.getTime() - (1 * 60 * 60 * 1000));
    const adjustedHours = adjustedDate.getUTCHours();
    const adjustedMinutes = adjustedDate.getUTCMinutes();

    // Format as 12-hour time
    const period = adjustedHours >= 12 ? 'PM' : 'AM';
    const displayHours = adjustedHours % 12 || 12;

    return adjustedMinutes === 0
      ? `${displayHours}:00 ${period}`
      : `${displayHours}:${adjustedMinutes.toString().padStart(2, '0')} ${period}`;
  };

  const getTracks = () => {
    const tracks = new Set(sessions.map(s => s.track).filter(Boolean));
    return Array.from(tracks).sort();
  };

  // Group sessions by time slot
  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const timeSlot = formatTime(session.startTime);
    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }
    acc[timeSlot].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24">


      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 sticky top-20 sm:top-24 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="py-4">
            <h1 className="text-2xl font-light text-gray-900">Conference Schedule</h1>
          </div>

          {/* Day Selector */}
          <div className="flex gap-1 pb-4">
            {[
              { date: '2025-10-13', label: 'Monday', day: 'Oct 13' },
              { date: '2025-10-14', label: 'Tuesday', day: 'Oct 14' },
              { date: '2025-10-15', label: 'Wednesday', day: 'Oct 15' },
              { date: '2025-10-16', label: 'Thursday', day: 'Oct 16' },
            ].map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date)}
                className={`px-6 py-3 rounded-lg transition-all ${
                  selectedDay === day.date
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="font-medium">{day.label}</div>
                <div className="text-xs opacity-80">{day.day}</div>
              </button>
            ))}
          </div>

          {/* AI-Powered Search */}
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchQuery.length > 0 && searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Search sessions (AI-powered)..."
                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-colors"
              />
              {(isSearching || isAISearch) && (
                <div className="absolute right-3 top-3">
                  {isSearching ? (
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  )}
                </div>
              )}

              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                >
                  <div className="p-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Suggestions
                    </p>
                  </div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-colors text-sm cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-4 py-3 bg-white/50 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[180px]"
            >
              {timeRanges.map(range => (
                <option key={range.label} value={range.label === 'All Day' ? 'all' : range.label}>
                  {range.label}
                </option>
              ))}
            </select>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="px-4 py-3 bg-white/50 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[150px]"
            >
              <option value="all">All Tracks</option>
              {getTracks().map(track => (
                <option key={track} value={track}>{track}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List - Clean and Simple */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Active Filters Display */}
        <div className="flex flex-wrap gap-2 mb-4">
          {isAISearch && searchQuery && (
            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg inline-flex items-center gap-2 text-sm text-purple-700">
              <Sparkles className="w-4 h-4" />
              <span>AI Search: "{searchQuery}"</span>
            </div>
          )}
          {selectedTimeRange !== 'all' && (
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg inline-flex items-center gap-2 text-sm text-blue-700">
              <Clock className="w-4 h-4" />
              <span>{selectedTimeRange}</span>
              <button
                onClick={() => setSelectedTimeRange('all')}
                className="ml-1 hover:text-blue-900"
              >
                ×
              </button>
            </div>
          )}
          {selectedTrack !== 'all' && (
            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg inline-flex items-center gap-2 text-sm text-green-700">
              <Filter className="w-4 h-4" />
              <span>{selectedTrack}</span>
              <button
                onClick={() => setSelectedTrack('all')}
                className="ml-1 hover:text-green-900"
              >
                ×
              </button>
            </div>
          )}
          {(isAISearch || selectedTimeRange !== 'all' || selectedTrack !== 'all') && (
            <div className="px-3 py-2 text-sm text-gray-600">
              {filteredSessions.length} sessions found
            </div>
          )}
        </div>
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="text-center py-12">
            {isSearching ? (
              <div>
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Searching sessions...</p>
                <p className="text-sm text-gray-500 mt-2">Using AI to find the best matches</p>
              </div>
            ) : isAISearch && searchQuery ? (
              <div className="max-w-md mx-auto">
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">No sessions found for "{searchQuery}"</p>
                  {searchMetadata?.keywords?.length > 0 && (
                    <p className="text-sm text-gray-600 mb-4">
                      Searched for: {searchMetadata.keywords.join(', ')}
                    </p>
                  )}
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">Try:</p>
                    <ul className="text-left space-y-1">
                      <li>• Searching for different keywords</li>
                      <li>• Checking other days of the conference</li>
                      <li>• Removing filters or selecting "All Tracks"</li>
                      {selectedTrack !== 'all' && (
                        <li className="text-purple-600">• The "{selectedTrack}" track may not have sessions on {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <p className="text-gray-500 mb-4">
                  No sessions found for the selected criteria.
                </p>
                {selectedTrack !== 'all' && (
                  <p className="text-sm text-gray-500">
                    Try selecting a different day or choosing "All Tracks" to see more sessions.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedSessions).map(([timeSlot, sessions]) => (
              <div key={timeSlot}>
                {/* Time Header */}
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-medium text-gray-900">{timeSlot}</h2>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Session Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((session) => {
                    const isFavorited = favorites.includes(session.id);
                    const isLoadingFavorite = favoriteLoading === session.id;

                    return (
                      <div
                        key={session.id}
                        className="relative bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                      >
                        {/* Favorite button for logged-in users */}
                        {status === 'authenticated' && (
                          <button
                            onClick={(e) => toggleFavorite(e, session.id)}
                            className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${
                              isFavorited
                                ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                            } ${isLoadingFavorite ? 'opacity-50 cursor-wait' : ''}`}
                            disabled={isLoadingFavorite}
                            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star
                              className="w-4 h-4"
                              fill={isFavorited ? 'currentColor' : 'none'}
                            />
                          </button>
                        )}

                        <Link
                          href={`/agenda/session/${session.id}`}
                          className="block"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className={`text-base font-medium text-gray-900 line-clamp-2 flex-1 ${
                              status === 'authenticated' ? 'pr-12' : 'pr-2'
                            }`}>
                              {session.title}
                            </h3>
                            {status !== 'authenticated' && (
                              <ChevronRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                            )}
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {session.description}
                          </p>

                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="font-medium">
                                {new Date(session.startTime).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="mx-1">•</span>
                              <Clock className="w-3 h-3" />
                              <span>
                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{session.location}</span>
                            </div>
                            {session.track && (
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded">
                                  {session.track}
                                </span>
                              </div>
                            )}
                          </div>

                          {session.speakers && session.speakers.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                                {session.speakers.map((s, index) => (
                                  s.speaker?.name && (
                                    <span key={s.speaker.id || index}>
                                      <span className="text-blue-600">
                                        {s.speaker.name}
                                      </span>
                                      {index < session.speakers.length - 1 &&
                                        session.speakers[index + 1]?.speaker?.name &&
                                        <span className="mx-1">,</span>
                                      }
                                    </span>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimpleAgendaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agenda...</p>
        </div>
      </div>
    }>
      <SimpleAgendaContent />
    </Suspense>
  );
}