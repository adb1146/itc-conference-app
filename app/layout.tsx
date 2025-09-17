import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import ChatWidget from '@/components/ChatWidget'
import { PSAdvisoryCTA } from '@/components/ps-advisory-cta'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

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
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <div className="min-h-screen">
            {/* Navigation Header */}
            <Navigation />

            {/* Main Content */}
            <main>
              {children}
            </main>

            {/* Floating Elements */}
            <ChatWidget />
            <PSAdvisoryCTA variant="floating" />
            <PWAInstallPrompt />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}