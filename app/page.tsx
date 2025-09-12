'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, Users, Brain, Map, Star, TrendingUp, 
  ChevronRight, Play, Sparkles, Clock, Target,
  MessageCircle, Award, Globe, Zap, ArrowRight,
  CheckCircle, BarChart3
} from 'lucide-react'

export default function HomePage() {
  const [daysUntil, setDaysUntil] = useState(0)
  const [scrollY, setScrollY] = useState(0)

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

  const stats = [
    { value: '8,000+', label: 'Attendees' },
    { value: '200+', label: 'Speakers' },
    { value: '100+', label: 'Sessions' },
    { value: '3', label: 'Days' },
  ]

  const features = [
    {
      icon: Calendar,
      title: 'Intelligent Agenda',
      description: 'AI-enhanced agenda with personalized recommendations and conflict detection',
      href: '/agenda/intelligent',
      color: 'from-purple-500 to-blue-500',
      badge: 'AI-POWERED'
    },
    {
      icon: Brain,
      title: 'AI Concierge Chat',
      description: 'Get instant answers and personalized scheduling assistance',
      href: '/chat/intelligent',
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
    'Offline mode for conference floor use'
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            transform: `translateY(${scrollY * 0.2}px)`
          }}
        ></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            {/* Countdown Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-8">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                {daysUntil} days until ITC Vegas 2025
              </span>
            </div>
            
            {/* PS Advisory Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
              <span className="text-sm font-medium text-blue-700">Powered by PS Advisory</span>
              <span className="text-xs text-blue-600">• Salesforce Partner for Insurance</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                Experience AI-Enhanced
              </span>
              <br />
              <span className="text-gray-900">Conference Intelligence</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-6 max-w-3xl mx-auto">
              See how PS Advisory transforms insurance technology with AI-powered solutions. 
              This demo showcases intelligent conference capabilities for ITC Vegas 2025.
            </p>
            
            <div className="flex flex-col items-center space-y-3 mb-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-orange-100 rounded-full">
                <span className="text-sm text-orange-700">📍 Demo Site - Not affiliated with ITC</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <a 
                  href="https://www.psadvisory.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium"
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/chat/intelligent" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <Brain className="w-5 h-5 mr-2" />
                Launch AI Concierge
                <Sparkles className="w-4 h-4 ml-2" />
              </Link>
              <Link 
                href="/agenda" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-gray-900 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Browse Agenda
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"
              >
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
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
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for ITC Vegas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access powerful tools designed to maximize your conference experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Link
                  key={index}
                  href={feature.href}
                  className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                >
                  {feature.badge && (
                    <span className="absolute -top-2 -right-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {feature.badge}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-4`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                <span>Powered by Claude 3.5 + Salesforce</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                See AI + Salesforce in Action
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                PS Advisory specializes in helping insurance organizations leverage Salesforce 
                and AI to improve profitability and reduce friction.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                This demo showcases how intelligent technology can transform conference experiences 
                with personalized recommendations and smart scheduling.
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
                href="/chat/intelligent"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
              >
                Try AI Concierge Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl transform rotate-3"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Concierge</h3>
                    <p className="text-xs text-gray-500">Always ready to help</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-2">Insurance Executive:</p>
                    <p className="text-sm font-medium">"I'm looking for Salesforce solutions for claims automation. What sessions should I prioritize?"</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-2">PS Advisory AI:</p>
                    <p className="text-sm">Perfect match for your needs:</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>⭐ 10:30 AM - Claims Automation and AI</li>
                      <li>⭐ 2:00 PM - Salesforce Insurance Cloud Deep Dive</li>
                      <li>📍 Recommended networking: Connect with PS Advisory team</li>
                      <li>💡 We specialize in Salesforce claims solutions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Start Exploring
            </h2>
            <p className="text-lg text-gray-600">
              Jump right into the features that matter most to you
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Link 
              href="/agenda/intelligent"
              className="group bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Try Intelligent Agenda</h3>
              <p className="text-sm text-gray-600">
                Experience AI-powered session recommendations
              </p>
            </Link>
            
            <Link 
              href="/speakers"
              className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Keynote Speakers</h3>
              <p className="text-sm text-gray-600">
                Meet industry leaders and visionaries
              </p>
            </Link>
            
            <Link 
              href="/chat/intelligent"
              className="group bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-white mb-2">Get Recommendations</h3>
              <p className="text-sm text-white/90">
                Let AI create your personalized conference plan
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}