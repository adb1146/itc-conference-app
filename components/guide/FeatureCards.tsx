'use client';

import { motion } from 'framer-motion';
import {
  MessageCircle, Star, Users, Mail, Search, Calendar,
  ArrowRight, CheckCircle, ExternalLink
} from 'lucide-react';

interface FeatureCardsProps {
  completedSteps: string[];
  onStepComplete: (stepId: string) => void;
}

export default function FeatureCards({ completedSteps, onStepComplete }: FeatureCardsProps) {
  const features = [
    {
      id: 'ai-concierge',
      title: 'AI Concierge',
      description: 'Chat with our AI to get personalized recommendations and answers about the conference',
      icon: MessageCircle,
      color: 'purple',
      href: '/chat',
      tips: [
        'Ask about specific topics or speakers',
        'Get session recommendations',
        'Find networking opportunities'
      ]
    },
    {
      id: 'favorites',
      title: 'My Favorites',
      description: 'Save sessions you\'re interested in to build your personal conference playlist',
      icon: Star,
      color: 'pink',
      href: '/favorites',
      tips: [
        'Click the star icon on any session',
        'Organize by day and time',
        'Export to your calendar'
      ]
    },
    {
      id: 'speakers',
      title: 'Speaker Discovery',
      description: 'Explore industry experts and thought leaders presenting at ITC Vegas 2025',
      icon: Users,
      color: 'blue',
      href: '/speakers',
      tips: [
        'Filter by expertise area',
        'View speaker profiles',
        'Find their sessions'
      ]
    },
    {
      id: 'export',
      title: 'Export & Share',
      description: 'Email your schedule or download it to add to your personal calendar',
      icon: Mail,
      color: 'green',
      href: '/smart-agenda',
      tips: [
        'Email your Smart Agenda',
        'Download as calendar file',
        'Share with colleagues'
      ]
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        hover: 'hover:bg-purple-100'
      },
      pink: {
        bg: 'bg-pink-50',
        text: 'text-pink-600',
        border: 'border-pink-200',
        hover: 'hover:bg-pink-100'
      },
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-100'
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200',
        hover: 'hover:bg-green-100'
      }
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Discover More Features</h2>
        <p className="text-sm sm:text-base text-gray-600 px-4">Explore everything the ITC Vegas 2025 app has to offer</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const colors = getColorClasses(feature.color);
          const isCompleted = completedSteps.includes(feature.id);

          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border ${colors.border} overflow-hidden group hover:shadow-xl transition-all`}
            >
              <div className={`${colors.bg} p-4 sm:p-6 ${colors.hover} transition-colors`}>
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 ${colors.bg} rounded-lg border ${colors.border}`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
                  </div>
                  {isCompleted && (
                    <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Explored
                    </div>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">{feature.description}</p>

                {/* Tips */}
                <div className="space-y-1 mb-3 sm:mb-4">
                  {feature.tips.map((tip, tipIndex) => (
                    <div key={tipIndex} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.bg} border ${colors.border} mt-1 sm:mt-1.5 flex-shrink-0`} />
                      <p className="text-[11px] sm:text-xs text-gray-500">{tip}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <a
                    href={feature.href}
                    onClick={() => onStepComplete(feature.id)}
                    className={`inline-flex items-center gap-1.5 sm:gap-2 ${colors.text} font-medium text-xs sm:text-sm group-hover:gap-3 transition-all`}
                  >
                    Try it now
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </a>
                  {!isCompleted && (
                    <button
                      onClick={() => onStepComplete(feature.id)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Mark as explored
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Global Search Feature */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-white rounded-lg shadow-sm">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Quick Search</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Use the search icon in the navigation to quickly find any session, speaker, or topic across the entire conference.
            </p>
          </div>
          <div className="hidden md:block">
            <kbd className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white rounded border border-gray-300 text-[10px] sm:text-xs font-mono text-gray-600">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </motion.div>
    </div>
  );
}