'use client';

import { motion } from 'framer-motion';
import {
  Calendar, Sparkles, ArrowRight, MousePointer,
  Info, Star, User, LogOut
} from 'lucide-react';

export default function SmartAgendaLocation() {
  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
            <MousePointer className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Where to Find Your Smart Agenda
            </h2>
            <p className="mt-1 text-sm sm:text-base text-blue-100">
              Two easy ways to access your personalized schedule builder
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Option 1: From Favorites */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-3 sm:p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">From Your Favorites</h3>
              </div>

              {/* Simulated UI */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Top Navigation Tabs - Mobile optimized */}
                <div className="bg-gray-50 p-2 sm:p-3 border-b border-gray-200">
                  <div className="flex items-center gap-1 sm:gap-4 text-xs sm:text-sm overflow-x-auto">
                    <div className="flex items-center gap-1 sm:gap-2 text-blue-600 whitespace-nowrap">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="font-medium hidden sm:inline">My Favorites</span>
                      <span className="font-medium sm:hidden">Favorites</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-600 text-white rounded-lg shadow-sm whitespace-nowrap">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs font-medium">Smart Agenda</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-500 whitespace-nowrap">
                      <User className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">My Profile</span>
                      <span className="sm:hidden">Profile</span>
                    </div>
                  </div>
                </div>

                {/* Generate Button - Mobile optimized */}
                <div className="p-3 sm:p-4">
                  <div className="flex justify-center sm:justify-end">
                    <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg flex items-center gap-2">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">Generate Smart Agenda</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-start sm:items-center gap-2">
                <div className="p-1 bg-purple-100 rounded flex-shrink-0">
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                </div>
                <p className="text-xs sm:text-sm text-gray-700">
                  Click the <span className="font-semibold text-purple-600">"Smart Agenda"</span> tab, then hit Generate
                </p>
              </div>
            </div>
          </motion.div>

          {/* Option 2: From Navigation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 sm:p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">From AI Concierge</h3>
              </div>

              {/* Chat Interface Preview - Mobile optimized */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-3 sm:px-4 py-1.5 sm:py-2 max-w-[85%] sm:max-w-[80%]">
                      <p className="text-xs sm:text-sm">Build me a personalized agenda</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-3 sm:px-4 py-1.5 sm:py-2 max-w-[85%] sm:max-w-[80%]">
                      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <p className="text-xs font-medium text-purple-600">AI Concierge</p>
                      </div>
                      <p className="text-xs sm:text-sm">I'll create your personalized schedule!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-start sm:items-center gap-2">
                <div className="p-1 bg-blue-100 rounded flex-shrink-0">
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <p className="text-xs sm:text-sm text-gray-700">
                  Just ask the AI to <span className="font-semibold text-blue-600">"Build a personalized agenda"</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Info Box - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800 mb-1 text-sm sm:text-base">Pro Tip</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                Your Smart Agenda uses AI to analyze your saved favorites and profile interests to create a conflict-free,
                personalized schedule. Save sessions you're interested in first for better recommendations!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}