'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Info, X } from 'lucide-react'

export default function PWAFooter() {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <>
      {/* Minimal footer bar - stays out of the way */}
      <footer className="bg-gray-900 text-gray-400 py-2 px-4 text-center">
        <div className="flex items-center justify-center gap-3 text-xs">
          <span>PS Advisory Demo</span>
          <span className="text-gray-600">•</span>
          <button
            onClick={() => setShowInfo(true)}
            className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            <span>Info</span>
          </button>
        </div>
      </footer>

      {/* Slide-up info panel when requested */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowInfo(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-h-[70vh] bg-white rounded-t-2xl shadow-2xl animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">About This Demo</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-4">
              {/* Disclaimer */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-medium text-orange-900 mb-1">Important Notice</p>
                <p className="text-xs text-orange-700">
                  This is an unofficial demonstration of AI-enhanced conference capabilities.
                  Not affiliated with or endorsed by InsureTech Connect.
                </p>
                <a
                  href="https://vegas.insuretechconnect.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-orange-600 hover:text-orange-700 underline"
                >
                  Visit Official ITC Vegas Site →
                </a>
              </div>

              {/* PS Advisory */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-1">Powered by PS Advisory</p>
                <p className="text-xs text-blue-700">
                  Your trusted Salesforce Partner helping insurance organizations leverage technology
                  to improve profitability and reduce friction.
                </p>
                <a
                  href="https://www.psadvisory.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Learn More About PS Advisory →
                </a>
              </div>

              {/* Quick Links */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Quick Links</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/chat"
                    className="text-xs text-gray-600 hover:text-gray-900 bg-gray-50 rounded-lg p-2 text-center transition-colors"
                    onClick={() => setShowInfo(false)}
                  >
                    AI Chat
                  </Link>
                  <Link
                    href="/smart-agenda"
                    className="text-xs text-gray-600 hover:text-gray-900 bg-gray-50 rounded-lg p-2 text-center transition-colors"
                    onClick={() => setShowInfo(false)}
                  >
                    Smart Agenda
                  </Link>
                  <Link
                    href="/speakers"
                    className="text-xs text-gray-600 hover:text-gray-900 bg-gray-50 rounded-lg p-2 text-center transition-colors"
                    onClick={() => setShowInfo(false)}
                  >
                    Speakers
                  </Link>
                  <Link
                    href="/favorites"
                    className="text-xs text-gray-600 hover:text-gray-900 bg-gray-50 rounded-lg p-2 text-center transition-colors"
                    onClick={() => setShowInfo(false)}
                  >
                    My Schedule
                  </Link>
                </div>
              </div>

              {/* Contact */}
              <div className="text-center pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  © 2025 PS Advisory LLC • AI-Powered Conference Demo
                </p>
                <a
                  href="mailto:info@psadvisory.com"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Contact: info@psadvisory.com
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}