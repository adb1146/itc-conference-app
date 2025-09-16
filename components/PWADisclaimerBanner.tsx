'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function PWADisclaimerBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSPWA = isIOS && (window.navigator as any).standalone;

    setIsPWA(isStandalone || isIOSPWA);

    // Check if user has already dismissed the banner
    const dismissed = localStorage.getItem('pwa-disclaimer-dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-disclaimer-dismissed', 'true');
  };

  // Don't show on PWA after first dismissal (persistent)
  // On web, show each session
  if (!isVisible) return null;

  // Ultra-minimal version for PWA
  if (isPWA) {
    return (
      <div className="bg-orange-100 border-b border-orange-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            <span className="text-orange-800">Demo • Not official ITC</span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-orange-600"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Regular web version
  return (
    <div className="relative bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="text-gray-800">
                <span className="font-semibold">Demo:</span> Unofficial AI demo by PS Advisory.{' '}
                <a
                  href="https://vegas.insuretechconnect.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-700 hover:text-orange-800 font-medium underline"
                >
                  Official ITC Site →
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