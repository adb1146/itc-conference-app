'use client';

import { useState } from 'react';
import {
  Search, Plus, Clock, MapPin, Users, AlertCircle,
  ChevronRight, X, CheckCircle, Brain, Sparkles
} from 'lucide-react';
import { searchSimilarSessions } from '@/lib/vector-db';
import type { Session } from '@prisma/client';
import type { ScheduleItem, ConflictInfo } from '@/lib/tools/schedule/types';

interface SessionSearchPanelProps {
  currentSchedule: ScheduleItem[];
  dayNumber: number;
  date: string;
  onAddSession: (session: Session, timeSlot?: string) => void;
  onClose: () => void;
}

interface SearchResult {
  session: Session;
  score: number;
  conflicts: ConflictInfo[];
  reasoning: string;
  suggestedTime?: string;
}

export default function SessionSearchPanel({
  currentSchedule,
  dayNumber,
  date,
  onAddSession,
  onClose
}: SessionSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SearchResult | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Use AI-powered vector search
      const response = await fetch('/api/agenda/search-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          date,
          currentSchedule
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setShowAIAnalysis(data.usingAI);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSession = (result: SearchResult) => {
    onAddSession(result.session, result.suggestedTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Find Sessions to Add
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Day {dayNumber} • {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by topic, speaker, or describe what you're looking for..."
              className="w-full px-4 py-3 pl-12 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* AI Indicator */}
          {showAIAnalysis && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
              <Brain className="w-4 h-4" />
              <span>Using AI to understand your search and check for conflicts</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {results.length === 0 ? (
            <div className="text-center py-12">
              {isSearching ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600">Searching sessions...</p>
                </div>
              ) : (
                <div className="text-gray-500">
                  {query ? 'No sessions found matching your search' : 'Enter a search query to find sessions'}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={result.session.id}
                  className={`border rounded-lg p-4 transition-all ${
                    result.conflicts.length > 0
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  } ${selectedSession?.session.id === result.session.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedSession(result)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Match Score */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">
                            {Math.round(result.score * 100)}% Match
                          </span>
                        </div>
                        {result.conflicts.length > 0 && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {result.conflicts.length} Conflict{result.conflicts.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Session Info */}
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {result.session.title}
                      </h3>
                      {result.session.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {result.session.description}
                        </p>
                      )}

                      {/* AI Reasoning */}
                      {result.reasoning && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-700">
                            {result.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(result.session.startTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                          {' - '}
                          {new Date(result.session.endTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                        {result.session.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {result.session.location}
                          </div>
                        )}
                        {result.session.track && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                            {result.session.track}
                          </span>
                        )}
                      </div>

                      {/* Conflicts */}
                      {result.conflicts.length > 0 && (
                        <div className="mt-3 p-2 bg-orange-100 rounded">
                          <div className="text-xs font-medium text-orange-900 mb-1">
                            Conflicts Detected:
                          </div>
                          {result.conflicts.map((conflict, idx) => (
                            <div key={idx} className="text-xs text-orange-800">
                              • {conflict.description}
                              {conflict.resolution && (
                                <div className="ml-2 text-green-700">
                                  → Suggested: {conflict.resolution}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggested Time */}
                      {result.suggestedTime && (
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <div className="flex items-center gap-2 text-xs text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            <span>Suggested time: {result.suggestedTime}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSession(result);
                      }}
                      className={`ml-4 px-4 py-2 rounded-lg transition-colors ${
                        result.conflicts.length > 0
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}