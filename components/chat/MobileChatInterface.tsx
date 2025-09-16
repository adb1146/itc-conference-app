'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft, MoreVertical, Sparkles } from 'lucide-react'
import { MessageFormatter } from './message-formatter'
import { PSAdvisoryLogo } from '../PSAdvisoryLogo'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MobileChatInterfaceProps {
  messages: Message[]
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: () => void
  onClearChat?: () => void
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
}

export function MobileChatInterface({
  messages,
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onClearChat,
  suggestions = [],
  onSuggestionClick
}: MobileChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showMenu, setShowMenu] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      const newHeight = Math.min(inputRef.current.scrollHeight, 120)
      inputRef.current.style.height = `${newHeight}px`
    }
  }, [input])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
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
    <div className="flex flex-col h-screen bg-white">
      {/* Mobile Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <PSAdvisoryLogo className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">ITC Concierge</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Assistant
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 -mr-2"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-2 top-14 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {onClearChat && (
              <button
                onClick={() => {
                  onClearChat()
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear chat
              </button>
            )}
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setShowMenu(false)}
            >
              Profile
            </Link>
            <Link
              href="/favorites"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setShowMenu(false)}
            >
              Favorites
            </Link>
          </div>
        )}
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto pt-16 pb-32">
        <div className="px-4 py-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
                <PSAdvisoryLogo className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Welcome to ITC Vegas 2025
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                I'm your AI conference assistant. Ask me anything!
              </p>

              {/* Suggestion Pills */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.slice(0, 4).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSuggestionClick?.(suggestion)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === 'user' ? 'flex justify-end' : ''
              }`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5'
                    : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5'
                }`}
              >
                {message.role === 'assistant' ? (
                  <MessageFormatter content={message.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%]">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        {/* Quick Suggestions - Horizontal Scroll */}
        {suggestions.length > 0 && messages.length > 0 && (
          <div className="px-4 py-2 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about sessions, speakers, or the conference..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {/* Minimal Footer Message */}
        <div className="px-4 py-1.5 text-center">
          <p className="text-xs text-gray-500">
            AI can make mistakes • <span className="text-purple-600">✨ Powered by AI</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        /* Safe area handling for iOS */
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }

        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* Animation delays */
        .delay-100 {
          animation-delay: 100ms;
        }

        .delay-200 {
          animation-delay: 200ms;
        }

        /* Smooth scrolling for iOS */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
        }

        /* Prevent pull-to-refresh on Chrome mobile */
        body {
          overscroll-behavior-y: contain;
        }
      `}</style>
    </div>
  )
}