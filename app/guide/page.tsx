'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GuideHeader from '@/components/guide/GuideHeader';
import SmartAgendaTutorial from '@/components/guide/SmartAgendaTutorial';
import SmartAgendaLocation from '@/components/guide/SmartAgendaLocation';
import FeatureCards from '@/components/guide/FeatureCards';
import ProTips from '@/components/guide/ProTips';
import { Loader2 } from 'lucide-react';

export default function GuidePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user?.email) {
      // Load completed steps from localStorage for logged-in users
      const savedSteps = localStorage.getItem(`guide_completed_${session.user.email}`);
      if (savedSteps) {
        setCompletedSteps(JSON.parse(savedSteps));
      }
    }
    setLoading(false);
  }, [status, session]);

  const markStepCompleted = (stepId: string) => {
    const newSteps = [...completedSteps, stepId];
    setCompletedSteps(newSteps);
    if (session?.user?.email) {
      localStorage.setItem(`guide_completed_${session.user.email}`, JSON.stringify(newSteps));
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your guide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 pb-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GuideHeader
            userName={session?.user?.name || 'there'}
            completedSteps={completedSteps}
            totalSteps={7}
            isAuthenticated={status === 'authenticated'}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8"
        >
          <SmartAgendaTutorial
            onComplete={() => markStepCompleted('smart-agenda')}
            isCompleted={completedSteps.includes('smart-agenda')}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-12"
        >
          <SmartAgendaLocation />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12"
        >
          <FeatureCards
            completedSteps={completedSteps}
            onStepComplete={markStepCompleted}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12"
        >
          <ProTips />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center pb-8"
        >
          <p className="text-sm text-gray-600 mb-4">
            Ready to explore? Jump to any section:
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => router.push('/agenda')}
              className="px-6 py-3 bg-white text-purple-600 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Browse Sessions
            </button>
            <button
              onClick={() => router.push('/speakers')}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Meet Speakers
            </button>
            <button
              onClick={() => router.push('/favorites')}
              className="px-6 py-3 bg-white text-pink-600 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              My Favorites
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}