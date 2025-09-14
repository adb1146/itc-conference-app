'use client';

import { useState } from 'react';
import {
  Brain, ChevronDown, ChevronUp, Lightbulb, Target,
  AlertCircle, CheckCircle, Info, Sparkles, User
} from 'lucide-react';
import Link from 'next/link';

interface ReasoningStep {
  stage: string;
  thought: string;
  analysis: string;
  decision: string;
  confidence: number;
  alternatives?: Array<{
    option: string;
    pros: string[];
    cons: string[];
    whyNotChosen: string;
  }>;
}

interface AIReasoningPanelProps {
  reasoning?: ReasoningStep[];
  profileCoaching?: string[];
  profileCompleteness?: number;
  usingAI?: boolean;
  showByDefault?: boolean;
}

export default function AIReasoningPanel({
  reasoning = [],
  profileCoaching = [],
  profileCompleteness = 0,
  usingAI = false,
  showByDefault = false
}: AIReasoningPanelProps) {
  const [showReasoning, setShowReasoning] = useState(showByDefault);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  // Profile coaching section
  if (profileCoaching.length > 0 || profileCompleteness < 80) {
    return (
      <div className="space-y-4">
        {/* Profile Coaching Card */}
        {profileCompleteness < 80 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm p-6 border border-purple-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Complete Your Profile for Better Recommendations
                </h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Profile Completeness
                    </span>
                    <span className="text-sm font-bold text-purple-600">
                      {profileCompleteness}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompleteness}%` }}
                    />
                  </div>
                </div>
                {profileCoaching.length > 0 && (
                  <div className="space-y-2">
                    {profileCoaching.map((message, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{message}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <User className="w-4 h-4" />
                  Complete Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* AI Reasoning Section */}
        {usingAI && reasoning.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">
                    AI Reasoning Process
                  </h3>
                  <p className="text-sm text-gray-600">
                    See how AI built your personalized agenda
                  </p>
                </div>
              </div>
              {showReasoning ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showReasoning && (
              <div className="px-6 pb-6 space-y-4">
                {reasoning.map((step, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-blue-200 pl-4 py-2"
                  >
                    <button
                      onClick={() => toggleStep(index)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">
                            {step.stage}
                          </h4>
                          <p className="text-sm text-gray-700 mb-2">
                            💭 {step.thought}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium ${getConfidenceColor(
                              step.confidence
                            )}`}
                          >
                            {step.confidence}%
                          </span>
                          {expandedSteps.has(index) ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedSteps.has(index) && (
                      <div className="mt-3 space-y-3 text-sm">
                        {/* Analysis */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-700 mb-1">
                                Analysis:
                              </p>
                              <p className="text-gray-600">{step.analysis}</p>
                            </div>
                          </div>
                        </div>

                        {/* Decision */}
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-700 mb-1">
                                Decision:
                              </p>
                              <p className="text-gray-600">{step.decision}</p>
                            </div>
                          </div>
                        </div>

                        {/* Confidence */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-gray-700">
                              Confidence:
                            </span>
                            <span
                              className={`font-bold ${getConfidenceColor(
                                step.confidence
                              )}`}
                            >
                              {getConfidenceLabel(step.confidence)}
                            </span>
                          </div>
                        </div>

                        {/* Alternatives */}
                        {step.alternatives && step.alternatives.length > 0 && (
                          <div className="bg-yellow-50 rounded-lg p-3">
                            <p className="font-medium text-gray-700 mb-2">
                              Alternatives Considered:
                            </p>
                            <div className="space-y-2">
                              {step.alternatives.map((alt, altIndex) => (
                                <div
                                  key={altIndex}
                                  className="text-xs text-gray-600 border-l-2 border-yellow-300 pl-2"
                                >
                                  <p className="font-medium">{alt.option}</p>
                                  {alt.whyNotChosen && (
                                    <p className="text-gray-500 mt-1">
                                      Why not: {alt.whyNotChosen}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Status Indicator */}
        {!usingAI && profileCompleteness < 40 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  AI Recommendations Limited
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Complete your profile to at least 40% to enable AI-powered
                  agenda recommendations. Currently using basic scheduling algorithm.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Active Indicator */}
        {usingAI && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  AI-Powered Recommendations Active
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Your agenda was created using Claude Opus 4.1 with deep reasoning
                  about your profile, interests, and goals.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If no coaching needed and AI is active, just show reasoning
  if (usingAI && reasoning.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setShowReasoning(!showReasoning)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">
                AI Reasoning Process
              </h3>
              <p className="text-sm text-gray-600">
                See how AI built your personalized agenda
              </p>
            </div>
          </div>
          {showReasoning ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showReasoning && reasoning.length > 0 && (
          <div className="px-6 pb-6">
            {/* Reasoning steps display */}
            <div className="space-y-3 mt-4">
              {reasoning.map((step, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400"
                >
                  <h5 className="font-medium text-gray-900 mb-1">
                    {step.stage}
                  </h5>
                  <p className="text-sm text-gray-700">{step.thought}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Confidence:</span>
                    <span
                      className={`text-xs font-bold ${getConfidenceColor(
                        step.confidence
                      )}`}
                    >
                      {step.confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}