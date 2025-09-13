'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, Users, Brain, Map, Star, TrendingUp, 
  ChevronRight, Play, Sparkles, Clock, Target,
  MessageCircle, Award, Globe, Zap, ArrowRight,
  CheckCircle, BarChart3, Loader2
} from 'lucide-react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [daysUntil, setDaysUntil] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  // Don't auto-redirect - let users choose where to go
  // This enables exploration without forced login

  useEffect(() => {
    const conferenceDate = new Date('2025-10-14')
    const today = new Date()
    const diffTime = Math.abs(conferenceDate.getTime() - today.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setDaysUntil(diffDays)

    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show welcome page for non-authenticated users
  const stats = [
    { value: '8,000+', label: 'Attendees' },
    { value: '200+', label: 'Speakers' },
    { value: '100+', label: 'Sessions' },
    { value: '3', label: 'Days' },
  ]

  const features = [
    {
      icon: Brain,
      title: 'AI Concierge Chat',
      description: 'Get instant answers and personalized scheduling assistance from our AI-powered assistant',
      href: '/chat',
      color: 'from-purple-500 to-blue-500',
      badge: 'AI-POWERED'
    },
    {
      icon: Calendar,
      title: 'Intelligent Agenda',
      description: 'Browse sessions with AI-enhanced recommendations and conflict detection',
      href: '/agenda/intelligent',
      color: 'from-blue-500 to-purple-500'
    },
    {
      icon: Star,
      title: 'Build Your Schedule',
      description: 'Save your favorite sessions and create your personalized itinerary',
      href: '/schedule',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Users,
      title: 'Speaker Directory',
      description: 'Learn about industry leaders and keynote speakers',
      href: '/speakers',
      color: 'from-green-500 to-emerald-500'
    }
  ]

  const benefits = [
    'Personalized AI recommendations based on your interests',
    'Real-time schedule conflict detection',
    'Networking opportunity suggestions',
    'Learning path creation for skill development',
    'Mobile-optimized for on-the-go access',
    'Intelligent session discovery'
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50"></div>
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            transform: `translateY(${scrollY * 0.2}px)`
          }}
        ></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-16 sm:pb-24">
          <div className="text-center">
            {/* Countdown Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-8">
              <Clock className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">
                {daysUntil} days until ITC Vegas 2025
              </span>
            </div>
            
            {/* PS Advisory Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Powered by PS Advisory</span>
              <span className="text-xs text-purple-600">• AI + Salesforce for Insurance</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                AI-First Conference
              </span>
              <br />
              <span className="text-gray-900">Experience</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-4 sm:mb-6 max-w-3xl mx-auto">
              Meet your AI Conference Concierge - an intelligent assistant that learns your preferences 
              and creates the perfect conference experience just for you.
            </p>
            
            <div className="flex flex-col items-center space-y-3 mb-8 sm:mb-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-orange-100 rounded-full">
                <span className="text-sm text-orange-700">📍 Demo Site - Not affiliated with ITC</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <a 
                  href="https://www.psadvisory.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <span>Visit PS Advisory</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
                <span className="text-gray-400">•</span>
                <a 
                  href="https://vegas.insuretechconnect.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-orange-600 hover:text-orange-700 font-medium"
                >
                  <span>Official ITC Vegas Site</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link 
                href="/chat" 
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all min-h-[44px]"
              >
                <Brain className="w-5 h-5 mr-2" />
                Start with AI Concierge
                <Sparkles className="w-4 h-4 ml-2" />
              </Link>
              <Link 
                href="/agenda" 
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-purple-700 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-300 hover:shadow-lg transform hover:-translate-y-0.5 transition-all min-h-[44px]"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Browse Agenda
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            {/* Sign In Option */}
            <div className="mt-4 sm:mt-6">
              {status === 'authenticated' ? (
                <p className="text-sm text-gray-600">
                  Welcome back, {session?.user?.name || session?.user?.email}!
                </p>
              ) : (
                <Link 
                  href="/auth/signin" 
                  className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <span>Already have an account? Sign in</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-20">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center p-4 sm:p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Your AI-Powered Conference Toolkit
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Start exploring immediately or let our AI guide you through registration when you're ready
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Link
                  key={index}
                  href={feature.href}
                  className="group relative bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                >
                  {feature.badge && (
                    <span className="absolute -top-2 -right-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-xs font-semibold rounded-full">
                      {feature.badge}
                    </span>
                  )}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${feature.color} p-2 sm:p-3 mb-4`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-sm font-medium text-purple-600 group-hover:text-purple-700">
                    Explore
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* AI Features Highlight */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                <span>Powered by Claude 3.5 + Salesforce</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                Your Personal AI Conference Concierge
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-4">
                Experience the future of conference attendance with an AI assistant that 
                understands your interests, learns your preferences, and proactively helps 
                you maximize every moment.
              </p>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                Sign in to get personalized recommendations, smart scheduling, and 
                real-time insights tailored specifically to you.
              </p>
              
              <ul className="space-y-4 mb-8">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
              
              <Link 
                href="/auth/signin"
                className="inline-flex items-center px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:shadow-lg transition-all min-h-[44px]"
              >
                Get Started with AI Concierge
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl transform rotate-3"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-4 sm:p-8">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">AI Concierge</h3>
                    <p className="text-xs text-gray-500">Your intelligent assistant</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-2">First-time visitor:</p>
                    <p className="text-sm font-medium">"I'm interested in AI and automation for claims processing"</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-2">AI Concierge:</p>
                    <p className="text-sm font-medium mb-2">Welcome! I've found 23 perfect sessions for you:</p>
                    <ul className="text-sm space-y-1">
                      <li>🌟 <strong>Day 1:</strong> AI in Claims Automation Keynote</li>
                      <li>📊 <strong>Day 2:</strong> Machine Learning Workshop</li>
                      <li>🤝 <strong>Networking:</strong> AI Leaders Roundtable</li>
                      <li>💡 <strong>Must-see:</strong> Future of Automated Claims</li>
                    </ul>
                    <p className="text-sm mt-3 text-purple-700 font-medium">
                      Want me to build your personalized schedule?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Experience AI-First?
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Join now and let AI transform your conference experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <Link 
              href="/auth/register"
              className="group bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Create Account</h3>
              <p className="text-sm text-white/90">
                Get personalized AI recommendations instantly
              </p>
            </Link>
            
            <Link 
              href="/chat"
              className="group bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Try AI Chat</h3>
              <p className="text-sm text-gray-600">
                Ask questions and explore the conference
              </p>
            </Link>
            
            <Link 
              href="/agenda"
              className="group bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-purple-200 rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Browse Agenda</h3>
              <p className="text-sm text-gray-600">
                Explore sessions and speakers
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}