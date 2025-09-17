'use client'

import { ReactNode } from 'react'

interface PWAScrollLayoutProps {
  children: ReactNode
  className?: string
}

export function PWAScrollLayout({ children, className = '' }: PWAScrollLayoutProps) {
  return (
    <div className={`pwa-scroll-container ${className}`}>
      {children}

      <style jsx global>{`
        /* Reset body scrolling */
        html, body {
          overflow: hidden;
          position: fixed;
          width: 100%;
          height: 100%;
        }

        /* Main app container using 100dvh for dynamic viewport height */
        .pwa-scroll-container {
          display: flex;
          flex-direction: column;
          height: 100dvh; /* Dynamic viewport height - adjusts to browser chrome */
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
        }

        /* Header - fixed at top */
        .pwa-header {
          flex-shrink: 0;
          position: relative;
          z-index: 50;
          padding-top: env(safe-area-inset-top);
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        /* Main scrollable content area */
        .pwa-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch; /* Momentum scrolling on iOS */
          overscroll-behavior-y: contain; /* Prevent pull-to-refresh */
          position: relative;
        }

        /* Add padding for safe areas in content */
        .pwa-content-inner {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
          padding-bottom: env(safe-area-inset-bottom);
          min-height: 100%;
        }


        /* Smooth scrolling */
        .pwa-content::-webkit-scrollbar {
          width: 6px;
        }

        .pwa-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .pwa-content::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        /* Prevent rubber-band scrolling on iOS */
        .pwa-scroll-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
        }

        /* Ensure main element doesn't have conflicting styles */
        main {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        /* Fix for mobile browsers address bar */
        @supports (height: 100dvh) {
          .pwa-scroll-container {
            height: 100dvh;
          }
        }

        /* Fallback for older browsers */
        @supports not (height: 100dvh) {
          .pwa-scroll-container {
            height: 100vh;
            height: calc(var(--vh, 1vh) * 100);
          }
        }

        /* Landscape orientation adjustments */
        @media (orientation: landscape) and (max-height: 500px) {
          .pwa-header {
            padding-top: max(env(safe-area-inset-top), 8px);
          }
        }
      `}</style>
    </div>
  )
}