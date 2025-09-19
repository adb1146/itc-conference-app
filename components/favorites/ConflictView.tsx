'use client';

import Link from 'next/link';
import { Clock, MapPin, Trash2, AlertTriangle } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  track?: string;
}

interface Favorite {
  id: string;
  type: 'session' | 'speaker';
  sessionId?: string;
  session?: Session;
}

interface ConflictViewProps {
  conflictGroups: Map<string, Favorite[]>;
  formatTime: (timeStr: string) => string;
  removeFavorite: (favorite: Favorite) => void;
}

export default function ConflictView({ conflictGroups, formatTime, removeFavorite }: ConflictViewProps) {
  // Only show groups with conflicts (more than 1 session)
  const conflictGroupsArray = Array.from(conflictGroups.entries())
    .filter(([_, group]) => group.length > 1)
    .sort((a, b) => {
      const dateA = new Date(a[1][0].session?.startTime || 0).getTime();
      const dateB = new Date(b[1][0].session?.startTime || 0).getTime();
      return dateA - dateB;
    });

  if (conflictGroupsArray.length === 0) {
    return (
      <div className="text-center py-16 bg-white/50 backdrop-blur rounded-2xl border border-purple-100">
        <div className="p-3 bg-gradient-to-br from-green-100 to-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-gray-600 text-lg font-medium">No scheduling conflicts!</p>
        <p className="text-sm text-gray-500 mt-2">
          All your favorited sessions are at different times.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-orange-900">
            {conflictGroupsArray.length} Conflict Group{conflictGroupsArray.length !== 1 ? 's' : ''} Found
          </h3>
        </div>
        <p className="text-sm text-orange-700">
          Sessions grouped by overlapping time slots. You can only attend one session from each group.
        </p>
      </div>

      {/* Conflict Groups */}
      {conflictGroupsArray.map(([groupKey, group], groupIndex) => {
        const [date] = groupKey.split('|');
        const displayDate = new Date(date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        // Get the time range for this conflict group
        const times = group.map(f => ({
          start: new Date(f.session!.startTime).getTime(),
          end: new Date(f.session!.endTime).getTime(),
          startStr: f.session!.startTime,
          endStr: f.session!.endTime
        }));
        const earliestStart = Math.min(...times.map(t => t.start));
        const latestEnd = Math.max(...times.map(t => t.end));
        const startTime = formatTime(new Date(earliestStart).toISOString());
        const endTime = formatTime(new Date(latestEnd).toISOString());

        return (
          <div key={groupKey} className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
            {/* Group Header */}
            <div className="bg-gradient-to-r from-orange-100 to-yellow-50 px-5 py-3 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    {groupIndex + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {displayDate} • Overlapping Sessions
                    </h3>
                    <p className="text-sm text-gray-600">
                      Time Range: {startTime} - {endTime} • {group.length} conflicting sessions
                    </p>
                  </div>
                </div>
                <div className="text-sm text-orange-700 font-medium bg-orange-100 px-3 py-1 rounded-full">
                  Choose One
                </div>
              </div>
            </div>

            {/* Conflicting Sessions */}
            <div className="p-4 space-y-3">
              {group.map((favorite, index) => (
                <div
                  key={favorite.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/agenda/session/${favorite.session!.id}`}
                        className="text-base font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                      >
                        {favorite.session!.title}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            {formatTime(favorite.session!.startTime)} - {formatTime(favorite.session!.endTime)}
                          </span>
                        </div>
                        {favorite.session!.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{favorite.session!.location}</span>
                          </div>
                        )}
                        {favorite.session!.track && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            {favorite.session!.track}
                          </span>
                        )}
                      </div>

                      {favorite.session!.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {favorite.session!.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => removeFavorite(favorite)}
                      className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Visual conflict indicator between sessions */}
                  {index < group.length - 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                      <span className="text-xs text-orange-600 font-medium">
                        ⚠️ Conflicts with session below
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div className="bg-blue-50 border-t border-blue-100 px-5 py-3">
              <p className="text-sm text-blue-700">
                <span className="font-medium">💡 Tip:</span> Consider which session best aligns with your goals,
                or check if recordings will be available for sessions you miss.
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}