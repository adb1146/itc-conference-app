'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb, Copy, CheckCircle, ChevronRight,
  Brain, Calendar, Users, TrendingUp, Clock, MapPin
} from 'lucide-react';

export default function ProTips() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const promptCategories = [
    {
      title: 'Building Your Schedule',
      icon: Calendar,
      color: 'purple',
      prompts: [
        {
          text: 'Build me a personalized agenda',
          description: 'Creates a complete conference schedule based on your interests'
        },
        {
          text: 'Show me AI and machine learning sessions on Day 2',
          description: 'Find specific topics on specific days'
        },
        {
          text: 'What sessions should I attend if I\'m interested in cyber insurance?',
          description: 'Get recommendations based on your focus areas'
        }
      ]
    },
    {
      title: 'Finding Speakers',
      icon: Users,
      color: 'blue',
      prompts: [
        {
          text: 'Which sessions feature Scott Moore?',
          description: 'Find all sessions with a specific speaker'
        },
        {
          text: 'Who are the keynote speakers?',
          description: 'Discover main stage presentations'
        },
        {
          text: 'Show me speakers from InsurTech companies',
          description: 'Filter by company or industry'
        }
      ]
    },
    {
      title: 'Discovering Content',
      icon: TrendingUp,
      color: 'green',
      prompts: [
        {
          text: 'What are the most popular sessions about digital transformation?',
          description: 'Find trending topics'
        },
        {
          text: 'Show me beginner-friendly sessions',
          description: 'Filter by experience level'
        },
        {
          text: 'Find networking opportunities on Wednesday',
          description: 'Locate social events and meetups'
        }
      ]
    },
    {
      title: 'Time & Location',
      icon: Clock,
      color: 'orange',
      prompts: [
        {
          text: 'What\'s happening right now?',
          description: 'Get current session information'
        },
        {
          text: 'Show me sessions in the Mandalay Bay Ballroom',
          description: 'Filter by venue location'
        },
        {
          text: 'What are the lunch options on Day 1?',
          description: 'Find meal and break times'
        }
      ]
    }
  ];

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' }
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-yellow-100 rounded-lg">
          <Lightbulb className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pro Tips & Example Prompts</h2>
          <p className="text-gray-600">Copy these prompts and try them in the AI Concierge</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {promptCategories.map((category, categoryIndex) => {
          const Icon = category.icon;
          const colors = getColorClasses(category.color);

          return (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className={`${colors.bg} rounded-xl p-6 border ${colors.border}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className={`w-5 h-5 ${colors.text}`} />
                <h3 className="font-semibold text-gray-800">{category.title}</h3>
              </div>

              <div className="space-y-3">
                {category.prompts.map((prompt, promptIndex) => {
                  const globalIndex = categoryIndex * 10 + promptIndex;
                  return (
                    <motion.div
                      key={promptIndex}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: categoryIndex * 0.1 + promptIndex * 0.05 }}
                      className="bg-white rounded-lg p-3 border border-gray-200 group hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 mb-1">
                            "{prompt.text}"
                          </p>
                          <p className="text-xs text-gray-500">
                            {prompt.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(prompt.text, globalIndex)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy prompt"
                        >
                          {copiedIndex === globalIndex ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Advanced Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-2">Advanced AI Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-1.5 sm:gap-2">
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>Be specific with your interests - the AI learns from your preferences</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>You can ask follow-up questions to refine recommendations</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>Combine criteria like "AI sessions in the morning with networking breaks"</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>Ask for comparisons like "What's the difference between Track A and Track B?"</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Ready to try these prompts?</p>
        <a
          href="/chat"
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Open AI Concierge</span>
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </a>
      </div>
    </div>
  );
}