/**
 * AgendaInsights Component
 * Displays AI-generated insights explaining why sessions were selected
 */

'use client';

import { useState } from 'react';
import { Brain, Target, Users, TrendingUp, Sparkles, Info, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AgendaInsightsProps {
  insights: {
    primaryFocus: string[];
    keyReasons: string[];
    optimizationStrategy: string;
    personalizedFor: {
      role: string;
      company: string;
      interests: string[];
    };
    stats: {
      totalSessionsAnalyzed: number;
      matchingInterests: number;
      networkingOpportunities: number;
      expertSpeakers: number;
    };
  };
}

export default function AgendaInsights({ insights }: AgendaInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!insights) return null;

  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-white rounded-2xl border border-purple-200 shadow-sm mb-6">
      {/* Header - Clickable to toggle */}
      <div
        className="px-6 py-4 border-b border-purple-100 cursor-pointer hover:bg-purple-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Insights</h3>
              <p className="text-sm text-gray-600">Why we selected these sessions for you</p>
            </div>
          </div>
          <button className="p-1 hover:bg-purple-100 rounded-lg transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Summary */}
      {!isExpanded && (
        <div className="px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              Personalized for <strong>{insights.personalizedFor.role}</strong> at <strong>{insights.personalizedFor.company}</strong>
            </span>
            {insights.personalizedFor.interests.length > 0 && (
              <div className="flex gap-1">
                {insights.personalizedFor.interests.slice(0, 3).map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                  >
                    {interest}
                  </span>
                ))}
                {insights.personalizedFor.interests.length > 3 && (
                  <span className="text-gray-500 text-xs">+{insights.personalizedFor.interests.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-purple-600 font-semibold">{insights.stats.totalSessionsAnalyzed}</span> Analyzed
            <span className="text-blue-600 font-semibold">{insights.stats.matchingInterests}</span> Matches
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Personalized For */}
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">Personalized for</p>
              <p className="text-sm text-gray-700">
                {insights.personalizedFor.role} at {insights.personalizedFor.company}
              </p>
              {insights.personalizedFor.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {insights.personalizedFor.interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optimization Strategy */}
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">Optimization Strategy</p>
              <p className="text-sm text-gray-700">{insights.optimizationStrategy}</p>
            </div>
          </div>

          {/* Primary Focus Areas */}
          {insights.primaryFocus.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <Sparkles className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">Primary Focus Areas</p>
                <div className="flex flex-wrap gap-2">
                  {insights.primaryFocus.map((focus, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-sm text-gray-700">{focus}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Key Selection Factors */}
          {insights.keyReasons.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <Info className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">Key Selection Factors</p>
                <ul className="space-y-1">
                  {insights.keyReasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-purple-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {insights.stats.totalSessionsAnalyzed}
              </div>
              <div className="text-xs text-gray-600">Sessions Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {insights.stats.matchingInterests}
              </div>
              <div className="text-xs text-gray-600">Interest Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {insights.stats.networkingOpportunities}
              </div>
              <div className="text-xs text-gray-600">Networking Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {insights.stats.expertSpeakers}
              </div>
              <div className="text-xs text-gray-600">Expert Speakers</div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              Your agenda is optimized based on your profile, interests, and role.
              Each session was scored across multiple factors including relevance,
              networking potential, and speaker expertise. You can adjust your agenda
              at any time by removing sessions or regenerating with updated preferences.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}