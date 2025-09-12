'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';

export default function DisclaimerBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the banner in this session
    const dismissed = sessionStorage.getItem('disclaimer-dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('disclaimer-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="text-gray-800">
                <span className="font-semibold">Demo Site:</span> This is an unofficial demonstration of AI-enhanced conference features by{' '}
                <a 
                  href="https://www.psadvisory.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  PS Advisory
                </a>
                . We are not affiliated with InsureTech Connect.{' '}
                <a 
                  href="https://vegas.insuretechconnect.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-orange-700 hover:text-orange-800 font-medium underline"
                >
                  Visit Official ITC Site
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 p-1 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}