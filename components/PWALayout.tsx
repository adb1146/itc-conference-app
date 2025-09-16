'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function PWALayout({ children }: { children: React.ReactNode }) {
  const [isPWA, setIsPWA] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Check if running as PWA (standalone mode)
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isIOSPWA = isIOS && (window.navigator as any).standalone

      setIsPWA(isStandalone || isIOSPWA)
    }

    checkPWA()

    // Listen for changes (e.g., when PWA is installed)
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => checkPWA()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange) // Fallback for older browsers
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  // Check if on a chat-focused page
  const isChatPage = pathname === '/chat' || pathname === '/chat/intelligent'
  const isHomePage = pathname === '/'

  return (
    <div className={`min-h-screen flex flex-col ${isPWA ? 'pwa-mode' : ''}`}>
      {children}

      {/* Add PWA-specific styles */}
      {isPWA && (
        <style jsx global>{`
          /* Hide non-essential floating elements in PWA mode */
          .pwa-mode .floating-element {
            display: none !important;
          }

          /* Optimize for PWA full-screen experience */
          .pwa-mode {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }

          /* Hide desktop-only elements in PWA */
          .pwa-mode .desktop-only {
            display: none !important;
          }

          /* Optimize chat interface for PWA */
          .pwa-mode main {
            height: 100vh;
            max-height: 100vh;
            overflow: hidden;
          }
        `}</style>
      )}

      {/* Show minimal UI hints only when not in PWA */}
      {!isPWA && !isChatPage && !isHomePage && (
        <style jsx global>{`
          /* Keep floating elements for web version */
          .floating-element {
            position: fixed;
            z-index: 40;
          }
        `}</style>
      )}
    </div>
  )
}