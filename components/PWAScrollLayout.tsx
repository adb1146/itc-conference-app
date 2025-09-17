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
        /* Allow normal scrolling while maintaining PWA structure */
        html, body {
          overflow-x: hidden;
          width: 100%;
          height: 100%;
        }

        /* Main app container using 100dvh for dynamic viewport height */
        .pwa-scroll-container {
          display: flex;
          flex-direction: column;
          min-height: 100dvh; /* Dynamic viewport height - adjusts to browser chrome */
          width: 100%;
          position: relative;
          background: white;
        }

        /* Header - sticky at top */
        .pwa-header {
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 50;
          padding-top: env(safe-area-inset-top);
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        /* Main scrollable content area */
        .pwa-content {
          flex: 1;
          overflow: visible;
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

        /* Allow natural scrolling */
        .pwa-scroll-container {
          -webkit-overflow-scrolling: touch;
        }

        /* Ensure main element doesn't have conflicting styles */
        main {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        /* Fix for mobile browsers address bar */
        @supports (min-height: 100dvh) {
          .pwa-scroll-container {
            min-height: 100dvh;
          }
        }

        /* Fallback for older browsers */
        @supports not (min-height: 100dvh) {
          .pwa-scroll-container {
            min-height: 100vh;
            min-height: calc(var(--vh, 1vh) * 100);
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