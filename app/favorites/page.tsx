'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star, Calendar, Users, Clock, MapPin, Building,
  Trash2, StickyNote, Filter, Search,
  LogIn, UserPlus, Sparkles, Loader2, X, AlertCircle
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import UserDashboard from '@/components/UserDashboard';
import SmartAgendaView from '@/components/agenda/SmartAgendaView';
import { SmartAgenda } from '@/lib/tools/schedule/types';

interface Favorite {
  id: string;
  type: 'session' | 'speaker';
  sessionId?: string;
  speakerId?: string;
  notes?: string;
  createdAt: string;
  session?: {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
    track?: string;
    speakers: {
      speaker: {
        id: string;
        name: string;
        company?: string;
      }
    }[];
  };
  speaker?: {
    id: string;
    name: string;
    role?: string;
    company?: string;
    bio?: string;
    imageUrl?: string;
  };
}

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'session' | 'speaker'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Smart Agenda states
  const [showAgenda, setShowAgenda] = useState(false);
  const [generatingAgenda, setGeneratingAgenda] = useState(false);
  const [smartAgenda, setSmartAgenda] = useState<SmartAgenda | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      // User is not logged in
      setLoading(false);
    } else if (session) {
      fetchFavorites();
    }
  }, [session, status]);

  useEffect(() => {
    filterFavorites();
  }, [favorites, filterType, searchQuery]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);

        // Initialize notes
        const notesMap: Record<string, string> = {};
        data.favorites.forEach((fav: Favorite) => {
          notesMap[fav.id] = fav.notes || '';
        });
        setNotes(notesMap);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFavorites = () => {
    let filtered = favorites;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(fav => fav.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fav => {
        if (fav.type === 'session' && fav.session) {
          return (
            fav.session.title.toLowerCase().includes(query) ||
            fav.session.description.toLowerCase().includes(query) ||
            fav.session.speakers.some(s =>
              s.speaker.name.toLowerCase().includes(query)
            )
          );
        }
        if (fav.type === 'speaker' && fav.speaker) {
          return (
            fav.speaker.name.toLowerCase().includes(query) ||
            fav.speaker.company?.toLowerCase().includes(query) ||
            fav.speaker.role?.toLowerCase().includes(query)
          );
        }
        return false;
      });
    }

    setFilteredFavorites(filtered);
  };

  const removeFavorite = async (favorite: Favorite) => {
    try {
      const params = new URLSearchParams({
        type: favorite.type,
        ...(favorite.type === 'session' ? { sessionId: favorite.sessionId! } : { speakerId: favorite.speakerId! })
      });

      const response = await fetch(`/api/favorites?${params.toString()}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.id !== favorite.id));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const updateNotes = async (favorite: Favorite) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: favorite.type,
          ...(favorite.type === 'session' ? { sessionId: favorite.sessionId } : { speakerId: favorite.speakerId }),
          notes: notes[favorite.id]
        })
      });

      if (response.ok) {
        setEditingNotes(null);
        // Update local state
        setFavorites(prev => prev.map(f =>
          f.id === favorite.id ? { ...f, notes: notes[favorite.id] } : f
        ));
      }
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate Smart Agenda
  const generateSmartAgenda = async () => {
    if (!session) {
      setAgendaError('Please sign in to generate a personalized agenda');
      return;
    }

    setGeneratingAgenda(true);
    setAgendaError(null);

    try {
      const response = await fetch('/api/tools/agenda-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: {
            includeMeals: true,
            maxSessionsPerDay: 8,
            preferredTracks: [],
            avoidTracks: [],
            startTime: '8:00 AM',
            endTime: '6:00 PM',
            minimumBreakMinutes: 15,
            maximumWalkingMinutes: 15
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresAuth) {
          setAgendaError('Please sign in to generate your agenda');
          router.push('/auth/signin');
        } else {
          setAgendaError(data.error || 'Failed to generate agenda');
        }
        return;
      }

      setSmartAgenda(data.agenda);
      setShowAgenda(true);
    } catch (error) {
      console.error('Error generating agenda:', error);
      setAgendaError('Failed to generate agenda. Please try again.');
    } finally {
      setGeneratingAgenda(false);
    }
  };

  // Handle agenda item removal
  const handleAgendaItemRemove = (itemId: string) => {
    if (!smartAgenda) return;

    // Update the agenda by removing the item
    const updatedAgenda = { ...smartAgenda };
    updatedAgenda.days = updatedAgenda.days.map(day => ({
      ...day,
      schedule: day.schedule.filter(item => item.id !== itemId)
    }));

    setSmartAgenda(updatedAgenda);
  };

  // Handle agenda item replacement
  const handleAgendaItemReplace = (itemId: string, alternativeId: string) => {
    // This would need to fetch the alternative session and replace it
    console.log('Replace item', itemId, 'with', alternativeId);
    // Implementation would go here
  };

  // Handle day regeneration
  const handleRegenerateDay = async (dayNumber: number) => {
    console.log('Regenerate day', dayNumber);
    // Re-generate just one day
    await generateSmartAgenda();
  };

  // Handle export
  const handleExport = async (format: 'ics' | 'pdf' | 'email') => {
    if (!smartAgenda) return;

    try {
      const response = await fetch('/api/tools/agenda-builder/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, agenda: smartAgenda })
      });

      if (format === 'ics') {
        // For ICS, download the file directly
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'itc-vegas-2025-agenda.ics';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === 'pdf') {
        // For PDF, we get HTML that could be converted
        const data = await response.json();
        if (data.success) {
          // Open HTML in new window for printing/saving as PDF
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            // Safely set HTML content using innerHTML after sanitization
            // Import DOMPurify at the top of the file
            const DOMPurify = (await import('isomorphic-dompurify')).default;
            const sanitizedHTML = DOMPurify.sanitize(data.html);
            printWindow.document.body.innerHTML = sanitizedHTML;
            printWindow.document.close();
            printWindow.print();
          }
        }
      } else if (format === 'email') {
        // For email, show confirmation
        const data = await response.json();
        if (data.success) {
          alert(`Agenda will be sent to ${data.recipient}`);
        }
      }
    } catch (error) {
      console.error('Error exporting agenda:', error);
      setAgendaError('Failed to export agenda');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="h-16"></div>
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

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="h-16"></div>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Sign In to View Your Favorites
            </h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create an account or sign in to save your favorite sessions and speakers,
              build your personalized schedule, and get the most out of ITC Vegas 2025.
            </p>
            <div className="space-y-4 max-w-sm mx-auto">
              <Link
                href="/auth/signin"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </Link>
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Continue browsing without signing in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="h-16"></div>

      {/* User Dashboard Navigation */}
      <UserDashboard activeTab="favorites" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-current" />
                My Favorites
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {favorites.length} saved {favorites.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {/* Smart Agenda Button */}
            {favorites.length > 0 && (
              <button
                onClick={generateSmartAgenda}
                disabled={generatingAgenda}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  generatingAgenda
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {generatingAgenda ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Smart Agenda
                  </>
                )}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                All ({favorites.length})
              </button>
              <button
                onClick={() => setFilterType('session')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'session'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                Sessions ({favorites.filter(f => f.type === 'session').length})
              </button>
              <button
                onClick={() => setFilterType('speaker')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'speaker'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                Speakers ({favorites.filter(f => f.type === 'speaker').length})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">
              {searchQuery
                ? 'No favorites match your search'
                : filterType === 'all'
                ? 'No favorites yet'
                : `No ${filterType} favorites yet`}
            </p>
            {favorites.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Start exploring sessions and speakers to build your collection
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFavorites.map(favorite => (
              <div
                key={favorite.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                {favorite.type === 'session' && favorite.session ? (
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <Link
                        href={`/agenda/session/${favorite.session.id}`}
                        className="flex-1"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          {favorite.session.title}
                        </h3>
                      </Link>
                      <button
                        onClick={() => removeFavorite(favorite)}
                        className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove from favorites"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(favorite.session.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime(favorite.session.startTime)} - {formatTime(favorite.session.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{favorite.session.location}</span>
                      </div>
                    </div>

                    {favorite.session.speakers.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-gray-500" />
                        <div className="flex flex-wrap gap-2">
                          {favorite.session.speakers.map(s => (
                            <Link
                              key={s.speaker.id}
                              href={`/speakers/${s.speaker.id}`}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              {s.speaker.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : favorite.type === 'speaker' && favorite.speaker ? (
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <Link
                        href={`/speakers/${favorite.speaker.id}`}
                        className="flex items-start gap-3 flex-1"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {favorite.speaker.imageUrl ? (
                            <img
                              src={favorite.speaker.imageUrl}
                              alt={favorite.speaker.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-bold">
                                {favorite.speaker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {favorite.speaker.name}
                          </h3>
                          {favorite.speaker.role && (
                            <p className="text-sm text-gray-600">{favorite.speaker.role}</p>
                          )}
                          {favorite.speaker.company && (
                            <div className="flex items-center gap-1 mt-1">
                              <Building className="w-3 h-3 text-gray-400" />
                              <p className="text-xs text-gray-500">{favorite.speaker.company}</p>
                            </div>
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={() => removeFavorite(favorite)}
                        className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove from favorites"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Notes Section */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {editingNotes === favorite.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={notes[favorite.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [favorite.id]: e.target.value }))}
                        placeholder="Add notes about this favorite..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateNotes(favorite)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingNotes(null);
                            setNotes(prev => ({ ...prev, [favorite.id]: favorite.notes || '' }));
                          }}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingNotes(favorite.id)}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <StickyNote className="w-4 h-4" />
                      {favorite.notes ? (
                        <span className="italic">{favorite.notes}</span>
                      ) : (
                        <span>Add notes</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Agenda Modal/View */}
      {showAgenda && smartAgenda && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-xl shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Your Smart Conference Agenda
                  </h2>
                  <button
                    onClick={() => setShowAgenda(false)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Agenda Content */}
                <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <SmartAgendaView
                    agenda={smartAgenda}
                    onItemRemove={handleAgendaItemRemove}
                    onItemReplace={handleAgendaItemReplace}
                    onRegenerateDay={handleRegenerateDay}
                    onExport={handleExport}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {agendaError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error generating agenda</p>
              <p className="text-sm mt-1">{agendaError}</p>
            </div>
            <button
              onClick={() => setAgendaError(null)}
              className="ml-4 text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}