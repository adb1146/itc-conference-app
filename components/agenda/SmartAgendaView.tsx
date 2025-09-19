'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SmartAgenda, ScheduleItem, DaySchedule } from '@/lib/tools/schedule/types';
import {
  Calendar, Clock, MapPin, Star, Bot, Coffee,
  Utensils, Navigation, AlertCircle, AlertTriangle, RefreshCw, X,
  Download, Mail, ChevronDown, ChevronUp, Sparkles,
  Edit2, Trash2, Plus, CheckCircle, Brain, Search
} from 'lucide-react';
import AIReasoningPanel from './AIReasoningPanel';
import SessionSearchPanel from './SessionSearchPanel';
import ConflictResolutionModal from './ConflictResolutionModal';
import DayScheduleCard from './DayScheduleCard';

// Helper function to format time in Las Vegas timezone
// Since times are already formatted (e.g., "9:00 AM"), we just return them as-is
// They are already in Las Vegas timezone from the backend
const formatTimeToLasVegas = (timeString: string): string => {
  return timeString; // Times are already formatted in Las Vegas timezone
};

interface SmartAgendaViewProps {
  agenda: SmartAgenda;
  onItemRemove?: (itemId: string) => void;
  onItemReplace?: (itemId: string, alternativeId: string) => void;
  onRegenerateDay?: (dayNumber: number) => void;
  onExport?: (format: 'ics' | 'pdf' | 'email') => void;
  onItemFavorite?: (sessionId: string) => void;
  editable?: boolean;
}

