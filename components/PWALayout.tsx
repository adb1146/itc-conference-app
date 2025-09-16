'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function PWALayout({ children }: { children: React.ReactNode }) {
  const [isPWA, setIsPWA] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Check if running as PWA (standalone mode)
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isIOSPWA = isIOS && (window.navigator as any).standalone

      setIsPWA(isStandalone || isIOSPWA)
    }

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkPWA()
    checkMobile()

    // Listen for changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => checkPWA()

    window.addEventListener('resize', checkMobile)

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange) // Fallback for older browsers
    }

    return () => {
      window.removeEventListener('resize', checkMobile)
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
    <div className={`min-h-screen flex flex-col ${isPWA ? 'pwa-mode' : ''} ${isMobile ? 'mobile-mode' : ''}`}>
      {children}

      {/* Add PWA-specific and mobile styles */}
      {(isPWA || isMobile) && (
        <style jsx global>{`
          /* Hide non-essential floating elements in PWA/mobile mode */
          .pwa-mode .floating-element,
          .mobile-mode .floating-element {
            display: none !important;
          }

          /* Hide Vegas time display on mobile/PWA */
          .pwa-mode .fixed.bottom-4.right-4,
          .mobile-mode .fixed.bottom-4.right-4 {
            display: none !important;
          }

          /* Optimize for PWA full-screen experience */
          .pwa-mode {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }

          /* Hide desktop-only elements in PWA/mobile */
          .pwa-mode .desktop-only,
          .mobile-mode .desktop-only {
            display: none !important;
          }

          /* Optimize chat interface for PWA */
          .pwa-mode main {
            height: 100vh;
            max-height: 100vh;
            overflow: hidden;
          }

          /* Hide disclaimer banner on PWA home page */
          .pwa-mode .bg-orange-100 {
            display: ${pathname === '/' ? 'none' : 'block'} !important;
          }

          /* Hide duplicate hamburger menu on home page */
          ${isHomePage ? `
            .pwa-mode nav button:first-child,
            .mobile-mode nav button:first-child {
              display: none !important;
            }
          ` : ''}
        `}</style>
      )}

      {/* Show minimal UI hints only when not in PWA */}
      {!isPWA && !isMobile && !isChatPage && !isHomePage && (
        <style jsx global>{`
          /* Keep floating elements for desktop web version */
          .floating-element {
            position: fixed;
            z-index: 40;
          }
        `}</style>
      )}
    </div>
  )
}