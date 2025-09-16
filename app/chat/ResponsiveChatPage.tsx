'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { GeminiStyleChat } from '@/components/chat/GeminiStyleChat';
import { MobileChatInterface } from '@/components/chat/MobileChatInterface';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function ResponsiveChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { messages, setMessages, addMessage, clearHistory, isLoaded } = useChatPersistence([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [conversationContext, setConversationContext] = useState<any>({});

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate unique message IDs
  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random()}`;
  };

  // Fetch dynamic suggestions
  const fetchDynamicSuggestions = async (lastUserMessage?: string, lastAssistantMsg?: string, context?: any) => {
    try {
      const userMessageCount = messages.filter(m => m.role === 'user').length;

      const response = await fetch('/api/ai/question-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationContext: context || conversationContext,
          lastMessage: lastUserMessage,
          lastAssistantMessage: lastAssistantMsg,
          messageCount: userMessageCount
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDynamicSuggestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setDynamicSuggestions([]);
    }
  };

  // Initialize welcome message
  useEffect(() => {
    if (!hasGreeted && status !== 'loading' && isLoaded && messages.length === 0) {
      let welcomeContent = '';

      if (status === 'authenticated' && session?.user) {
        const user = session.user as any;
        const firstName = user.name?.split(' ')[0] || 'there';
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

        welcomeContent = `${greeting}, ${firstName}! Welcome to ITC Vegas 2025!\n\n`;
        welcomeContent += `I'm your AI Conference Concierge, here to help you make the most of the conference.\n\n`;
        welcomeContent += `How can I help you today?`;
      } else {
        welcomeContent = "👋 Welcome to ITC Vegas 2025 AI Conference Concierge!\n\nI'm here to help you explore the conference. You can ask me about:\n\n• Sessions and speakers\n• Conference schedule\n• Topics and tracks\n• Venue information\n\nTry asking: **\"What are the AI sessions?\"** or **\"Who's speaking about cybersecurity?\"**\n\n💡 *Sign up anytime to save favorites and get personalized recommendations!*";
      }

      setMessages([{
        id: generateMessageId(),
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date()
      }]);
      setHasGreeted(true);
    }
  }, [status, session, hasGreeted, isLoaded, messages?.length]);

  // Send message function
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    const assistantMessageId = generateMessageId();

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          sessionId: sessionId,
          userPreferences: session?.user ? {
            name: (session.user as any).name,
            role: (session.user as any).role,
            company: (session.user as any).company,
            interests: (session.user as any).interests || [],
            isFirstTime: isFirstTime,
            email: (session.user as any).email
          } : {}
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let streamedContent = '';
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'content') {
                  streamedContent += parsed.content;
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: streamedContent }
                      : msg
                  ));
                } else if (parsed.type === 'done' && parsed.sessionId) {
                  setSessionId(parsed.sessionId);
                }
              } catch (e) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      }

      await fetchDynamicSuggestions(messageText.trim(), streamedContent, {
        ...conversationContext,
        messageCount: messages.filter(m => m.role === 'user').length + 1
      });

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or rephrase your question.',
        timestamp: new Date()
      };
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId ? errorMessage : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => sendMessage(suggestion), 100);
  };

  // Filter messages for display (remove system messages)
  const displayMessages = messages.filter(msg => msg.role !== 'system');

  // Mobile interface
  if (isMobile) {
    return (
      <MobileChatInterface
        messages={displayMessages}
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onClearChat={clearHistory}
        suggestions={dynamicSuggestions.length > 0 ? dynamicSuggestions : [
          "What are the must-attend sessions?",
          "Who are the keynote speakers?",
          "What's happening today?",
          "Find AI sessions"
        ]}
        onSuggestionClick={handleSuggestionClick}
      />
    );
  }

  // Desktop interface
  return (
    <div className="h-screen flex flex-col pt-16">
      <div className="flex-1 overflow-hidden">
        <GeminiStyleChat
          messages={displayMessages}
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          suggestions={dynamicSuggestions.length > 0 ? dynamicSuggestions : [
            "What are the must-attend sessions?",
            "Who are the keynote speakers?",
            "What's happening today?",
            "Find AI and automation sessions",
            "Which sessions match my interests?",
            "Build me a personalized agenda"
          ]}
          onClearChat={clearHistory}
        />
      </div>
    </div>
  );
}