export default function SmartAgendaView({
  agenda,
  onItemRemove,
  onItemReplace,
  onRegenerateDay,
  onExport,
  onItemFavorite,
  editable = true
}: SmartAgendaViewProps) {
  const { data: session, status } = useSession();
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [showAlternatives, setShowAlternatives] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [searchingDay, setSearchingDay] = useState<{dayNumber: number, date: string} | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<any[]>([]);
  const [dayConflicts, setDayConflicts] = useState<Map<number, any[]>>(new Map());
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFavorites();
    }
  }, [status]);

  useEffect(() => {
    // Detect conflicts when agenda changes
    detectConflicts();
  }, [agenda]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites?.filter((f: any) => f.type === 'session').map((f: any) => f.sessionId) || []);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (status !== 'authenticated') {
      return;
    }

    setFavoriteLoading(sessionId);
    const isFavorited = favorites.includes(sessionId);

    try {
      let response;
      if (isFavorited) {
        response = await fetch(`/api/favorites?type=session&sessionId=${sessionId}`, {
          method: 'DELETE'
        });
      } else {
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
        // Call parent handler if provided
        onItemFavorite?.(sessionId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(null);
    }
  };

  // Simple wrapper for component usage without event
  const handleFavorite = async (sessionId: string) => {
    if (status !== 'authenticated') {
      return;
    }

    setFavoriteLoading(sessionId);
    const isFavorited = favorites.includes(sessionId);

    try {
      let response;
      if (isFavorited) {
        response = await fetch(`/api/favorites?type=session&sessionId=${sessionId}`, {
          method: 'DELETE'
        });
      } else {
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
        // Call parent handler if provided
        onItemFavorite?.(sessionId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(null);
    }
  };

  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber);
    } else {
      newExpanded.add(dayNumber);
    }
    setExpandedDays(newExpanded);
  };

  const toggleAlternatives = (itemId: string) => {
    const newShow = new Set(showAlternatives);
    if (newShow.has(itemId)) {
      newShow.delete(itemId);
    } else {
      newShow.add(itemId);
    }
    setShowAlternatives(newShow);
  };

  const getItemIcon = (item: ScheduleItem) => {
    if (item.type === 'meal') {
      if (item.item.title.toLowerCase().includes('breakfast')) return Coffee;
      if (item.item.title.toLowerCase().includes('lunch')) return Utensils;
      if (item.item.title.toLowerCase().includes('dinner')) return Utensils;
      return Coffee;
    }
    if (item.type === 'travel') return Navigation;
    if (item.type === 'break') return Coffee;
    return Calendar;
  };

  const getSourceBadge = (item: ScheduleItem) => {
    const sessionId = item.id.replace('item-', '');
    const isNowFavorited = favorites.includes(sessionId);

    if (item.source === 'user-favorite' || (item.source === 'ai-suggested' && isNowFavorited)) {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
          <Star className="w-3 h-3 mr-1" />
          {item.source === 'user-favorite' ? 'Your Favorite' : 'Now Favorited'}
        </span>
      );
    }
    if (item.source === 'ai-suggested') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          <Bot className="w-3 h-3 mr-1" />
          AI Suggested
        </span>
      );
    }
    return null;
  };

  const selectDay = (dayNumber: number) => {
    // Collapse all other days and only expand the selected one
    const newExpanded = new Set([dayNumber]);
    setExpandedDays(newExpanded);

    // Scroll to the day
    setTimeout(() => {
      const element = document.getElementById(`day-${dayNumber}`);
      if (element) {
        const yOffset = -100; // Offset for fixed header
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const detectConflicts = () => {
    const conflicts: any[] = [];

    // Check each day for time conflicts
    agenda.days.forEach(day => {
      // Include all items that are actual sessions (not just type === 'session')
      // Exclude only breaks and travel time
      const attendableItems = day.schedule.filter(item =>
        item.type === 'session' ||
        item.type === 'meal' ||
        (item.type === 'other' && !item.item.title.toLowerCase().includes('break'))
      );

      // Focus on favorited items - check both marked as user-favorite AND items that match current favorites
      const sessionIds = attendableItems.map(item => item.id.replace('item-', ''));
      const favoriteItems = attendableItems.filter(item => {
        const sessionId = item.id.replace('item-', '');
        // Check if it's marked as user-favorite OR if it's in the current favorites list
        return item.source === 'user-favorite' || favorites.includes(sessionId);
      });

      // Check conflicts between favorited items (highest priority)
      for (let i = 0; i < favoriteItems.length; i++) {
        for (let j = i + 1; j < favoriteItems.length; j++) {
          const session1 = favoriteItems[i];
          const session2 = favoriteItems[j];

          // Skip EXPO Floor sessions completely - they don't cause conflicts
          const isSession1Expo = session1.item.title?.toLowerCase().includes('expo floor') ||
                                session1.item.location?.toLowerCase().includes('expo');
          const isSession2Expo = session2.item.title?.toLowerCase().includes('expo floor') ||
                                session2.item.location?.toLowerCase().includes('expo');

          if (isSession1Expo || isSession2Expo) {
            continue; // Skip any conflict checks involving EXPO Floor
          }

          // Parse times to compare
          const start1 = parseTimeToMinutes(session1.time);
          const end1 = parseTimeToMinutes(session1.endTime);
          const start2 = parseTimeToMinutes(session2.time);
          const end2 = parseTimeToMinutes(session2.endTime);

          // Check if times overlap (even partial overlap matters for favorites)
          if ((start1 < end2 && end1 > start2) || (start2 < end1 && end2 > start1)) {
            // Calculate overlap duration
            const overlapStart = Math.max(start1, start2);
            const overlapEnd = Math.min(end1, end2);
            const overlapMinutes = overlapEnd - overlapStart;

            conflicts.push({
              session1,
              session2,
              timeOverlap: `${overlapMinutes} min overlap`,
              day: day.dayNumber,
              priority: 'high' // Conflicts between favorites are high priority
            });
          }
        }
      }

      // Also check conflicts between favorites and other important sessions
      for (let i = 0; i < favoriteItems.length; i++) {
        const nonFavorites = attendableItems.filter(item =>
          item.source !== 'user-favorite'
        );

        for (let j = 0; j < nonFavorites.length; j++) {
          const session1 = favoriteItems[i];
          const session2 = nonFavorites[j];

          // Skip EXPO Floor sessions completely - they don't cause conflicts
          const isSession1Expo = session1.item.title?.toLowerCase().includes('expo floor') ||
                                session1.item.location?.toLowerCase().includes('expo');
          const isSession2Expo = session2.item.title?.toLowerCase().includes('expo floor') ||
                                session2.item.location?.toLowerCase().includes('expo');

          if (isSession1Expo || isSession2Expo) {
            continue; // Skip any conflict checks involving EXPO Floor
          }

          const start1 = parseTimeToMinutes(session1.time);
          const end1 = parseTimeToMinutes(session1.endTime);
          const start2 = parseTimeToMinutes(session2.time);
          const end2 = parseTimeToMinutes(session2.endTime);

          if ((start1 < end2 && end1 > start2) || (start2 < end1 && end2 > start1)) {
            const overlapStart = Math.max(start1, start2);
            const overlapEnd = Math.min(end1, end2);
            const overlapMinutes = overlapEnd - overlapStart;

            // Only include significant overlaps (more than 15 minutes)
            if (overlapMinutes > 15) {
              conflicts.push({
                session1,
                session2,
                timeOverlap: `${overlapMinutes} min overlap`,
                day: day.dayNumber,
                priority: 'medium'
              });
            }
          }
        }
      }
    });

    // Sort conflicts by priority and day
    conflicts.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return a.day - b.day;
    });

    setDetectedConflicts(conflicts);

    // Organize conflicts by day
    const conflictsByDay = new Map<number, any[]>();
    conflicts.forEach(conflict => {
      const dayConflicts = conflictsByDay.get(conflict.day) || [];
      dayConflicts.push(conflict);
      conflictsByDay.set(conflict.day, dayConflicts);
    });
    setDayConflicts(conflictsByDay);
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    // Parse time string like "9:00 AM" to minutes since midnight
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const isPM = match[3] === 'PM';

    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const handleConflictResolution = async (resolutions: { keep: string; alternative: string }[]) => {
    // Handle the conflict resolution
    console.log('Resolving conflicts:', resolutions);

    // Close the modal immediately for better UX
    setShowConflictModal(false);

    // Process each resolution by removing the alternative sessions
    for (const resolution of resolutions) {
      // Remove the session that wasn't chosen
      if (onItemRemove) {
        await onItemRemove(resolution.alternative);
      }
    }

    // Wait a moment for the parent state to update
    setTimeout(() => {
      // Clear the conflicts and re-detect
      // The useEffect will re-run when agenda prop changes
      detectConflicts();
    }, 100);

    // Show success message
    const removedCount = resolutions.length;
    console.log(`✅ Successfully resolved ${removedCount} conflict${removedCount > 1 ? 's' : ''}`);
  };

  return (
    <div className="space-y-6">
      {/* Quick Day Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Quick Jump:</span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setExpandedDays(new Set(agenda.days.map(d => d.dayNumber)))}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                Show All
              </button>
            {agenda.days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => selectDay(day.dayNumber)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Calendar className="w-3 h-3 hidden sm:inline" />
                Day {day.dayNumber} - {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
                <span className="hidden sm:inline text-xs text-purple-600 ml-1">
                  ({day.stats.totalSessions})
                </span>
              </button>
            ))}
            </div>
          </div>

          {/* Favorites Filter Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                showFavoritesOnly
                  ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Star className={`w-3 h-3 sm:w-4 sm:h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{showFavoritesOnly ? 'Showing Favorites Only' : 'Show Favorites Only'}</span>
              <span className="sm:hidden">{showFavoritesOnly ? 'Favorites' : 'Favorites'}</span>
            </button>
            {showFavoritesOnly && (
              <span className="text-xs sm:text-sm text-gray-600">
                ({favorites.length} favorites)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header with metrics */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Your Smart Agenda
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Generated {new Date(agenda.generatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/Los_Angeles'
              })} PT
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* AI Status Badge */}
            {agenda.usingAI ? (
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg flex items-center gap-1.5 sm:gap-2">
                <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">AI Active</span>
              </div>
            ) : (
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-600 rounded-lg flex items-center gap-1.5 sm:gap-2">
                <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">Basic Mode</span>
              </div>
            )}

            {editable && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                  editMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">{editMode ? 'Done Editing' : 'Edit Mode'}</span>
                <span className="sm:hidden">{editMode ? 'Done' : 'Edit'}</span>
              </button>
            )}

            <button
              onClick={() => onExport?.('email')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Mail className="w-4 h-4 inline mr-2" />
              Email My Schedule
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {agenda.metrics.favoritesIncluded}/{agenda.metrics.totalFavorites}
            </div>
            <div className="text-xs text-gray-600">Favorites Included</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-900">
              {agenda.metrics.aiSuggestionsAdded}
            </div>
            <div className="text-xs text-blue-700">AI Suggestions</div>
          </div>
          <div
            className="bg-orange-50 rounded-lg p-3 cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => (detectedConflicts.length > 0 || agenda.metrics.favoritesIncluded < agenda.metrics.totalFavorites) && setShowConflictModal(true)}
          >
            <div className="text-2xl font-bold text-orange-900 flex items-center gap-2">
              {agenda.metrics.favoritesIncluded < agenda.metrics.totalFavorites
                ? agenda.metrics.totalFavorites - agenda.metrics.favoritesIncluded
                : detectedConflicts.length}
              {(detectedConflicts.length > 0 || agenda.metrics.favoritesIncluded < agenda.metrics.totalFavorites) && (
                <AlertTriangle className="w-5 h-5 text-orange-600 animate-pulse" />
              )}
            </div>
            <div className="text-xs text-orange-700">
              {agenda.metrics.favoritesIncluded < agenda.metrics.totalFavorites
                ? 'Favorites with conflicts'
                : detectedConflicts.length > 0
                  ? 'Click to resolve conflicts'
                  : 'No conflicts'}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-900">
              {agenda.days.reduce((sum, day) => sum + day.stats.totalSessions, 0)}
            </div>
            <div className="text-xs text-purple-700">Total Sessions</div>
          </div>
        </div>

        {/* Smart Tip or Missing Favorites Warning */}
        {agenda.metrics.favoritesIncluded < agenda.metrics.totalFavorites ? (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-orange-900 mb-1">
                  ⚠️ {agenda.metrics.totalFavorites - agenda.metrics.favoritesIncluded} Favorite{agenda.metrics.totalFavorites - agenda.metrics.favoritesIncluded > 1 ? 's' : ''} Couldn't Be Scheduled
                </div>
                <p className="text-orange-700">
                  Some of your favorited sessions conflict with each other or with higher-priority items. The AI selected the best combination to maximize your conference value.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-2">
              <Star className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-purple-900 mb-1">💡 Smart Tip</div>
                <p className="text-purple-700">
                  Favorite sessions to quickly add them to your calendar and ensure they're automatically included in future Smart Agenda generations. Your favorites are always prioritized!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Reasoning and Profile Coaching */}
        <div className="mt-4">
          <AIReasoningPanel
            reasoning={agenda.aiReasoning}
            profileCoaching={agenda.profileCoaching}
            profileCompleteness={agenda.metrics.profileCompleteness}
            usingAI={agenda.usingAI}
            showByDefault={false}
          />
        </div>


        {/* Conflicts */}
        {detectedConflicts.length > 0 && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-900">
                <div className="font-medium mb-1 flex items-center gap-2">
                  Conflicts Detected:
                  <button
                    onClick={() => setShowConflictModal(true)}
                    className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                  >
                    Resolve Now
                  </button>
                </div>
                <ul className="space-y-1">
                  {detectedConflicts.slice(0, 3).map((conflict, idx) => (
                    <li key={idx}>
                      • Day {conflict.day}: "{conflict.session1.item.title}" conflicts with "{conflict.session2.item.title}" ({conflict.timeOverlap})
                    </li>
                  ))}
                  {detectedConflicts.length > 3 && (
                    <li className="text-orange-700">• ...and {detectedConflicts.length - 3} more conflict{detectedConflicts.length - 3 > 1 ? 's' : ''}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Schedules */}
      {agenda.days.map((day) => {
        // Filter the day's schedule if showing favorites only
        const filteredDay = showFavoritesOnly ? {
          ...day,
          schedule: day.schedule.filter(item => {
            const sessionId = item.id.replace('item-', '');
            return item.source === 'user-favorite' || favorites.includes(sessionId);
          }),
          stats: {
            ...day.stats,
            totalSessions: day.schedule.filter(item => {
              const sessionId = item.id.replace('item-', '');
              return item.source === 'user-favorite' || favorites.includes(sessionId);
            }).length
          }
        } : day;

        // Skip days with no favorites when filter is active
        if (showFavoritesOnly && filteredDay.schedule.length === 0) {
          return null;
        }

        return (
        <DayScheduleCard
          key={day.dayNumber}
          day={filteredDay}
          onItemRemove={editable ? onItemRemove : undefined}
          onItemReplace={editable ? onItemReplace : undefined}
          onItemFavorite={handleFavorite}
          editMode={editMode}
          favorites={favorites}
          favoriteLoading={favoriteLoading}
          showAlternatives={showAlternatives}
          setShowAlternatives={setShowAlternatives}
          dayConflicts={dayConflicts.get(day.dayNumber) || []}
          isExpanded={expandedDays.has(day.dayNumber)}
          onToggleExpand={() => {
            const newExpanded = new Set(expandedDays);
            if (expandedDays.has(day.dayNumber)) {
              newExpanded.delete(day.dayNumber);
            } else {
              newExpanded.add(day.dayNumber);
            }
            setExpandedDays(newExpanded);
          }}
        />
        );
      })}

      {/* No Favorites Message */}
      {showFavoritesOnly && agenda.days.every(day => {
        const favoriteCount = day.schedule.filter(item => {
          const sessionId = item.id.replace('item-', '');
          return item.source === 'user-favorite' || favorites.includes(sessionId);
        }).length;
        return favoriteCount === 0;
      }) && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Favorites Yet</h3>
          <p className="text-gray-600 mb-4">
            Start adding your favorite sessions to see them here.
          </p>
          <button
            onClick={() => setShowFavoritesOnly(false)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            View All Sessions
          </button>
        </div>
      )}

      {/* Session Search Panel */}
      {searchingDay && (
        <SessionSearchPanel
          currentSchedule={agenda.days.find(d => d.dayNumber === searchingDay.dayNumber)?.schedule || []}
          dayNumber={searchingDay.dayNumber}
          date={searchingDay.date}
          onAddSession={(session, timeSlot) => {
            // Handle adding session to schedule
            console.log('Adding session:', session, 'at time:', timeSlot);
            // This would typically call a parent handler to update the agenda
            setSearchingDay(null);
          }}
          onClose={() => setSearchingDay(null)}
        />
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        conflicts={detectedConflicts}
        onResolve={handleConflictResolution}
        onClose={() => setShowConflictModal(false)}
        isOpen={showConflictModal}
      />
    </div>
  );
}