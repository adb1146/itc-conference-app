'use client';

import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, Circle } from 'lucide-react';

interface GuideHeaderProps {
  userName: string;
  completedSteps: number;
  totalSteps: number;
  isAuthenticated?: boolean;
}

export default function GuideHeader({ userName, completedSteps, totalSteps, isAuthenticated = false }: GuideHeaderProps) {
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 sm:p-6 md:p-8 border border-purple-100 relative isolate">
      <div className="flex flex-col gap-4">
        <div className="flex-1">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
          >
            Welcome, {userName}! 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 md:mt-3 text-gray-600 text-sm sm:text-base md:text-lg"
          >
            Let's get you started with ITC Vegas 2025. Your personalized conference experience begins here!
          </motion.p>
        </div>
      </div>

      {/* Quick Start Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 md:mt-8 p-4 sm:p-5 md:p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg md:rounded-xl"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Quick Start</h2>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          The #1 thing to do: Create your Smart Agenda! Our AI will build a personalized schedule based on your interests.
        </p>
        <button
          onClick={() => window.location.href = '/favorites?tab=smart-agenda'}
          className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          Create My Smart Agenda Now →
        </button>
      </motion.div>

    </div>
  );
}