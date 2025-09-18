'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, MessageCircle, Calendar, Sparkles,
  ChevronRight, CheckCircle, ArrowRight, Play, UserPlus, LogIn
} from 'lucide-react';

interface SmartAgendaTutorialProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export default function SmartAgendaTutorial({ onComplete, isCompleted }: SmartAgendaTutorialProps) {
  const handleTryNow = () => {
    window.location.href = '/chat';
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
              <span>Create Your Smart Agenda in Seconds</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-purple-100">
              The fastest way to build your personalized conference schedule
            </p>
          </div>
          {isCompleted && (
            <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Left: Simple Instructions */}
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              It's This Simple:
            </h3>

            <div className="space-y-4">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Go to AI Concierge</p>
                  <p className="text-sm text-gray-600 mt-1">Click the AI Concierge link in the navigation</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Type the magic words</p>
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm font-mono text-gray-700">"Build me a personalized agenda"</p>
                  </div>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Create your account</p>
                  <p className="text-sm text-gray-600 mt-1">You'll be prompted to sign up or log in (it's quick & free!)</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded text-xs text-purple-700">
                      <UserPlus className="w-3 h-3" />
                      <span>Sign up in seconds</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
                      <LogIn className="w-3 h-3" />
                      <span>Or log in</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Step 4 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Get your personalized agenda!</p>
                  <p className="text-sm text-gray-600 mt-1">AI analyzes your interests & creates the perfect schedule</p>
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Tailored to your role & interests</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleTryNow}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                Try It Now
                <ArrowRight className="w-4 h-4" />
              </button>
              {!isCompleted && (
                <button
                  onClick={onComplete}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-200 transition-all"
                >
                  Mark as Complete
                </button>
              )}
            </div>
          </div>

          {/* Right: Visual Demo */}
          <div className="hidden md:block">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Your Personalized Agenda:</h4>

              <div className="space-y-3">
                {/* Sample Schedule Items */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-green-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">9:00 AM - Keynote</p>
                      <p className="text-xs text-gray-600">AI Innovation Summit</p>
                    </div>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">11:00 AM - Workshop</p>
                      <p className="text-xs text-gray-600">Digital Transformation</p>
                    </div>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-purple-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">2:00 PM - Panel</p>
                      <p className="text-xs text-gray-600">InsurTech Trends</p>
                    </div>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                </motion.div>
              </div>

              <div className="mt-4 p-3 bg-purple-100/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <p className="text-xs text-purple-700">
                    Personalized based on your interests • No conflicts • Includes networking time
                  </p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <UserPlus className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-yellow-800">Free Account Required</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Creating an account takes seconds and unlocks personalized features like saved schedules, favorites, and AI recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Visual */}
        <div className="md:hidden mt-6">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm font-medium text-gray-700 mb-3">You'll get a complete schedule:</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Personalized sessions</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No scheduling conflicts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Networking time included</span>
            </div>

            <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs text-yellow-800 flex items-start gap-1">
                <UserPlus className="w-3 h-3 mt-0.5" />
                <span><strong>Note:</strong> Free account required to save your agenda</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}