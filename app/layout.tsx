import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import NavigationAnimated from '@/components/NavigationAnimated'
import ChatWidget from '@/components/ChatWidget'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import RefreshIndicator from '@/components/layout/RefreshIndicator'
import CacheManager from '@/components/layout/CacheManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ITC Vegas 2025 - AI Conference Companion by PS Advisory',
  description: 'Experience an AI-powered conference companion by PS Advisory. Showcasing intelligent recommendations, personalized scheduling, and Salesforce integration for insurance organizations.',
  keywords: 'ITC Vegas, InsureTech, conference, insurance technology, AI assistant, PS Advisory, Salesforce',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ITC Vegas 2025',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'ITC Vegas 2025',
    title: 'ITC Vegas 2025 Conference Assistant',
    description: 'Your personal AI assistant for navigating ITC Vegas 2025',
  },
  twitter: {
    card: 'summary',
    title: 'ITC Vegas 2025 Conference Assistant',
    description: 'Your personal AI assistant for navigating ITC Vegas 2025',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ITC Vegas" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning={true}>
        <AuthProvider>
          <div className="min-h-screen">
            {/* Cache Manager - clears stale caches */}
            <CacheManager />

            {/* Refresh Indicator for stale content */}
            <RefreshIndicator />

            {/* Navigation Header */}
            <NavigationAnimated />

            {/* Main Content - Add padding-top for fixed nav header */}
            <main className="pt-16 sm:pt-20 md:pt-24 lg:pt-24 pb-16">
              {children}
            </main>

            {/* Disclaimer Footer - Fixed at bottom */}
            <footer className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 z-40">
              <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3">
                <p className="text-xs sm:text-sm text-center text-gray-600">
                  Demo by{' '}
                  <a
                    href="https://psadvisory.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-700 underline font-medium"
                  >
                    PS Advisory
                  </a>
                  {' '}• Not affiliated with official ITC app
                </p>
              </div>
            </footer>

            {/* Floating Elements */}
            <ChatWidget />
            <PWAInstallPrompt />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}