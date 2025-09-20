'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Menu, X } from 'lucide-react'

function HomePageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [placeholder, setPlaceholder] = useState('Ask about sessions, speakers, or get schedule recommendations')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check for message in URL parameters
  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setQuery(message)
      // Auto-submit after a brief delay to show the message
      setTimeout(() => {
        router.push(`/chat?message=${encodeURIComponent(message)}`)
      }, 500)
    }
  }, [searchParams, router])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [query])

  // Rotating placeholder suggestions
  useEffect(() => {
    const suggestions = [
      'Ask about ITC Vegas sessions, speakers, or networking events',
      'Which sessions cover AI in underwriting?',
      'Who are the keynote speakers this year?',
      'Find networking opportunities for CTOs',
      'What\'s new in claims automation?',
      'Show me sessions about cyber insurance',
      'Build my personalized 3-day agenda',
      'When is the opening reception?'
    ]

    let index = 0
    const interval = setInterval(() => {
      index = (index + 1) % suggestions.length
      setPlaceholder(suggestions[index])
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/chat?message=${encodeURIComponent(query)}`)
    }
  }

  const quickPrompts = [
    {
      text: 'Find AI sessions',
      example: 'on underwriting automation'
    },
    {
      text: 'Who\'s speaking about',
      example: 'claims technology'
    },
    {
      text: 'Build my schedule for',
      example: 'Day 2 (Oct 15)'
    },
    {
      text: 'What\'s trending in',
      example: 'cyber insurance'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/20 to-white">
      {/* Version indicator for debugging - remove after cache issue resolved */}
      <div className="hidden" data-version="2.0-nocache">Cache cleared</div>
      {/* Mobile-friendly navigation - hidden since main Navigation is shown */}
      <nav className="hidden w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100 lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:border-none lg:bg-transparent">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
            <span className="text-lg lg:text-xl font-normal">ITC Vegas</span>
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">2025</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link href="/agenda" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Conference Agenda
            </Link>
            <Link href="/speakers" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Speakers
            </Link>
            <Link href="/favorites" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              My Schedule
            </Link>
            {session ? (
              <span className="text-sm text-gray-600">
                {session.user?.name || 'User'}
              </span>
            ) : (
              <Link href="/auth/signin" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <div className="flex flex-col p-4 space-y-3">
              <Link href="/agenda" className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2">
                Conference Agenda
              </Link>
              <Link href="/speakers" className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2">
                Speakers
              </Link>
              <Link href="/favorites" className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2">
                My Schedule
              </Link>
              {session ? (
                <span className="text-sm text-gray-600 py-2 border-t border-gray-100 pt-3">
                  {session.user?.name || 'User'}
                </span>
              ) : (
                <Link href="/auth/signin" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="flex flex-col items-center justify-start min-h-[calc(100vh-11rem)] sm:min-h-[calc(100vh-12rem)] md:min-h-[calc(100vh-13rem)] lg:min-h-[calc(100vh-14rem)] px-4 pt-4 sm:pt-6 md:pt-8 lg:pt-12 pb-8">
        {/* Header */}
        <div className="w-full max-w-4xl mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-center mb-2 sm:mb-3 lg:mb-4">
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Meet ITC Concierge,
            </span>
            <br />
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-gray-800">
              your personal AI assistant
            </span>
          </h1>

          {/* Purpose Statement */}
          <div className="max-w-2xl mx-auto text-center mb-3 sm:mb-4 lg:mb-6">
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed">
              Navigate <span className="font-semibold text-purple-600">295+ sessions</span> and <span className="font-semibold text-blue-600">200+ speakers</span> at ITC Vegas 2025 with ease. Our AI understands the conference context and helps you build the perfect agenda.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 lg:gap-6 mt-3 lg:mt-4 text-xs sm:text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                AI-Powered Search
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Smart Scheduling
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                Personalized Insights
              </span>
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="w-full max-w-3xl mb-4 sm:mb-6 lg:mb-8">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-center">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder={placeholder}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-20 sm:pr-24 text-base sm:text-lg bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:bg-white transition-all shadow-sm resize-none overflow-y-auto"
                rows={1}
                style={{
                  minHeight: '52px',
                  maxHeight: '120px',
                  lineHeight: '1.5'
                }}
                autoFocus
              />
              <div className="absolute right-2">
                <button
                  type="submit"
                  className="p-2 sm:p-3 transition-all group"
                  aria-label="Ask ITC Concierge"
                >
                  <div className="relative">
                    <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 animate-rainbow-shimmer text-purple-600" />
                    <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 absolute inset-0 animate-rainbow-shimmer opacity-50 blur-sm text-blue-500" style={{ animationDelay: '0.5s' }} />
                    <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 absolute inset-0 animate-rainbow-shimmer opacity-30 blur-md text-pink-500" style={{ animationDelay: '1s' }} />
                  </div>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Quick Prompts */}
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickPrompts.map((prompt, index) => {
              const colors = [
                'hover:border-purple-300 hover:bg-purple-50',
                'hover:border-blue-300 hover:bg-blue-50',
                'hover:border-green-300 hover:bg-green-50',
                'hover:border-orange-300 hover:bg-orange-50'
              ]
              return (
                <button
                  key={index}
                  onClick={() => setQuery(`${prompt.text} ${prompt.example}`)}
                  className={`text-left p-3 sm:p-4 bg-white border border-gray-200 rounded-xl sm:rounded-2xl transition-all group ${colors[index]}`}
                >
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {prompt.text}
                  </div>
                  <div className="text-xs text-gray-500">
                    {prompt.example}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Spacer for fixed footer */}
        <div className="w-full h-12 sm:h-16"></div>

      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white pt-20 sm:pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}