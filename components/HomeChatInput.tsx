'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, MessageSquare } from 'lucide-react';
import AIQuestionHelper from './AIQuestionHelper';

export default function HomeChatInput() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setIsSubmitting(true);

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message.trim());

    // Navigate to chat page with message parameter
    router.push(`/chat?message=${encodedMessage}`);
  };

  const handleQuestionClick = (question: string) => {
    setMessage(question);
    // Auto-submit after a brief delay for user to see the question
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form && question) {
        form.requestSubmit();
      }
    }, 200);
  };

  const placeholders = [
    "Ask about AI sessions on Day 2...",
    "What cybersecurity talks should I attend?",
    "Show me the keynote schedule",
    "Find sessions about embedded insurance",
    "What's happening in the LATAM track?",
    "Recommend sessions for underwriters",
  ];

  // Rotate through placeholders
  const placeholder = placeholders[Math.floor(Date.now() / 5000) % placeholders.length];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* AI Question Helper - positioned above the input */}
      <div className="mb-3 flex justify-center">
        <AIQuestionHelper onQuestionClick={handleQuestionClick} />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center pl-4 pr-2 text-gray-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            disabled={isSubmitting}
            className="flex-1 px-2 py-4 bg-transparent text-white placeholder-gray-400 focus:outline-none disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className="p-3 m-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            aria-label="Send message"
          >
            <Send className={`w-5 h-5 ${isSubmitting ? 'animate-pulse' : ''}`} />
          </button>
        </div>
        <p className="text-center text-sm text-gray-300 mt-3">
          Ask your AI Concierge about sessions, speakers, or schedule recommendations
        </p>
      </form>
    </div>
  );
}