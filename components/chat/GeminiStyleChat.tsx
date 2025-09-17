'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Plus, MoreVertical, User, MessageCircle, Wand2, Calendar, Users, MapPin, Trash2, Sparkles } from 'lucide-react'
import { MessageFormatter } from './message-formatter'
import { PSAdvisoryLogo } from '../PSAdvisoryLogo'
import './chat-animations.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface GeminiStyleChatProps {
  messages: Message[]
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: () => void
  onClearChat?: () => void
  suggestions?: string[]
}

export function GeminiStyleChat({
  messages,
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onClearChat,
  suggestions = []
}: GeminiStyleChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent, directMessage?: string) => {
    e.preventDefault()
    const messageToSend = directMessage || input
    if (messageToSend.trim() && !isLoading) {
      if (directMessage) {
        onInputChange(directMessage)
      }
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-purple-50/30 relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
              <PSAdvisoryLogo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">ITC Concierge</h1>
              <p className="text-xs text-gray-500">AI Conference Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onClearChat && (
              <button
                onClick={onClearChat}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full flex items-center gap-1 text-xs">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Online
            </span>
            <span className="hidden sm:block text-xs text-gray-500">ITC Vegas 2025</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-8 shadow-lg">
                <PSAdvisoryLogo className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-light text-gray-800 mb-3">
                Welcome to ITC Vegas 2025
              </h2>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                I'm your AI assistant for the conference. Ask me about sessions, speakers, or let me help you build your perfect agenda.
              </p>

              {/* Quick Start Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-blue-600 mb-2">🎯</div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Find Sessions</h3>
                  <p className="text-xs text-blue-700">Discover talks that match your interests</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-purple-600 mb-2">📅</div>
                  <h3 className="text-sm font-semibold text-purple-900 mb-1">Build Agenda</h3>
                  <p className="text-xs text-purple-700">Get a personalized schedule</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-green-600 mb-2">🤝</div>
                  <h3 className="text-sm font-semibold text-green-900 mb-1">Network</h3>
                  <p className="text-xs text-green-700">Find networking opportunities</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="group"
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {message.role === 'user' ? (
                    <div className="flex gap-4 justify-end">
                      <div className="max-w-[70%]">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl px-5 py-3 shadow-md">
                          <p className="text-white">{message.content}</p>
                        </div>
                        <div className="flex justify-end mt-1">
                          <span className="text-xs text-gray-400">
                            {new Date(message.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-md">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                          <PSAdvisoryLogo className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 max-w-[70%]">
                        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
                          <div className="prose prose-sm max-w-none text-gray-800">
                            <MessageFormatter
                              content={message.content}
                              onSuggestionClick={(suggestion) => {
                                onInputChange(suggestion)
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 transition-opacity" style={{ opacity: hoveredMessageId === message.id ? 1 : 0 }}>
                          <button className="p-1.5 hover:bg-blue-50 rounded-full transition-colors group/btn">
                            <svg className="w-4 h-4 text-gray-500 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded-full transition-colors group/btn">
                            <svg className="w-4 h-4 text-gray-500 group-hover/btn:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h4.764a2 2 0 001.789-2.894l-3.5-7A2 2 0 008.263 0H4.246c-.163 0-.326.02-.485.06L0 1m7 10V16a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L14 10V1m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" transform="scale(1, -1) translate(0, -24)" />
                            </svg>
                          </button>
                          <button className="p-1.5 hover:bg-gray-50 rounded-full transition-colors group/btn">
                            <svg className="w-4 h-4 text-gray-500 group-hover/btn:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button className="p-1.5 hover:bg-gray-50 rounded-full transition-colors group/btn">
                            <MoreVertical className="w-4 h-4 text-gray-500 group-hover/btn:text-gray-700" />
                          </button>
                          <span className="text-xs text-gray-400 ml-2">
                            {new Date(message.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                      <PSAdvisoryLogo className="w-5 h-5 text-white animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && messages.length > 0 && (
            <div className="mt-8 p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-xl">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-purple-600">💡</span> Suggested follow-ups
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => {
                  const colors = [
                    'bg-white hover:bg-blue-50 border-blue-200 text-blue-700',
                    'bg-white hover:bg-purple-50 border-purple-200 text-purple-700',
                    'bg-white hover:bg-green-50 border-green-200 text-green-700',
                    'bg-white hover:bg-orange-50 border-orange-200 text-orange-700'
                  ];
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        // Set the input first
                        onInputChange(suggestion)
                        // Submit using form submission to trigger handleSubmit
                        setTimeout(() => {
                          const form = document.querySelector('form') as HTMLFormElement
                          if (form) {
                            form.requestSubmit()
                          }
                        }, 10)
                      }}
                      className={`px-4 py-2 rounded-full text-sm transition-all border shadow-sm relative group ${
                        colors[index % colors.length]
                      }`}
                    >
                      <span className="relative">
                        {suggestion}
                        {index === 0 && <Sparkles className="inline-block ml-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="bg-white rounded-3xl shadow-md border border-gray-200 focus-within:shadow-lg focus-within:border-purple-300 transition-all">
              <div className="flex items-end p-2">
                <button
                  type="button"
                  className="p-3 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <Plus className="w-5 h-5" />
                </button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about ITC Vegas sessions, speakers, or schedules..."
                  className="flex-1 px-3 py-3 resize-none focus:outline-none text-gray-800 placeholder-gray-400"
                  rows={1}
                  disabled={isLoading}
                />

                <div className="flex items-center gap-1">
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`p-3 rounded-full transition-all ${
                      input.trim() && !isLoading
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-300'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-3 border-t border-gray-100 bg-gradient-to-r from-purple-50/30 to-blue-50/30">
                  <div className="flex gap-2 pt-3">
                    <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full hover:shadow-md transition-all">
                      🔍 Find sessions
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:shadow-md transition-all">
                      📅 Build agenda
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:shadow-md transition-all">
                      🤝 Networking
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}