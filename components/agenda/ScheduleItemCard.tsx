'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Star, Bot, Coffee, Utensils, Navigation, Calendar, ChevronDown, ChevronUp, Trash2, Search, AlertTriangle } from 'lucide-react';
import { ScheduleItem } from '@/lib/tools/schedule/types';

interface ScheduleItemCardProps {
  item: ScheduleItem;
  onRemove?: () => void;
  onReplace?: (itemId: string, alternativeId: string) => void;
  onFavorite?: (sessionId: string) => Promise<void>;
  isFavorited?: boolean;
  isFavoriteLoading?: boolean;
  showAlternatives?: boolean;
  onToggleAlternatives?: () => void;
  hasConflict?: boolean;
  conflictsWith?: string[];
  conflictColor?: {
    border: string;
    bg: string;
    text: string;
    ring: string;
    badge: string;
  };
}

export default function ScheduleItemCard({
  item,
  onRemove,
  onReplace,
  onFavorite,
  isFavorited = false,
  isFavoriteLoading = false,
  showAlternatives = false,
  onToggleAlternatives,
  hasConflict = false,
  conflictsWith = [],
  conflictColor,
}: ScheduleItemCardProps) {
  const getItemIcon = () => {
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

  const getSourceBadge = () => {
    if (item.source === 'user-favorite') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
          <Star className="w-3 h-3 mr-1" />
          Favorite
        </span>
      );
    }
    if (item.source === 'ai-suggested') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          <Bot className="w-3 h-3 mr-1" />
          AI Pick
        </span>
      );
    }
    if (item.source === 'parallel-track') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
          <Navigation className="w-3 h-3 mr-1" />
          Optional
        </span>
      );
    }
    return null;
  };

  const formatTime = (timeStr: string): string => {
    // Times are already formatted from backend, just return as-is
    return timeStr;
  };

  const Icon = getItemIcon();
  const isSession = item.type === 'session';
  const isOptional = item.priority === 'optional';

  return (
    <div className={`flex justify-between items-start ${
      hasConflict && !isOptional && conflictColor
        ? `${conflictColor.bg} rounded-lg p-2`
        : ''
    }`}>
        <div className="flex-1">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-2 mb-1">
              {/* Colored conflict indicator triangle */}
              {hasConflict && !isOptional && conflictColor && (
                <div className={`flex items-center justify-center w-6 h-6 rounded ${conflictColor.badge}`}>
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
              )}
              {isSession && item.item.id ? (
                <Link
                  href={`/sessions/${item.item.id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600 transition-colors underline decoration-gray-300 hover:decoration-blue-600"
                >
                  {item.item.title}
                </Link>
              ) : (
                <h3 className="font-semibold text-gray-900">{item.item.title}</h3>
              )}
              {getSourceBadge()}
              {item.type === 'session' && item.item.track && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {item.item.track}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(item.time)} - {formatTime(item.endTime)}
              </span>
              {item.item.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {item.item.location}
                </span>
              )}
            </div>

            {item.item.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {item.item.description}
              </p>
            )}

            {item.item.speakers && item.item.speakers.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">Speakers: </span>
                <span className="text-xs text-gray-700">
                  {item.item.speakers.map((speaker, index) => (
                    <span key={speaker.id || speaker.name}>
                      {speaker.id ? (
                        <Link
                          href={`/speakers/${speaker.id}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {speaker.name}
                        </Link>
                      ) : (
                        speaker.name
                      )}
                      {index < item.item.speakers.length - 1 && ', '}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* Conflict Warning */}
            {hasConflict && conflictsWith.length > 0 && !isOptional && (
              <div className={`mt-2 p-2 rounded-lg border ${
                conflictColor
                  ? `${conflictColor.bg} ${conflictColor.border}`
                  : 'bg-red-100 border-red-200'
              }`}>
                <div className={`text-xs font-medium ${
                  conflictColor ? conflictColor.text : 'text-red-800'
                }`}>
                  ⚠️ Conflicts with: {conflictsWith.join(', ')}
                </div>
                <div className={`text-xs mt-1 ${
                  conflictColor ? conflictColor.text : 'text-red-700'
                }`}>
                  Choose one session or check alternatives
                </div>
              </div>
            )}

            {/* Alternatives Section */}
            {item.alternatives && item.alternatives.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={onToggleAlternatives}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {showAlternatives ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide alternatives
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show {item.alternatives.length} alternative{item.alternatives.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>

                {showAlternatives && (
                  <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                    {item.alternatives.map((alt, altIdx) => (
                      <div key={altIdx} className="text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">{alt.title}</div>
                            <div className="text-xs text-gray-600">
                              {alt.time} at {alt.location}
                            </div>
                            {alt.description && (
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {alt.description}
                              </div>
                            )}
                          </div>
                          {onReplace && alt.id && (
                            <button
                              onClick={() => onReplace(item.id, alt.id)}
                              className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                            >
                              Replace
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-4">
        {isSession && onFavorite && (
          <button
            onClick={() => onFavorite(item.id.replace('item-', ''))}
            disabled={isFavoriteLoading}
            className={`p-2 ${
              isFavorited
                ? 'text-yellow-600 bg-yellow-100'
                : 'text-gray-600 hover:bg-white'
            } rounded-lg transition-colors`}
            title={isFavorited ? 'Unfavorite' : 'Favorite'}
          >
            <Star
              className={`w-4 h-4 ${
                isFavorited ? 'fill-current' : ''
              }`}
            />
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-2 text-red-600 hover:bg-white rounded-lg transition-colors"
            title="Remove from schedule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}