import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ITC Vegas 2025 - Conference Companion',
  description: 'Your AI-powered guide to ITC Vegas 2025. Get personalized recommendations, build your schedule, and navigate the conference with ease.',
  keywords: 'ITC Vegas, InsureTech, conference, insurance technology, AI assistant',
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
          <Navigation />
          <div className="pt-16">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}