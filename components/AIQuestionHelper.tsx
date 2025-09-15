'use client';

import { useState, useEffect } from 'react';
import { Bot, Sparkles, X } from 'lucide-react';
import './AIQuestionHelper.css';

interface AIQuestionHelperProps {
  onQuestionClick: (question: string) => void;
  className?: string;
}

const FALLBACK_QUESTIONS = [
  "Build me a personalized agenda for the conference",
  "What sessions should I attend if I'm interested in claims?",
  "I'm a broker, what would I be interested in?",
  "Show me the AI and automation sessions",
  "Who are the top speakers I should meet?",
  "What's happening on Day 2 of the conference?",
  "Find sessions about embedded insurance",
  "What are the must-attend keynotes?"
];

export default function AIQuestionHelper({ onQuestionClick, className = '' }: AIQuestionHelperProps) {
  const [questions, setQuestions] = useState<string[]>(FALLBACK_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Fetch dynamic questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ai/question-suggestions');
        if (response.ok) {
          const data = await response.json();
          if (data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
          }
        }
      } catch (error) {
        console.error('Failed to fetch AI questions:', error);
        // Keep fallback questions
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Rotate questions with fade animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
    }, 6000); // Change every 6 seconds

    return () => clearInterval(interval);
  }, [questions.length]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-24 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-10"
        aria-label="Show AI helper"
      >
        <Bot className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className={`relative inline-flex items-start gap-2 animate-fade-in ${className}`}>
      {/* Animated Bot Avatar */}
      <div className="relative flex-shrink-0">
        <div className="relative w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full animate-pulse"></div>
          <Bot className="w-6 h-6 text-white relative z-10" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Speech Bubble with Questions */}
      <div className="relative">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200 px-4 py-3 max-w-sm sm:max-w-sm transition-all hover:scale-105 hover:shadow-2xl speech-bubble-mobile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Try asking:
            </span>
            <button
              onClick={() => {
                setIsVisible(false);
                setHasInteracted(true);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors opacity-60 hover:opacity-100"
              aria-label="Hide suggestions"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => {
              onQuestionClick(questions[currentQuestionIndex]);
              setHasInteracted(true);
            }}
            className="text-left w-full group"
          >
            <p className="text-sm text-gray-700 group-hover:text-purple-700 transition-all duration-300 line-clamp-2 font-medium">
              "{questions[currentQuestionIndex]}"
            </p>
          </button>

          {/* Question Dots Indicator */}
          <div className="flex gap-1 mt-2 justify-center">
            {questions.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentQuestionIndex % 5
                    ? 'bg-purple-600 w-3'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Speech Bubble Triangle */}
        <div className="absolute left-0 top-3 -ml-2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-white"></div>
      </div>
    </div>
  );
}