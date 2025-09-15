'use client';

import { useState, useEffect } from 'react';
import { PSAdvisoryCTA } from './ps-advisory-cta';

export function PSAdvisoryHomepage() {
  const [showHomepageBanner, setShowHomepageBanner] = useState(true);
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    // Always show homepage banner on page reload
    setShowHomepageBanner(true);
    setShowFloating(false);
  }, []);

  const handleHomepageDismiss = () => {
    setShowHomepageBanner(false);
    // When homepage banner is dismissed, show the floating variant
    setShowFloating(true);
  };

  if (showHomepageBanner) {
    return (
      <div className="mt-6 mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <HomepageCTAContent onDismiss={handleHomepageDismiss} />
        </div>
      </div>
    );
  }

  if (showFloating) {
    return <PSAdvisoryCTA variant="floating" />;
  }

  return null;
}

import { Calendar, X, ChevronRight, Sparkles } from 'lucide-react';

function HomepageCTAContent({ onDismiss }: { onDismiss: () => void }) {
  const handleClick = () => {
    window.open('https://calendly.com/npaul-psadvisory/connection?month=2025-09', '_blank');
  };

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-8 sm:pr-0">
            Transform Your Insurance Technology Strategy
          </h3>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
          Nancy Paul from PS Advisory specializes in helping insurance organizations leverage technology
          for competitive advantage.
          <span className="hidden sm:inline"> From Salesforce implementations to AI-driven solutions,
          we turn innovation into results.</span>
        </p>
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Schedule a Complimentary Consultation</span>
          <span className="sm:hidden">Book Meeting</span>
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="absolute top-0 right-0 sm:relative sm:ml-4 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
}