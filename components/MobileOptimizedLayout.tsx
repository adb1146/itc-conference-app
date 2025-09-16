'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface MobileOptimizedLayoutProps {
  children: React.ReactNode
}

export function MobileOptimizedLayout({ children }: MobileOptimizedLayoutProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [viewportHeight, setViewportHeight] = useState('100vh')

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Handle viewport height for mobile browsers (accounts for address bar)
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      setViewportHeight(`${window.innerHeight}px`)
    }

    checkMobile()
    updateViewportHeight()

    window.addEventListener('resize', checkMobile)
    window.addEventListener('resize', updateViewportHeight)
    window.addEventListener('orientationchange', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
    }
  }, [])

  // Check if current page should have minimal footer
  const isMinimalFooterPage = pathname === '/chat' ||
                               pathname === '/agenda/intelligent' ||
                               pathname === '/smart-agenda'

  return (
    <div
      className="mobile-optimized-wrapper"
      data-mobile={isMobile}
      data-minimal-footer={isMinimalFooterPage}
    >
      {children}

      <style jsx global>{`
        /* Mobile-first responsive design */
        :root {
          --vh: 1vh;
        }

        /* Fix for mobile viewport height */
        .mobile-optimized-wrapper[data-mobile="true"] {
          min-height: calc(var(--vh, 1vh) * 100);
        }

        /* Hide certain elements on mobile for chat pages */
        @media (max-width: 767px) {
          .mobile-optimized-wrapper[data-minimal-footer="true"] .desktop-only {
            display: none !important;
          }

          /* Optimize footer for mobile on chat pages */
          .mobile-optimized-wrapper[data-minimal-footer="true"] footer {
            padding: 0.5rem;
            font-size: 0.75rem;
          }

          /* Hide floating elements on mobile chat */
          .mobile-optimized-wrapper[data-minimal-footer="true"] .floating-element {
            display: none !important;
          }
        }

        /* Mobile touch-friendly buttons */
        @media (max-width: 767px) {
          button, a {
            min-height: 44px;
            min-width: 44px;
          }

          /* Increase tap targets for small buttons */
          .small-button {
            padding: 0.75rem;
          }
        }

        /* Prevent horizontal scroll on mobile */
        @media (max-width: 767px) {
          body {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  )
}