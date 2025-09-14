'use client';

import { useState } from 'react';
import { SmartAgenda, ScheduleItem, DaySchedule } from '@/lib/tools/schedule/types';
import {
  Calendar, Clock, MapPin, Star, Bot, Coffee,
  Utensils, Navigation, AlertCircle, RefreshCw, X,
  Download, Mail, ChevronDown, ChevronUp, Sparkles,
  Edit2, Trash2, Plus, CheckCircle, Brain, Search
} from 'lucide-react';
import Link from 'next/link';
import AIReasoningPanel from './AIReasoningPanel';
import SessionSearchPanel from './SessionSearchPanel';

interface SmartAgendaViewProps {
  agenda: SmartAgenda;
  onItemRemove?: (itemId: string) => void;
  onItemReplace?: (itemId: string, alternativeId: string) => void;
  onRegenerateDay?: (dayNumber: number) => void;
  onExport?: (format: 'ics' | 'pdf' | 'email') => void;
  editable?: boolean;
}

export default function SmartAgendaView({
  agenda,
  onItemRemove,
  onItemReplace,
  onRegenerateDay,
  onExport,
  editable = true
}: SmartAgendaViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [showAlternatives, setShowAlternatives] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [searchingDay, setSearchingDay] = useState<{dayNumber: number, date: string} | null>(null);

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
    if (item.source === 'user-favorite') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
          <Star className="w-3 h-3 mr-1" />
          Your Favorite
        </span>
      );
    }
    if (item.source === 'ai-suggested') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          <Bot className="w-3 h-3 mr-1" />
          AI Suggested • {item.aiMetadata?.confidence}% match
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Smart Agenda
            </h2>
            <p className="text-sm text-gray-600">
              Generated {new Date(agenda.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-2">
            {/* AI Status Badge */}
            {agenda.usingAI ? (
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">AI Active</span>
              </div>
            ) : (
              <div className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">Basic Mode</span>
              </div>
            )}

            {editable && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  editMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Edit2 className="w-4 h-4 inline mr-2" />
                {editMode ? 'Done Editing' : 'Edit Mode'}
              </button>
            )}

            <div className="relative group">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 inline mr-2" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                <button
                  onClick={() => onExport?.('ics')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  📅 Calendar (ICS)
                </button>
                <button
                  onClick={() => onExport?.('pdf')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  📄 PDF Document
                </button>
                <button
                  onClick={() => onExport?.('email')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  ✉️ Email to Me
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className={`rounded-lg p-3 ${
            agenda.metrics.overallConfidence >= 80 ? 'bg-green-50' :
            agenda.metrics.overallConfidence >= 60 ? 'bg-yellow-50' :
            'bg-orange-50'
          }`}>
            <div className={`text-2xl font-bold ${
              agenda.metrics.overallConfidence >= 80 ? 'text-green-900' :
              agenda.metrics.overallConfidence >= 60 ? 'text-yellow-900' :
              'text-orange-900'
            }`}>
              {agenda.metrics.overallConfidence}%
            </div>
            <div className={`text-xs ${
              agenda.metrics.overallConfidence >= 80 ? 'text-green-700' :
              agenda.metrics.overallConfidence >= 60 ? 'text-yellow-700' :
              'text-orange-700'
            }`}>AI Confidence</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-900">
              {agenda.conflicts.length}
            </div>
            <div className="text-xs text-orange-700">Conflicts</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-900">
              {agenda.days.reduce((sum, day) => sum + day.stats.totalSessions, 0)}
            </div>
            <div className="text-xs text-purple-700">Total Sessions</div>
          </div>
        </div>

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

        {/* Suggestions */}
        {agenda.suggestions.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">AI Insights:</div>
                <ul className="space-y-1">
                  {agenda.suggestions.filter(s => !s.includes('profile') && !s.includes('interests')).map((suggestion, idx) => (
                    <li key={idx}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Conflicts */}
        {agenda.conflicts.length > 0 && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-900">
                <div className="font-medium mb-1">Conflicts Detected:</div>
                <ul className="space-y-1">
                  {agenda.conflicts.map((conflict, idx) => (
                    <li key={idx}>
                      • {conflict.description}
                      {conflict.resolution && (
                        <span className="text-green-700 ml-2">
                          → {conflict.resolution}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Schedules */}
      {agenda.days.map((day) => (
        <div key={day.dayNumber} className="bg-white rounded-lg shadow-sm">
          {/* Day Header */}
          <div
            className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleDay(day.dayNumber)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-gray-900">
                  Day {day.dayNumber} - {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-gray-600">
                    {day.stats.totalSessions} sessions
                  </span>
                  <span className="text-yellow-600">
                    {day.stats.favoritesCovered} favorites
                  </span>
                  <span className="text-blue-600">
                    {day.stats.aiSuggestions} AI picks
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editable && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchingDay({ dayNumber: day.dayNumber, date: day.date });
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Search for sessions"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegenerateDay?.(day.dayNumber);
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Regenerate day"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                )}
                {expandedDays.has(day.dayNumber) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Day Schedule Items */}
          {expandedDays.has(day.dayNumber) && (
            <div className="p-4 space-y-3">
              {day.schedule.map((item, idx) => {
                const Icon = getItemIcon(item);
                const isSession = item.type === 'session';

                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 transition-all ${
                      item.source === 'user-favorite'
                        ? 'border-yellow-300 bg-yellow-50'
                        : item.source === 'ai-suggested'
                        ? 'border-blue-200 bg-blue-50/50'
                        : 'border-gray-200 bg-gray-50'
                    } ${editMode && item.actions.canRemove ? 'hover:shadow-md' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          item.source === 'user-favorite'
                            ? 'bg-yellow-200'
                            : item.source === 'ai-suggested'
                            ? 'bg-blue-200'
                            : 'bg-gray-200'
                        }`}>
                          <Icon className="w-4 h-4 text-gray-700" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-1">
                            {isSession ? (
                              <Link
                                href={`/agenda/session/${item.item.id}`}
                                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                              >
                                {item.item.title}
                              </Link>
                            ) : (
                              <div className="font-semibold text-gray-900">
                                {item.item.title}
                              </div>
                            )}
                            {getSourceBadge(item)}
                          </div>

                          {item.item.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {item.item.description}
                            </p>
                          )}

                          {/* AI Reasoning */}
                          {item.aiMetadata && (
                            <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="text-xs text-blue-700">
                                    {item.aiMetadata.reasoning}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">Match:</span>
                                    <div className="flex items-center gap-1">
                                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="bg-blue-600 h-1.5 rounded-full"
                                          style={{ width: `${item.aiMetadata.confidence}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-blue-600">
                                        {item.aiMetadata.confidence}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.time} - {item.endTime}
                            </div>
                            {item.item.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.item.location}
                              </div>
                            )}
                            {item.item.track && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                                {item.item.track}
                              </span>
                            )}
                          </div>

                          {/* Alternatives */}
                          {item.actions.alternatives.length > 0 && showAlternatives.has(item.id) && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              <div className="text-xs font-medium text-gray-700 mb-2">
                                Alternative Options:
                              </div>
                              <div className="space-y-2">
                                {item.actions.alternatives.map((alt) => (
                                  <div
                                    key={alt.id}
                                    className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {alt.title}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {alt.confidence}% match • {alt.reasoning}
                                      </div>
                                    </div>
                                    {editMode && (
                                      <button
                                        onClick={() => onItemReplace?.(item.id, alt.id)}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                      >
                                        Switch
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {editMode && (
                        <div className="flex gap-2 ml-3">
                          {item.actions.alternatives.length > 0 && (
                            <button
                              onClick={() => toggleAlternatives(item.id)}
                              className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
                              title="Show alternatives"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {item.actions.canRemove && (
                            <button
                              onClick={() => onItemRemove?.(item.id)}
                              className="p-2 text-red-600 hover:bg-white rounded-lg transition-colors"
                              title="Remove from schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

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
    </div>
  );
}