'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, X, ChevronRight, Sparkles } from 'lucide-react';

interface PSAdvisoryCTAProps {
  variant?: 'homepage' | 'banner' | 'floating' | 'inline';
  className?: string;
}

export function PSAdvisoryCTA({ variant = 'inline', className = '' }: PSAdvisoryCTAProps) {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Always show on page reload - reset visibility
    setIsVisible(true);
  }, [pathname]); // Reset when route changes

  const handleDismiss = () => {
    setIsVisible(false);
    // No longer storing in sessionStorage - will reappear on page reload
  };

  const handleClick = () => {
    window.open('https://calendly.com/npaul-psadvisory/connection?month=2025-09', '_blank');
  };

  if (!isVisible) return null;

  // Homepage Hero variant - prominent but elegant, mobile-optimized
  if (variant === 'homepage') {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-100 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
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
            onClick={handleDismiss}
            className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 sm:ml-4 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Banner variant - subtle top/bottom banner
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Calendar className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Need help with your technology initiatives?</span>
              {' '}Nancy Paul from PS Advisory offers expert guidance for insurance organizations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClick}
              className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-md text-sm font-medium hover:bg-white/30 transition-colors whitespace-nowrap"
            >
              Book a Meeting
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating variant - mobile-optimized positioning
  if (variant === 'floating') {
    // Don't show floating variant on homepage since it has its own CTA
    if (pathname === '/') {
      return null;
    }

    return (
      <>
        {/* Desktop version - bottom left */}
        <div className={`hidden md:block fixed bottom-20 left-4 z-30 ${className}`}>
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  Expert Guidance Available
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  Connect with Nancy Paul for personalized insurance technology consulting.
                </p>
                <button
                  onClick={handleClick}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Schedule Meeting
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile version - compact bar at bottom */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-30 ${className}`}>
          <div className="bg-white border-t border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">Connect with Nancy Paul</p>
                </div>
                <button
                  onClick={handleClick}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md"
                >
                  Book
                </button>
              </div>
              <button
                onClick={handleDismiss}
                className="ml-2 text-gray-400"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Inline variant - mobile-optimized
  return (
    <div className={`bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 sm:p-4 border border-gray-200 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-900">
              Ready to discuss your technology strategy?
            </p>
            <p className="text-xs text-gray-600 hidden sm:block">
              Connect with Nancy Paul from PS Advisory
            </p>
          </div>
        </div>
        <button
          onClick={handleClick}
          className="px-3 py-1 sm:py-1.5 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700 transition-colors self-end sm:self-auto"
        >
          Book Meeting
        </button>
      </div>
    </div>
  );
}