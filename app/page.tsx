'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import HomeChatInput from '@/components/HomeChatInput'
import { PSAdvisoryHomepage } from '@/components/ps-advisory-homepage'
import { Calendar, Brain, Clock, Sparkles, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const { data: session } = useSession()
  const [daysUntil, setDaysUntil] = useState(0)

  useEffect(() => {
    const conferenceDate = new Date('2025-10-15') // Conference starts Oct 15
    const today = new Date()
    const diffTime = Math.abs(conferenceDate.getTime() - today.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setDaysUntil(diffDays)
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Countdown Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-full mb-6">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {daysUntil} days until ITC Vegas 2025
            </span>
          </div>

          {/* PS Advisory Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-50 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Powered by PS Advisory</span>
            <span className="text-xs text-purple-600">• AI + Salesforce for Insurance</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-center mb-6">
          <span className="block text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
            Your AI Conference
          </span>
          <span className="block text-5xl md:text-6xl font-bold text-gray-900">
            Concierge is Ready
          </span>
        </h1>

        <p className="text-center text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Experience ITC Vegas 2025 (Oct 14-16) with an AI assistant that understands context, tracks time, and creates your perfect 3-day journey through 100+ sessions.
        </p>

        {/* Demo Site Notice */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-orange-50 rounded-full mb-4">
            <span className="text-sm text-orange-700">📍 Demo Site - Not affiliated with ITC</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a
              href="https://www.psadvisory.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              <span>Visit PS Advisory</span>
              <ArrowRight className="w-3 h-3" />
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://vegas.insuretechconnect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <span>Official ITC Vegas Site</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Chat Input */}
        <div className="mb-8">
          <HomeChatInput />
        </div>

        {/* Welcome Message */}
        <p className="text-center text-sm text-gray-600 mb-8">
          Ask your AI Concierge about sessions, speakers, or schedule recommendations
        </p>

        {/* PS Advisory CTA */}
        <div className="mb-12">
          <PSAdvisoryHomepage />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            <Brain className="w-5 h-5 mr-2" />
            Start with AI Concierge
            <Sparkles className="w-4 h-4 ml-2" />
          </Link>

          <Link
            href="/agenda"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-purple-700 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 hover:border-purple-300 transition-all"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Browse Agenda
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        {/* User Welcome */}
        <div className="mt-8 text-center">
          {session ? (
            <p className="text-sm text-gray-600">
              Welcome back, <span className="font-medium">{session.user?.name || 'Test User'}</span>!
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Welcome back, Test User!
            </p>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-gray-500">
            <span>Las Vegas, NV</span>
            <span>{new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Los_Angeles',
              timeZoneName: 'short'
            })}</span>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {daysUntil} days until conference
          </p>
        </div>
      </div>
    </div>
  )
}