'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Briefcase, Search, Building, Award, Users, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface Speaker {
  id: string;
  name: string;
  role?: string;
  company?: string;
  bio?: string;
  imageUrl?: string;
  sessions?: {
    session: {
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      track?: string;
    }
  }[];
}

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [filteredSpeakers, setFilteredSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSpeakers();
  }, []);
  
  // Debug: Log the data to see what we're actually rendering
  useEffect(() => {
    if (speakers.length > 0) {
      console.log('First 3 speakers data:', speakers.slice(0, 3).map(s => ({
        name: s.name,
        role: s.role,
        company: s.company
      })));
    }
  }, [speakers]);

  useEffect(() => {
    if (speakers.length > 0 || !loading) {
      filterSpeakers();
    }
  }, [speakers, searchQuery, selectedCompany, searchResults]);

  // Perform intelligent search when search query changes
  useEffect(() => {
    const performIntelligentSearch = async () => {
      if (searchQuery.length > 1) {
        setSearching(true);
        try {
          const response = await fetch('/api/speakers/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery })
          });

          if (response.ok) {
            const data = await response.json();
            // Set the search results directly from the API
            setSearchResults(data.speakers || []);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(performIntelligentSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const fetchSpeakers = async () => {
    try {
      const response = await fetch('/api/speakers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched speakers:', data.speakers?.length || 0);
      setSpeakers(data.speakers || []);
      setFilteredSpeakers(data.speakers || []); // Set initial filtered speakers
    } catch (error) {
      console.error('Error fetching speakers:', error);
      setSpeakers([]);
      setFilteredSpeakers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterSpeakers = () => {
    let filtered = speakers;

    // If we have search results from the API, use those
    if (searchResults.length > 0 && searchQuery.length > 1) {
      // The search results are already sorted by relevance
      filtered = searchResults as Speaker[];
    } else if (searchQuery) {
      // Fallback to client-side text search for single character
      filtered = filtered.filter(speaker =>
        speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by company
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(speaker => speaker.company === selectedCompany);
    }

    // Sort alphabetically by name (unless we have search results, which are already sorted by relevance)
    if (searchResults.length === 0 || searchQuery.length <= 1) {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredSpeakers(filtered);
  };

  const extractSpeakerNames = (aiResponse: string): string[] => {
    if (!aiResponse) return [];

    // Extract speaker names from the AI response
    // Look for patterns like "Name (Company)" or just names
    const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    const matches = aiResponse.match(namePattern) || [];

    // Also look for bulleted lists or numbered lists
    const listPattern = /(?:^|\n)[\•\-\*\d\.]\s*([^(\n]+)/gm;
    const listMatches = [...aiResponse.matchAll(listPattern)].map(m => m[1].trim());

    // Combine and deduplicate
    const allNames = [...new Set([...matches, ...listMatches])];

    // Filter out common words that aren't names
    const commonWords = ['The', 'This', 'These', 'Session', 'Speaker', 'Insurance', 'Technology'];
    return allNames.filter(name =>
      !commonWords.some(word => name.startsWith(word)) &&
      name.length > 3 &&
      name.split(' ').length >= 2
    );
  };

  const getCompanies = () => {
    const companies = new Set(speakers.map(s => s.company).filter((c): c is string => Boolean(c)));
    return Array.from(companies).sort();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getSpeakerTypeLabel = (speaker: Speaker) => {
    const role = speaker.role?.toLowerCase() || '';
    if (role.includes('ceo') || role.includes('founder') || role.includes('president')) {
      return { label: 'VIP', color: 'bg-purple-100 text-purple-700' };
    }
    if (role.includes('keynote')) {
      return { label: 'Keynote', color: 'bg-yellow-100 text-yellow-700' };
    }
    if (speaker.sessions && speaker.sessions.length > 2) {
      return { label: 'Featured', color: 'bg-blue-100 text-blue-700' };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">
      

      {/* Spacer for fixed navigation */}
      <div className="h-16"></div>

      {/* Header */}
      <div className="sticky top-16 z-30 bg-white/80 backdrop-blur border-b border-purple-100">
        <div className="px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-normal flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl shadow-md">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-purple-600" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Speakers</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2 sm:ml-14">
                {loading ? 'Loading...' : <><span className="font-medium text-purple-600">{speakers.length}</span> industry leaders and experts</>}
              </p>
            </div>
            <div className="text-sm text-purple-600 font-medium">
              ITC Vegas 2025
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-t border-purple-100">
          <div className="relative">
            <button
              onClick={() => {
                searchInputRef.current?.focus();
                // If there's a search query, trigger the search
                if (searchQuery.length > 0) {
                  // Force a re-search by clearing and resetting
                  const currentQuery = searchQuery;
                  setSearchQuery('');
                  setTimeout(() => setSearchQuery(currentQuery), 10);
                }
              }}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search speakers, companies, roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.length > 0) {
                  // Force search on Enter key
                  const currentQuery = searchQuery;
                  setSearchQuery('');
                  setTimeout(() => setSearchQuery(currentQuery), 10);
                }
              }}
              className="w-full pl-10 pr-12 py-3 bg-white/50 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              </div>
            )}
            {searchQuery.length > 0 && !searching && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery.length > 1 && searchResults.length > 0 && !searching && (
            <div className="mt-2 text-xs text-purple-600">
              Found {searchResults.length} relevant speaker{searchResults.length !== 1 ? 's' : ''} using intelligent search
            </div>
          )}
          {searchQuery.length > 1 && searchResults.length === 0 && !searching && (
            <div className="mt-2 text-xs text-gray-500">
              No speakers found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Company Filter */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCompany('all')}
              className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${
                selectedCompany === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-purple-200 hover:bg-purple-50'
              }`}
            >
              All Companies
            </button>
            {getCompanies().slice(0, 5).map(company => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${
                  selectedCompany === company
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                {company}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Speaker Grid */}
      <div className="px-4 py-6 pb-20">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredSpeakers.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur rounded-2xl border border-purple-100 max-w-md mx-auto">
            <div className="p-3 bg-gradient-to-br from-gray-100 to-purple-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <User className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-gray-600 text-lg">No speakers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSpeakers.map(speaker => {
              const typeLabel = getSpeakerTypeLabel(speaker);
              return (
                <div
                  key={speaker.id}
                  className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-purple-100 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all group"
                >
                  <div className="p-4">
                    {/* Speaker Header */}
                    <div className="flex items-start gap-3 mb-3">
                      {speaker.imageUrl ? (
                        <img 
                          src={speaker.imageUrl} 
                          alt={speaker.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`${speaker.imageUrl ? 'hidden' : ''} h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 group-hover:from-purple-600 group-hover:to-blue-600 transition-all`}
                      >
                        <span className="text-white font-bold text-lg">
                          {getInitials(speaker.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/speakers/${speaker.id}`}
                          className="group"
                        >
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
                            {speaker.name}
                          </h3>
                        </Link>
                        {speaker.role && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {speaker.role}
                          </p>
                        )}
                        {speaker.company && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building className="w-3 h-3 text-purple-400" />
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {speaker.company}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Type Label */}
                    {typeLabel && (
                      <div className="mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeLabel.color}`}>
                          <Award className="w-3 h-3 mr-1" />
                          {typeLabel.label}
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    {speaker.bio && (
                      <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                        {speaker.bio}
                      </p>
                    )}

                    {/* Sessions Count and View Profile */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {speaker.sessions && speaker.sessions.length > 0 
                            ? `${speaker.sessions.length} session${speaker.sessions.length > 1 ? 's' : ''}`
                            : 'No sessions'}
                        </span>
                        <Link
                          href={`/speakers/${speaker.id}`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Profile →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
          Ask about speakers
        </span>
      </Link>

    </div>
  );
}