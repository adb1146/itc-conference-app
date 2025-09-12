'use client';

import { useState, useEffect } from 'react';
import { User, Briefcase, Search, Building, Award, Users, MessageCircle } from 'lucide-react';
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
  }, [speakers, searchQuery, selectedCompany]);

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

    // Filter by search query
    if (searchQuery) {
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

    // Sort alphabetically by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    setFilteredSpeakers(filtered);
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Spacer for fixed navigation */}
      <div className="h-16"></div>
      
      {/* Header */}
      <div className="sticky top-16 z-30 bg-white shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Speakers
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? 'Loading...' : `${speakers.length} industry leaders and experts`}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              ITC Vegas 2025
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search speakers, companies, roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Company Filter */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCompany('all')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                selectedCompany === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              All Companies
            </button>
            {getCompanies().slice(0, 5).map(company => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                  selectedCompany === company
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {company}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Speaker Grid */}
      <div className="px-4 py-4 pb-20">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSpeakers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No speakers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpeakers.map(speaker => {
              const typeLabel = getSpeakerTypeLabel(speaker);
              return (
                <div
                  key={speaker.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
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
                        className={`${speaker.imageUrl ? 'hidden' : ''} h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0`}
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
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
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
                            <Building className="w-3 h-3 text-gray-400" />
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

      <Footer />
    </div>
  );
}