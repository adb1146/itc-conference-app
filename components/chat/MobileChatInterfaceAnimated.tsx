'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft, MoreVertical, Sparkles } from 'lucide-react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { MessageFormatter } from './message-formatter'
import { PSAdvisoryLogo } from '../PSAdvisoryLogo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

export function MobileChatInterfaceAnimated({
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
  const router = useRouter()

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
      triggerHaptic()
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  // Haptic feedback
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  // Handle swipe to go back
  const handleSwipe = (event: any, info: PanInfo) => {
    if (info.offset.x > 100 && Math.abs(info.offset.y) < 50) {
      triggerHaptic()
      router.back()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Mobile Header - Fixed */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 safe-area-top"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="p-2 -ml-2" onClick={triggerHaptic}>
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
            onClick={() => {
              triggerHaptic()
              setShowMenu(!showMenu)
            }}
            className="p-2 -mr-2"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Animated Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-2 top-14 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
            >
              {onClearChat && (
                <button
                  onClick={() => {
                    triggerHaptic()
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
                onClick={() => {
                  triggerHaptic()
                  setShowMenu(false)
                }}
              >
                Profile
              </Link>
              <Link
                href="/favorites"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  triggerHaptic()
                  setShowMenu(false)
                }}
              >
                Favorites
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Messages Area with Swipe Gesture */}
      <motion.div
        className="flex-1 overflow-y-auto pt-16 pb-32"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipe}
      >
        <div className="px-4 py-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mx-auto mb-4"
              >
                <PSAdvisoryLogo className="w-10 h-10 text-purple-600" />
              </motion.div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Welcome to ITC Vegas 2025
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                I'm your AI conference assistant. Ask me anything!
              </p>

              {/* Animated Suggestion Pills */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.slice(0, 4).map((suggestion, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      onClick={() => {
                        triggerHaptic()
                        onSuggestionClick?.(suggestion)
                      }}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 200
                }}
                className={`mb-4 ${
                  message.role === 'user' ? 'flex justify-end' : ''
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start mb-4"
            >
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%]">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 0.6, delay: 0.1, repeat: Infinity }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 0.6, delay: 0.2, repeat: Infinity }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </motion.div>

      {/* Input Area - Fixed at Bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom"
      >
        {/* Animated Quick Suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && messages.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-2 overflow-x-auto"
            >
              <div className="flex gap-2 w-max">
                {suggestions.map((suggestion, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      triggerHaptic()
                      onSuggestionClick?.(suggestion)
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap disabled:opacity-50"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
            whileTap={{ scale: 0.9 }}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>

        {/* Minimal Footer Message */}
        <div className="px-4 py-1.5 text-center">
          <p className="text-xs text-gray-500">
            AI can make mistakes • <span className="text-purple-600">✨ Powered by AI</span>
          </p>
        </div>
      </motion.div>

      <style jsx>{`
        /* Safe area handling for iOS */
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }

        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
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