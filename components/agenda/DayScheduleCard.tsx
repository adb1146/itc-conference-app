'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Calendar } from 'lucide-react';
import { DaySchedule } from '@/lib/tools/schedule/types';
import ScheduleItemCard from './ScheduleItemCard';

interface DayScheduleCardProps {
  day: DaySchedule;
  onItemRemove?: (itemId: string) => void;
  onItemReplace?: (itemId: string, alternativeId: string) => void;
  onItemFavorite?: (sessionId: string) => Promise<void>;
  editMode?: boolean;
  favorites?: string[];
  favoriteLoading?: string | null;
  showAlternatives?: Set<string>;
  setShowAlternatives?: (value: Set<string>) => void;
  dayConflicts?: Array<{
    session1: any;
    session2: any;
    timeOverlap: string;
  }>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function DayScheduleCard({
  day,
  onItemRemove,
  onItemReplace,
  onItemFavorite,
  editMode = false,
  favorites = [],
  favoriteLoading = null,
  showAlternatives = new Set(),
  setShowAlternatives,
  dayConflicts = [],
  isExpanded: controlledIsExpanded,
  onToggleExpand
}: DayScheduleCardProps) {
  // Use controlled expansion if provided, otherwise use local state
  const [localIsExpanded, setLocalIsExpanded] = useState(true);
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : localIsExpanded;
  const setIsExpanded = onToggleExpand || ((value: boolean) => setLocalIsExpanded(value));
  const [showConflictDetails, setShowConflictDetails] = useState(false);

  // Create conflict groups with unique colors
  const getConflictGroups = () => {
    const groups = new Map<string, { sessions: Set<string>; color: string }>();
    const colors = [
      { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-500', badge: 'bg-red-500' },
      { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-800', ring: 'ring-orange-500', badge: 'bg-orange-500' },
      { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-800', ring: 'ring-purple-500', badge: 'bg-purple-500' },
      { border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-800', ring: 'ring-pink-500', badge: 'bg-pink-500' },
      { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-800', ring: 'ring-indigo-500', badge: 'bg-indigo-500' },
      { border: 'border-teal-500', bg: 'bg-teal-50', text: 'text-teal-800', ring: 'ring-teal-500', badge: 'bg-teal-500' },
    ];

    let colorIndex = 0;

    dayConflicts.forEach(conflict => {
      const key1 = conflict.session1.id;
      const key2 = conflict.session2.id;

      // Check if either session is already in a group
      let existingGroup: string | null = null;
      groups.forEach((group, groupId) => {
        if (group.sessions.has(key1) || group.sessions.has(key2)) {
          existingGroup = groupId;
        }
      });

      if (existingGroup) {
        // Add both sessions to existing group
        groups.get(existingGroup)!.sessions.add(key1);
        groups.get(existingGroup)!.sessions.add(key2);
      } else {
        // Create new group
        const groupId = `group-${colorIndex}`;
        groups.set(groupId, {
          sessions: new Set([key1, key2]),
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      }
    });

    // Create a map from session ID to color
    const sessionColors = new Map<string, any>();
    groups.forEach(group => {
      group.sessions.forEach(sessionId => {
        sessionColors.set(sessionId, group.color);
      });
    });

    return sessionColors;
  };

  const conflictColors = getConflictGroups();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Count conflicts for this day
  const conflictCount = dayConflicts.length;
  const hasConflicts = conflictCount > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Day Header */}
      <div
        className={`px-6 py-4 cursor-pointer transition-colors ${
          hasConflicts ? 'bg-red-50 border-b-2 border-red-200' : 'bg-gray-50 border-b border-gray-200'
        } hover:bg-opacity-80`}
        onClick={() => {
          if (onToggleExpand) {
            onToggleExpand();
          } else {
            setLocalIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              Day {day.dayNumber} - {formatDate(day.date)}
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-white rounded-full text-gray-600">
                {day.stats.totalSessions} sessions
              </span>
              {day.stats.favoritesCount > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                  {day.stats.favoritesCount} favorites
                </span>
              )}
              {day.stats.aiSuggestionsCount > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {day.stats.aiSuggestionsCount} AI picks
                </span>
              )}
              {hasConflicts && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConflictDetails(!showConflictDetails);
                  }}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1 hover:bg-red-200 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>

        {/* Conflict Details (shown when clicked) */}
        {hasConflicts && showConflictDetails && (
          <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-900 mb-2">Scheduling Conflicts Detected:</p>
                <ul className="space-y-1 text-red-800">
                  {dayConflicts.slice(0, 3).map((conflict, idx) => (
                    <li key={idx}>
                      • "{conflict.session1.item.title}" conflicts with "{conflict.session2.item.title}"
                      <span className="text-red-600 ml-1">({conflict.timeOverlap})</span>
                    </li>
                  ))}
                  {dayConflicts.length > 3 && (
                    <li className="font-medium">• ... and {dayConflicts.length - 3} more conflicts</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Schedule Items */}
      {isExpanded && (
        <div className="p-4 pl-8 space-y-3">
          {day.schedule.map((item) => {
            // Check if this item is involved in a conflict
            const isConflicting = dayConflicts.some(conflict =>
              conflict.session1.id === item.id || conflict.session2.id === item.id
            );

            // Get the conflict color for this session
            const conflictColor = conflictColors.get(item.id);

            // Get the conflict details for this item
            const itemConflict = dayConflicts.find(conflict =>
              conflict.session1.id === item.id || conflict.session2.id === item.id
            );

            const conflictPartner = itemConflict ?
              (itemConflict.session1.id === item.id ? itemConflict.session2 : itemConflict.session1) : null;

            return (
              <div
                key={item.id}
                className={`border rounded-lg p-4 transition-all ${
                  item.source === 'user-favorite'
                    ? 'border-amber-300 bg-amber-50'
                    : item.source === 'ai-suggested'
                    ? 'border-blue-200 bg-blue-50/50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >

                <ScheduleItemCard
                  key={item.id}
                  item={item}
                  onRemove={editMode && onItemRemove ? () => onItemRemove(item.id) : undefined}
                  onReplace={onItemReplace}
                  onFavorite={onItemFavorite}
                  isFavorited={favorites.includes(item.id.replace('item-', ''))}
                  isFavoriteLoading={favoriteLoading === item.id.replace('item-', '')}
                  showAlternatives={showAlternatives?.has(item.id) || false}
                  onToggleAlternatives={() => {
                    if (setShowAlternatives) {
                      const newSet = new Set(showAlternatives);
                      if (newSet.has(item.id)) {
                        newSet.delete(item.id);
                      } else {
                        newSet.add(item.id);
                      }
                      setShowAlternatives(newSet);
                    }
                  }}
                  hasConflict={isConflicting}
                  conflictsWith={conflictPartner ? [conflictPartner.item.title] : []}
                  conflictColor={conflictColor}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}