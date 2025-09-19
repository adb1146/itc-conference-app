'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star, Calendar, Users, Clock, MapPin, Building,
  Trash2, StickyNote, Filter, Search,
  LogIn, UserPlus, Sparkles, Loader2, X, AlertCircle, AlertTriangle,
  List, Grid3x3
} from 'lucide-react';
import UserDashboard from '@/components/UserDashboard';
import SmartAgendaView from '@/components/agenda/SmartAgendaView';
import ConflictView from '@/components/favorites/ConflictView';
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

export default function FavoritesClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'session' | 'speaker'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'favorites' | 'smart-agenda'>('favorites');

  // Smart Agenda states
  const [showAgenda, setShowAgenda] = useState(false);
  const [generatingAgenda, setGeneratingAgenda] = useState(false);
  const [smartAgenda, setSmartAgenda] = useState<SmartAgenda | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [sessionConflicts, setSessionConflicts] = useState<Map<string, string[]>>(new Map());
  const [viewMode, setViewMode] = useState<'list' | 'conflicts'>('list');
  const [conflictGroups, setConflictGroups] = useState<Map<string, Favorite[]>>(new Map());
  const [smartAgendaConflicts, setSmartAgendaConflicts] = useState<Map<string, any>>(new Map());

  // Check URL parameters on mount
  useEffect(() => {
    const tab = searchParams.get('tab');

    // Set active tab based on URL parameter
    if (tab === 'smart-agenda') {
      setActiveTab('smart-agenda');
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      // User is not logged in
      setLoading(false);
    } else if (session) {
      fetchFavorites();
      checkSmartAgendaConflicts();
    }
  }, [session, status]);

  useEffect(() => {
    filterFavorites();
    detectConflicts();
    checkSmartAgendaConflicts();
  }, [favorites, filterType, searchQuery]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        console.log('[FavoritesClient] Fetched favorites:', {
          total: data.favorites?.length || 0,
          sessionFavorites: data.favorites?.filter((f: any) => f.type === 'session').length || 0,
          speakerFavorites: data.favorites?.filter((f: any) => f.type === 'speaker').length || 0,
          favoriteIds: data.favorites?.filter((f: any) => f.type === 'session').map((f: any) => f.sessionId)
        });
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

  const checkSmartAgendaConflicts = async () => {
    // Only check if we have session favorites
    const sessionFavorites = favorites.filter(f => f.type === 'session' && f.session);
    console.log('[Conflict Check] Session favorites:', sessionFavorites.length);

    if (sessionFavorites.length === 0) {
      setSmartAgendaConflicts(new Map());
      return;
    }

    try {
      // Extract session IDs
      const sessionIds = sessionFavorites.map(f => f.sessionId).filter(Boolean) as string[];
      console.log('[Conflict Check] Checking conflicts for session IDs:', sessionIds);

      // Check for conflicts with Smart Agenda
      const response = await fetch('/api/conflicts/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds })
      });

      console.log('[Conflict Check] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[Conflict Check] Response data:', data);

        if (data.hasAgenda && data.results) {
          const conflictMap = new Map<string, any>();

          // Process results and store conflicts
          data.results.forEach((result: any) => {
            if (result.hasConflicts) {
              console.log('[Conflict Check] Found conflict for session:', result.sessionId, result);
              conflictMap.set(result.sessionId, result);
            }
          });

          console.log('[Conflict Check] Total conflicts found:', conflictMap.size);
          setSmartAgendaConflicts(conflictMap);
        } else {
          console.log('[Conflict Check] No agenda or no results');
          setSmartAgendaConflicts(new Map());
        }
      } else {
        console.error('[Conflict Check] API returned error:', response.status);
      }
    } catch (error) {
      console.error('[Conflict Check] Error checking Smart Agenda conflicts:', error);
      setSmartAgendaConflicts(new Map());
    }
  };

  const detectConflicts = () => {
    const conflicts = new Map<string, string[]>();
    const groups = new Map<string, Favorite[]>();
    const sessionFavorites = favorites.filter(f => f.type === 'session' && f.session);

    // Group sessions by date and overlapping time slots
    sessionFavorites.forEach(favorite => {
      if (!favorite.session) return;

      const date = new Date(favorite.session.startTime).toDateString();
      const startTime = new Date(favorite.session.startTime).getTime();
      const endTime = new Date(favorite.session.endTime).getTime();

      // Find or create a group key for overlapping sessions
      let groupKey: string | null = null;

      // Check existing groups for overlaps
      for (const [key, group] of groups.entries()) {
        const [groupDate] = key.split('|');
        if (groupDate !== date) continue;

        // Check if this session overlaps with any in the group
        const overlaps = group.some(g => {
          if (!g.session) return false;
          const gStart = new Date(g.session.startTime).getTime();
          const gEnd = new Date(g.session.endTime).getTime();
          return (startTime < gEnd && endTime > gStart);
        });

        if (overlaps) {
          groupKey = key;
          break;
        }
      }

      // Create new group if no overlap found
      if (!groupKey) {
        groupKey = `${date}|${favorite.session.startTime}`;
      }

      // Add to group
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(favorite);
    });

    // Build conflict map from groups
    for (const group of groups.values()) {
      if (group.length > 1) {
        // These sessions conflict with each other
        group.forEach((fav1, i) => {
          const session1 = fav1.session!;
          const conflictList: string[] = [];

          group.forEach((fav2, j) => {
            if (i !== j) {
              conflictList.push(fav2.session!.title);
            }
          });

          if (conflictList.length > 0) {
            conflicts.set(session1.id, conflictList);
          }
        });
      }
    }

    setSessionConflicts(conflicts);
    setConflictGroups(groups);
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
        // For email, use our schedule email endpoint
        const emailResponse = await fetch('/api/schedule/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const emailResult = await emailResponse.json();
        if (emailResult.success) {
          alert(`✅ ${emailResult.message}`);
        } else {
          alert(`❌ ${emailResult.error || 'Failed to send email'}`);
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
      <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-purple-100 p-6 sm:p-8 md:p-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Star className="w-10 h-10 text-orange-500" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-normal mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Save Your Favorites</span>
            </h1>
            <p className="text-gray-600 mb-4 max-w-md mx-auto text-lg leading-relaxed">
              Create an account or sign in to save your favorite sessions and speakers,
              build your personalized schedule, and get the most out of ITC Vegas 2025.
            </p>

            {/* Smart Agenda Call-to-Action */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6 max-w-md mx-auto border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-purple-900">You're on your way to creating your Smart Agenda!</p>
              </div>
              <p className="text-sm text-purple-700">
                Just create an account and we'll take you straight to your personalized agenda builder.
              </p>
            </div>
            <div className="space-y-4 max-w-sm mx-auto">
              <Link
                href="/auth/signin"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-white border-2 border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </Link>
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
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
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">

      {/* User Dashboard Navigation with active tab */}
      <UserDashboard activeTab={activeTab === 'smart-agenda' ? 'agenda' : 'favorites'} />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-purple-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-normal flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl shadow-md">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-orange-500 fill-current" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">My Favorites</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2 sm:ml-14">
                <span className="font-medium text-purple-600">{favorites.length}</span> saved {favorites.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {/* Smart Agenda Button */}
            {favorites.length > 0 && (
              <button
                onClick={generateSmartAgenda}
                disabled={generatingAgenda}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg ${
                  generatingAgenda
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
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

          {/* View Mode Toggle */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              List View
            </button>
            <button
              onClick={() => setViewMode('conflicts')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'conflicts'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Conflict View
              {sessionConflicts.size > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {sessionConflicts.size}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                All ({favorites.length})
              </button>
              <button
                onClick={() => setFilterType('session')}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  filterType === 'session'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Sessions ({favorites.filter(f => f.type === 'session').length})
              </button>
              <button
                onClick={() => setFilterType('speaker')}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  filterType === 'speaker'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Speakers ({favorites.filter(f => f.type === 'speaker').length})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
              <input
                type="text"
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {viewMode === 'conflicts' ? (
          <ConflictView
            conflictGroups={conflictGroups}
            formatTime={formatTime}
            removeFavorite={removeFavorite}
          />
        ) : filteredFavorites.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur rounded-2xl border border-purple-100">
            <div className="p-3 bg-gradient-to-br from-gray-100 to-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Star className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-gray-600 text-lg">
              {searchQuery
                ? 'No favorites match your search'
                : filterType === 'all'
                ? 'No favorites yet'
                : `No ${filterType} favorites yet`}
            </p>
            {favorites.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Start exploring sessions and speakers to build your collection
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFavorites.map(favorite => (
              <div
                key={favorite.id}
                className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-purple-100 p-5 hover:shadow-lg transition-all hover:border-purple-200"
              >
                {favorite.type === 'session' && favorite.session ? (
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <Link
                        href={`/agenda/session/${favorite.session.id}`}
                        className="flex-1"
                      >
                        <div className="flex items-start gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {favorite.session.title}
                          </h3>
                          {(sessionConflicts.has(favorite.session.id) || smartAgendaConflicts.has(favorite.session.id)) && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              <span>
                                {smartAgendaConflicts.has(favorite.session.id)
                                  ? `${smartAgendaConflicts.get(favorite.session.id)?.totalConflicts || 1} Conflict${smartAgendaConflicts.get(favorite.session.id)?.totalConflicts > 1 ? 's' : ''}`
                                  : 'Conflict'}
                              </span>
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

                    {(sessionConflicts.has(favorite.session.id) || smartAgendaConflicts.has(favorite.session.id)) && (
                      <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-orange-900">
                              {smartAgendaConflicts.has(favorite.session.id)
                                ? 'Smart Agenda Conflict'
                                : 'Schedule Conflict'}
                            </p>
                            <p className="text-orange-700 mt-1">
                              {smartAgendaConflicts.has(favorite.session.id)
                                ? (() => {
                                    const conflict = smartAgendaConflicts.get(favorite.session.id);
                                    if (conflict?.conflicts?.[0]) {
                                      return `This session conflicts with ${conflict.totalConflicts} session${conflict.totalConflicts > 1 ? 's' : ''} in your Smart Agenda${
                                        conflict.conflicts[0].conflictsWith?.[0]
                                          ? `: "${conflict.conflicts[0].conflictsWith[0].sessionTitle.substring(0, 50)}${conflict.conflicts[0].conflictsWith[0].sessionTitle.length > 50 ? '...' : ''}"${
                                              conflict.totalConflicts > 1 ? ' and others' : ''
                                            }`
                                          : ''
                                      }`;
                                    }
                                    return 'This session conflicts with your Smart Agenda';
                                  })()
                                : `This session conflicts with: ${sessionConflicts.get(favorite.session.id)?.join(', ')}`}
                            </p>
                            <Link
                              href="/smart-agenda"
                              className="inline-flex items-center gap-1 mt-2 text-orange-700 hover:text-orange-800 font-medium"
                            >
                              <Sparkles className="w-3 h-3" />
                              {smartAgendaConflicts.has(favorite.session.id)
                                ? 'View Smart Agenda →'
                                : 'Resolve with Smart Agenda →'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

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

                    {/* Add to Calendar Button */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <a
                        href={`/api/calendar/add?${new URLSearchParams({
                          title: favorite.session.title,
                          date: formatDate(favorite.session.startTime),
                          time: `${formatTime(favorite.session.startTime)} - ${formatTime(favorite.session.endTime)}`,
                          location: favorite.session.location,
                          description: favorite.session.description.substring(0, 200),
                          speakers: favorite.session.speakers.map(s => s.speaker.name).join(',')
                        }).toString()}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Add to Calendar
                      </a>
                    </div>
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