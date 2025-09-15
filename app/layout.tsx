import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { VegasTimeDisplay } from '@/components/vegas-time-display'
import { PSAdvisoryCTA } from '@/components/ps-advisory-cta'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ITC Vegas 2025 Demo - AI Conference Companion by PS Advisory',
  description: 'Experience an AI-powered conference companion demo by PS Advisory. Showcasing intelligent recommendations, personalized scheduling, and Salesforce integration for insurance organizations.',
  keywords: 'ITC Vegas, InsureTech, conference, insurance technology, AI assistant, PS Advisory, Salesforce, demo',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <DisclaimerBanner />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <ChatWidget />
            <VegasTimeDisplay />
            <PSAdvisoryCTA variant="floating" />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}