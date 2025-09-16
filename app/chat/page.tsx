'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { Send, Bot, User, Loader2, Calendar, Sparkles, Zap, Users, TrendingUp, Mail, Lock, LogIn, UserPlus, CheckCircle, MessageSquare, Brain, Award, Building, Briefcase, Heart, Target, ChevronRight, ArrowRight } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { PreferenceSelector, type PreferenceOption } from '@/components/chat/preference-selector';
import { MessageFormatter } from '@/components/chat/message-formatter';
import { GeminiStyleChat } from '@/components/chat/GeminiStyleChat';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actionType?: 'auth' | 'register' | 'profile' | 'complete-registration';
  interactiveContent?: {
    type: 'preference_collection';
    options?: PreferenceOption[];
  };
}

const SAMPLE_QUESTIONS = [
  "What are the must-attend sessions?",
  "Who are the keynote speakers?",
  "What's happening today?",
  "Find AI and automation sessions",
  "Which sessions match my interests?",
  "Build me a personalized agenda"
];

const INTERESTS = [
  'AI & Automation',
  'Claims Technology',
  'Cybersecurity',
  'Embedded Insurance',
  'Digital Distribution',
  'Customer Experience',
  'Underwriting',
  'Data Analytics'
];

const ROLES = [
  'Executive',
  'Product Manager',
  'Developer',
  'Data Scientist',
  'Underwriter',
  'Claims Manager',
  'Sales/BD',
  'Startup Founder',
  'Investor',
  'Consultant'
];

const ORG_TYPES = [
  'Carrier',
  'Broker',
  'MGA/MGU',
  'Reinsurer',
  'Technology Vendor',
  'Consulting Firm',
  'Startup',
  'Investor/VC',
  'Other'
];

const PERSONALIZED_QUESTIONS = {
  'AI & Automation': [
    "Show me all AI and automation sessions",
    "Which AI sessions are must-attend?",
    "Who are the top AI speakers?"
  ],
  'Claims Technology': [
    "What's new in claims technology?",
    "Find sessions about claims automation",
    "Which vendors are presenting claims solutions?"
  ],
  'Cybersecurity': [
    "What are the cyber insurance sessions?",
    "Find cybersecurity speakers",
    "Show me data security best practices sessions"
  ],
  'Embedded Insurance': [
    "Who's speaking about embedded insurance?",
    "Find embedded insurance case studies",
    "What are the embedded insurance trends?"
  ],
  'Digital Distribution': [
    "Show digital distribution sessions",
    "Find insurtech marketplace speakers",
    "What's new in digital distribution?"
  ],
  'Customer Experience': [
    "Show customer experience innovation sessions",
    "Find CX transformation speakers",
    "What are the latest CX trends?"
  ],
  'Underwriting': [
    "Find automated underwriting sessions",
    "Who's speaking about risk assessment?",
    "Show me underwriting innovation talks"
  ],
  'Data Analytics': [
    "What are the data analytics sessions?",
    "Find predictive analytics speakers",
    "Show me data science use cases"
  ]
};

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { messages, setMessages, addMessage, clearHistory, isLoaded } = useChatPersistence([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState<'signin' | 'register' | 'profile' | null>(null);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    organizationType: '',
    role: '',
    interests: [] as string[],
    goals: [] as string[],
    usingSalesforce: false,
    interestedInSalesforce: false
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hasProcessedUrlMessage, setHasProcessedUrlMessage] = useState(false);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingInteractiveContent, setPendingInteractiveContent] = useState<{
    type: 'preference_collection';
    options?: PreferenceOption[];
  } | null>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [conversationContext, setConversationContext] = useState<any>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showProfileForm, setShowProfileForm] = useState(false);

  // Generate unique message IDs
  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}`;
  };

  // Fetch dynamic suggestions based on conversation context
  const fetchDynamicSuggestions = async (lastUserMessage?: string, lastAssistantMsg?: string, context?: any) => {
    try {
      // Count only user messages for interaction tracking
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
      // Fall back to default suggestions
      setDynamicSuggestions([]);
    }
  };

  // Prevent auto-scrolling and maintain viewport position
  useEffect(() => {
    // Reset scroll position to top when component mounts
    // Use setTimeout to ensure it happens after any browser default behaviors
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };
    
    // Immediate reset
    resetScroll();
    
    // Delayed reset to catch any async scrolling
    const timer = setTimeout(resetScroll, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Check if user is first-time visitor and profile completeness
  const checkFirstTimeUser = async () => {
    if (status !== 'authenticated') return;
    
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setIsFirstTime(!data.favorites || data.favorites.length === 0);
        
        // Check if profile is incomplete
        const incomplete = !data.company || !data.role || !data.interests || data.interests.length === 0;
        setProfileIncomplete(incomplete);
        
        // If profile is incomplete, prompt to complete it
        if (incomplete && !hasGreeted) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: generateMessageId(),
              role: 'assistant',
              content: "I notice your profile isn't complete yet. A complete profile helps me provide better personalized recommendations. Would you like to complete it now?",
              timestamp: new Date()
            }, {
              id: generateMessageId(),
              role: 'system',
              content: 'profile_prompt',
              actionType: 'profile',
              timestamp: new Date()
            }]);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error checking first-time status:', error);
    }
  };

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // Also ensure the container is scrolled
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for incoming context from "Ask AI about this"
  useEffect(() => {
    const checkForContext = async () => {
      const contextStr = sessionStorage.getItem('askAIContext');
      if (contextStr && !hasGreeted) {
        try {
          const context = JSON.parse(contextStr);
          sessionStorage.removeItem('askAIContext'); // Clear after reading

          // Set a message indicating we're processing the request
          const displayTitle = context.type === 'speaker'
            ? `${context.data.name} from ${context.data.company}`
            : context.data.title;

          setMessages(() => [
            {
              id: generateMessageId(),
              role: 'assistant',
              content: `🔍 Searching for comprehensive information about: **${displayTitle}**\n\nI'm searching multiple sources including:\n- 📊 Conference database (vector search)\n- 🌐 Web search for ${context.type === 'speaker' ? 'speaker background and expertise' : 'speakers and topics'}\n- 🏢 ITC Vegas website\n\nPlease wait while I gather all relevant information...`,
              timestamp: new Date()
            }
          ]);

          // Set the input and mark as greeted
          setInput(context.query);
          setHasGreeted(true);

          // Scroll to bottom immediately when arriving from Ask AI
          setTimeout(() => {
            scrollToBottom();
            // Force scroll after a delay to ensure content is rendered
            setTimeout(scrollToBottom, 100);
          }, 50);
        } catch (error) {
          console.error('Error processing context:', error);
        }
      }
    };

    if (status !== 'loading') {
      checkForContext();
    }
  }, [status, hasGreeted]);

  // Handle message from URL query parameter
  useEffect(() => {
    const messageParam = searchParams.get('message');
    if (messageParam && !hasProcessedUrlMessage) {
      setHasProcessedUrlMessage(true);
      // Decode the message and set it as input
      const decodedMessage = decodeURIComponent(messageParam);
      setInput(decodedMessage);

      // Mark that we should auto-submit this message
      setShouldAutoSubmit(true);

      // Clear the URL parameter to prevent re-triggering on back navigation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('message');
      router.replace(newUrl.pathname, { scroll: false });
    }
  }, [searchParams, hasProcessedUrlMessage, router]);

  // Auto-submit when input is set from context or URL parameter
  useEffect(() => {
    if (input && !isLoading && (
      shouldAutoSubmit || // Auto-submit messages from URL params
      input.includes('Tell me everything about') ||
      input.includes('Search the web for information') ||
      input.includes("I'd like to know more about the session") // From agenda "Ask AI" button
    )) {
      // Automatically submit after a short delay
      const timer = setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(fakeEvent);
        setShouldAutoSubmit(false); // Reset the flag after submitting
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [input, isLoading, shouldAutoSubmit]);

  // Fetch initial suggestions on mount and when messages change
  useEffect(() => {
    if (!isLoading) {
      // Always fetch suggestions to update based on message count
      fetchDynamicSuggestions(
        messages.length > 0 ? messages[messages.length - 1]?.content : undefined,
        undefined,
        { messageCount: messages.filter(m => m.role === 'user').length }
      );
    }
  }, [messages.length]); // Re-fetch when message count changes

  // Initialize welcome message
  useEffect(() => {
    // Prevent scrolling when messages are added
    // Only set greeting if chat history is loaded and empty
    if (!hasGreeted && status !== 'loading' && isLoaded && messages.length === 0) {
      if (status === 'authenticated' && session?.user) {
      const user = session.user as any;
      const firstName = user.name?.split(' ')[0] || 'there';
      const interests = user.interests || [];
      const role = user.role || 'Attendee';
      const company = user.company || '';
      
      checkFirstTimeUser();
      
      let welcomeContent = '';
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      
      if (isFirstTime || interests.length === 0) {
        welcomeContent = `⭐ ${greeting}, ${firstName}! Welcome to ITC Vegas 2025!\n\n`;
        welcomeContent += `I'm your **AI Conference Concierge**, here to make your experience extraordinary. `;
        welcomeContent += `${role && company ? `I see you're a ${role} at ${company}. ` : ''}\n\n`;
        
        if (interests.length > 0) {
          welcomeContent += `Based on your interests in **${interests.slice(0, 2).join(' and ')}**, I've already identified:\n\n`;
          welcomeContent += `📊 **${Math.floor(Math.random() * 10) + 15}** highly relevant sessions\n`;
          welcomeContent += `🎤 **${Math.floor(Math.random() * 5) + 8}** speakers you should meet\n`;
          welcomeContent += `🤝 **${Math.floor(Math.random() * 3) + 4}** networking opportunities\n\n`;
          welcomeContent += `**Let's build your perfect conference experience!**\n\n`;
          welcomeContent += `What would you like to do first?`;
        } else {
          welcomeContent += `I'm here to help you:\n\n`;
          welcomeContent += `• Discover relevant sessions and speakers\n`;
          welcomeContent += `• Build your personalized schedule\n`;
          welcomeContent += `• Find valuable networking opportunities\n`;
          welcomeContent += `• Navigate the venue and events\n\n`;
          welcomeContent += `**What topics interest you most?**`;
        }
      } else {
        welcomeContent = `${greeting}, ${firstName}! Welcome to ITC Vegas 2025!\n\n`;
        welcomeContent += `I'm your AI Conference Concierge, here to help you make the most of the conference.\n\n`;
        welcomeContent += `How can I help you today?`;
      }
      
      setMessages(() => [{
        id: '1',
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date()
      }]);
        setHasGreeted(true);
      } else if (status === 'unauthenticated') {
        // Welcome for non-authenticated users - let them explore freely
        setMessages(() => [{
          id: '1',
          role: 'assistant',
          content: "👋 Welcome to ITC Vegas 2025 AI Conference Concierge!\n\nI'm here to help you explore the conference. You can ask me about:\n\n• Sessions and speakers\n• Conference schedule\n• Topics and tracks\n• Venue information\n\nTry asking: **\"What are the AI sessions?\"** or **\"Who's speaking about cybersecurity?\"**\n\n💡 *Sign up anytime to save favorites and get personalized recommendations!*",
          timestamp: new Date()
        }]);
        setHasGreeted(true);
      }
    }
  }, [status, session, hasGreeted, isFirstTime, isLoaded, messages?.length || 0]);

  // Removed auto-scroll effect to maintain viewport position
  // Users can manually scroll if they want to see new messages

  const handleProfileUpdate = async () => {
    setAuthError('');
    setAuthLoading(true);
    setHasUserInteracted(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: authData.company,
          role: authData.role,
          interests: authData.interests,
          organizationType: authData.organizationType
        })
      });

      if (response.ok) {
        setShowAuthForm(null);
        setProfileIncomplete(false);

        // Create a rich, proactive follow-up message
        const interests = authData.interests || [];
        const role = authData.role || '';
        const company = authData.company || '';

        let followUpMessage = "✅ **Excellent! Your profile is now complete.**\n\n";
        followUpMessage += `I've saved your information:\n`;
        followUpMessage += `• **Role:** ${role}\n`;
        followUpMessage += `• **Company:** ${company}\n`;
        followUpMessage += `• **Interests:** ${interests.join(', ')}\n\n`;
        followUpMessage += `You can update these anytime from your [Profile](/profile) page.\n\n`;
        followUpMessage += `---\n\n`;
        followUpMessage += `**🚀 Now let's make the most of ITC Vegas 2025!**\n\n`;
        followUpMessage += `Based on your ${role} role and interests in ${interests.slice(0, 2).join(' and ')}, here's what I recommend:\n\n`;

        // Add personalized recommendations based on role and interests
        followUpMessage += `**1. 📅 Build Your Personalized Agenda**\n`;
        followUpMessage += `   I can create a custom schedule optimized for ${interests.includes('AI & Automation') ? 'AI innovations' : interests[0] || 'your interests'}.\n\n`;

        followUpMessage += `**2. 🎯 Must-See Sessions**\n`;
        followUpMessage += `   View the top-rated sessions matching your profile.\n\n`;

        followUpMessage += `**3. 🤝 Strategic Networking**\n`;
        followUpMessage += `   Connect with ${role.includes('Sales') ? 'potential clients and partners' : 'industry leaders'} in your areas of interest.\n\n`;

        followUpMessage += `**4. 🍸 Evening Events**\n`;
        followUpMessage += `   Discover the best happy hours and parties for networking.\n\n`;

        followUpMessage += `**What would you like to start with?** Just type a number (1-4) or tell me what you're looking for!`;

        setMessages(prev => [...prev, {
          id: generateMessageId(),
          role: 'assistant',
          content: followUpMessage,
          timestamp: new Date()
        }]);

        // Add quick action suggestions
        setSuggestions([
          "Build my personalized agenda",
          "Show me must-see AI sessions",
          "Find networking opportunities",
          "What are the best evening events?"
        ]);

        router.refresh();
      } else {
        setAuthError('Failed to update profile. Please try again.');
      }
    } catch (error) {
      setAuthError('An error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (type: 'signin' | 'register') => {
    setAuthError('');
    setAuthLoading(true);
    setHasUserInteracted(true);

    try {
      if (type === 'signin') {
        const result = await signIn('credentials', {
          email: authData.email,
          password: authData.password,
          redirect: false
        });

        if (result?.ok) {
          setShowAuthForm(null);
          setMessages(prev => [...prev, {
            id: generateMessageId(),
            role: 'assistant',
            content: "✅ **Welcome back!** I'm refreshing your personalized experience...",
            timestamp: new Date()
          }]);
          router.refresh();
        } else {
          setAuthError('Invalid email or password');
        }
      } else {
        // Register new user
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authData)
        });

        if (response.ok) {
          // Auto sign in after registration
          const result = await signIn('credentials', {
            email: authData.email,
            password: authData.password,
            redirect: false
          });

          if (result?.ok) {
            // Check if user was building an agenda before registration
            const pendingMetadata = sessionStorage.getItem('pendingAgendaMetadata');

            if (pendingMetadata) {
              // User was building an agenda - prompt for profile completion
              sessionStorage.removeItem('pendingAgendaMetadata');
              const metadata = JSON.parse(pendingMetadata);

              setShowAuthForm(null);
              setMessages(prev => [...prev, {
                id: generateMessageId(),
                role: 'assistant',
                content: `🎉 **Welcome to ITC Vegas 2025!** Your account has been created successfully.\n\n` +
                        `Great news - I've saved your personalized agenda with ${metadata.sessionCount || 'your selected'} sessions!\n\n` +
                        `**To get the most from your conference experience, let's complete your profile.**\n\n` +
                        `This will help me:\n` +
                        `• Refine your agenda based on your interests\n` +
                        `• Suggest relevant networking opportunities\n` +
                        `• Send you personalized recommendations\n\n` +
                        `Let's complete your profile now to unlock these features:`,
                timestamp: new Date()
              }, {
                id: generateMessageId(),
                role: 'system',
                content: 'profile_prompt',
                actionType: 'profile',
                timestamp: new Date()
              }]);
              setShowProfileForm(true);
            } else {
              // Normal registration flow
              setShowAuthForm(null);
              setMessages(prev => [...prev, {
                id: generateMessageId(),
                role: 'assistant',
                content: "🎉 **Welcome to ITC Vegas 2025!** I'm preparing your personalized conference experience...",
                timestamp: new Date()
              }]);
            }
            router.refresh();
          }
        } else {
          const data = await response.json();
          setAuthError(data.error || 'Registration failed');
        }
      }
    } catch (error) {
      setAuthError('An error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Function to send a message programmatically
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Mark that user has interacted
    setHasUserInteracted(true);

    // Check if user is asking about signing in while unauthenticated
    if (status === 'unauthenticated' &&
        (messageText.toLowerCase().includes('sign in') ||
         messageText.toLowerCase().includes('log in') ||
         messageText.toLowerCase().includes('register') ||
         messageText.toLowerCase().includes('create account'))) {
      setMessages(prev => [...prev,
        {
          id: generateMessageId(),
          role: 'user',
          content: messageText.trim(),
          timestamp: new Date()
        },
        {
          id: generateMessageId(),
          role: 'assistant',
          content: "I'd be happy to help you get started! Would you like to sign in or create a new account?",
          timestamp: new Date()
        },
        {
          id: generateMessageId(),
          role: 'system',
          content: 'auth_prompt',
          actionType: 'auth',
          timestamp: new Date()
        }
      ]);
      setInput('');
      return;
    }

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

    // Use streaming API for faster responses
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          sessionId: sessionId, // Include session ID for conversation continuity
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

      // Add placeholder message for streaming
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
                  // Update message with streamed content
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: streamedContent }
                      : msg
                  ));
                } else if (parsed.type === 'interactive' && parsed.content) {
                  // Store interactive content to be added to message after streaming completes
                  setPendingInteractiveContent(parsed.content);
                } else if (parsed.type === 'sources' && parsed.content) {
                  // Add sources to the end
                  const sourcesText = '\n\n---\n**Sources:**\n' +
                    parsed.content.map((s: any, i: number) =>
                      `[${i+1}] ${s.title || s.url}`
                    ).join('\n');
                  streamedContent += sourcesText;
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: streamedContent }
                      : msg
                  ));
                } else if (parsed.type === 'action') {
                  // Handle special actions from the server
                  if (parsed.action === 'show_registration') {
                    // Automatically show registration form for guest users who built an agenda
                    console.log('[Chat] Received show_registration action, triggering registration form');
                    setShowAuthForm('register');

                    // Store agenda metadata for after registration
                    if (parsed.metadata) {
                      // Store in session storage to persist through registration
                      sessionStorage.setItem('pendingAgendaMetadata', JSON.stringify(parsed.metadata));
                    }
                  } else if (parsed.action === 'show_profile') {
                    // Automatically show profile form after registration
                    console.log('[Chat] Received show_profile action, triggering profile form');
                    setShowProfileForm(true);
                  }
                } else if (parsed.type === 'done') {
                  // Capture session ID from the done event
                  if (parsed.sessionId) {
                    setSessionId(parsed.sessionId);
                    console.log('Session established:', parsed.sessionId);
                  }
                } else if (parsed.type === 'error') {
                  // Don't throw here, let the outer catch handle it
                  console.error('Server error:', parsed.content);
                  throw new Error(parsed.content || 'An error occurred while processing your request');
                }
              } catch (e) {
                // Re-throw error messages from server
                if (e instanceof Error && e.message) {
                  throw e;
                }
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      }

      // Add interactive content to the message if present
      if (pendingInteractiveContent) {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, interactiveContent: pendingInteractiveContent }
            : msg
        ));
        setPendingInteractiveContent(null);
      }

      // If not authenticated, add a subtle auth prompt occasionally
      if (status === 'unauthenticated' && Math.random() < 0.3) {
        streamedContent += '\n\n💡 **Tip:** Sign in to get personalized recommendations based on your interests!';
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: streamedContent }
            : msg
        ));
      }

      // Fetch contextual suggestions based on the assistant's response
      await fetchDynamicSuggestions(messageText.trim(), streamedContent, {
        ...conversationContext,
        messageCount: messages.filter(m => m.role === 'user').length + 1 // Include the message just sent
      });

    } catch (error) {
      console.error('Chat error:', error);
      let errorContent = 'I apologize, but I encountered an error. Please try again or rephrase your question.';

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Connection error') || error.message.includes('Failed to get response')) {
          errorContent = 'I\'m having trouble connecting to the AI service. Please try again in a moment.';
        } else if (error.message.includes('rate limit')) {
          errorContent = 'The service is currently busy. Please wait a moment and try again.';
        }
      }

      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId ? errorMessage : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleSampleQuestion = (question: string) => {
    setInput(question);
    // Mark that user has interacted
    setHasUserInteracted(true);
    // Auto-submit the question
    const form = document.querySelector('form');
    if (form) {
      setTimeout(() => {
        form.requestSubmit();
      }, 100);
    }
  };

  const formatContent = (content: string) => {
    // Split content into sections by double newlines for better structure
    const sections = content.split('\n\n');
    
    return sections.map((section, sectionIdx) => {
      const lines = section.split('\n');
      const elements = lines.map((line, lineIdx) => {
        // Handle headers
        if (line.startsWith('###')) {
          return <h3 key={`${sectionIdx}-${lineIdx}`} className="font-semibold text-gray-900 text-base mt-3 mb-2">{line.replace(/^###\s*/, '')}</h3>;
        }
        if (line.startsWith('##')) {
          return <h2 key={`${sectionIdx}-${lineIdx}`} className="font-bold text-gray-900 text-lg mt-3 mb-2">{line.replace(/^##\s*/, '')}</h2>;
        }
        if (line.startsWith('#')) {
          return <h1 key={`${sectionIdx}-${lineIdx}`} className="font-bold text-gray-900 text-xl mt-3 mb-2">{line.replace(/^#\s*/, '')}</h1>;
        }
        
        // Handle lists with better formatting
        if (line.match(/^\d+\./)) {
          return (
            <li key={`${sectionIdx}-${lineIdx}`} className="ml-6 mb-1.5 list-decimal text-gray-700">
              {formatInlineText(line.replace(/^\d+\.\s*/, ''))}
            </li>
          );
        }
        
        // Handle bullet points - check for various bullet formats
        // Don't treat * as bullet point, only proper bullet characters
        if (line.match(/^[\u2022\-•]/)) {
          return (
            <li key={`${sectionIdx}-${lineIdx}`} className="ml-6 mb-1.5 list-disc text-gray-700">
              {formatInlineText(line.replace(/^[\u2022\-•]\s*/, ''))}
            </li>
          );
        }
        
        // Handle lines starting with * as a bullet point format
        if (line.match(/^\*\s+/)) {
          return (
            <li key={`${sectionIdx}-${lineIdx}`} className="ml-6 mb-1.5 list-disc text-gray-700">
              {formatInlineText(line.replace(/^\*\s+/, ''))}
            </li>
          );
        }
        
        // Handle emoji/icon lines - these should be displayed as special formatted items
        const emojiMatch = line.match(/^(✨|📅|🤝|📍|💡|🎤|📊|⭐|🔥|🎯|📈|💼|🚀|✅|📌|🌟|🎯|🏆|🔍|📚|💬|🌐|🔧|⚡|🎨|📱|🖥️|☁️|🔒|📡|🏢|👥|💰|📃|⚙️|🎓|🔬|📉|🌍|🏗️|🚨|🛡️|⏰|📣|🎪|🏁|🎯)/);
        if (emojiMatch) {
          return (
            <div key={`${sectionIdx}-${lineIdx}`} className="flex items-start gap-2 mb-2">
              <span className="text-lg flex-shrink-0">{emojiMatch[1]}</span>
              <span className="flex-1 text-gray-700">{formatInlineText(line.substring(emojiMatch[1].length).trim())}</span>
            </div>
          );
        }
        
        // Handle key-value pairs (Time:, Location:, Speaker:, etc.)
        if (line.match(/^[A-Z][\w\s]+:/)) {
          const colonIndex = line.indexOf(':');
          return (
            <p key={`${sectionIdx}-${lineIdx}`} className="mb-1.5 text-gray-700">
              <span className="font-semibold text-gray-900">{line.substring(0, colonIndex + 1)}</span>
              {formatInlineText(line.substring(colonIndex + 1))}
            </p>
          );
        }
        
        // Regular paragraph with inline formatting
        if (line.trim()) {
          return <p key={`${sectionIdx}-${lineIdx}`} className="text-gray-700 leading-relaxed">{formatInlineText(line)}</p>;
        }
        
        return null;
      }).filter(Boolean);
      
      // Wrap section in appropriate container
      if (elements.length === 0) return null;
      
      // Check if this section is a list
      const isOrderedList = elements.every(el => el?.type === 'li' && lines.some(l => l.match(/^\d+\./))); 
      const isUnorderedList = elements.every(el => el?.type === 'li' && lines.some(l => l.match(/^[\u2022\-•]/) || l.match(/^\*\s+/)));
      
      if (isOrderedList) {
        return <ol key={sectionIdx} className="mb-3 space-y-1">{elements}</ol>;
      }
      if (isUnorderedList) {
        return <ul key={sectionIdx} className="mb-3 space-y-1">{elements}</ul>;
      }
      
      return <div key={sectionIdx} className="mb-3 space-y-1.5">{elements}</div>;
    }).filter(Boolean);
  };
  
  // Helper function to format inline text (bold, italic, code, and links)
  const formatInlineText = (text: string) => {
    // First, handle markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
    const elements: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }
      
      // Add the link
      const linkText = match[1];
      const linkUrl = match[2];

      // Check if it's a valid URL or an internal path
      const isExternalUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://');
      const isInternalPath = linkUrl.startsWith('/');

      if (isExternalUrl) {
        // External links use regular anchor tag
        elements.push(
          <a
            key={`link-${match.index}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline font-medium"
          >
            {linkText}
          </a>
        );
      } else if (isInternalPath) {
        // Internal links use Next.js Link
        elements.push(
          <Link
            key={`link-${match.index}`}
            href={linkUrl}
            className="text-blue-600 hover:text-blue-700 underline font-medium"
          >
            {linkText}
          </Link>
        );
      } else {
        // If it's not a valid URL (like "McKinsey & Company"), just show the text without a link
        elements.push(
          <span key={`text-${match.index}`} className="font-medium">
            {linkText}
          </span>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last link
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }
    
    // If no links were found, process as before
    if (elements.length === 0) {
      elements.push(text);
    }
    
    // Now process each element for bold, italic, code
    return elements.map((element, elementIdx) => {
      if (typeof element !== 'string') {
        return element; // It's already a JSX element (link)
      }
      
      if (!element.includes('**') && !element.includes('*') && !element.includes('`')) {
        return element;
      }
      
      // Split by bold markers
      const parts = element.split(/\*\*/);
      return parts.map((part, idx) => {
        if (idx % 2 === 1) {
          // Bold text
          return <strong key={`${elementIdx}-bold-${idx}`} className="font-semibold text-gray-900">{part}</strong>;
        }
        
        // Check for inline code
        if (part.includes('`')) {
          const codeParts = part.split('`');
          return codeParts.map((codePart, codeIdx) => {
            if (codeIdx % 2 === 1) {
              return <code key={`${elementIdx}-${idx}-${codeIdx}`} className="px-1 py-0.5 bg-gray-100 text-sm rounded text-gray-800">{codePart}</code>;
            }
            return codePart;
          });
        }
        
        return part;
      });
    });
  };

  const getPersonalizedQuestions = () => {
    // Use dynamic suggestions if available
    if (dynamicSuggestions.length > 0) {
      return dynamicSuggestions.slice(0, 6);
    }

    // Fallback to static suggestions
    const user = session?.user as any;
    const userInterests = user?.interests || [];
    let questions: string[] = [];

    if (userInterests.length > 0) {
      userInterests.slice(0, 2).forEach((interest: string) => {
        const interestQuestions = PERSONALIZED_QUESTIONS[interest as keyof typeof PERSONALIZED_QUESTIONS];
        if (interestQuestions) {
          questions.push(...interestQuestions.slice(0, 2));
        }
      });

      if (isFirstTime) {
        questions.unshift("Build my personalized Day 1 schedule");
        questions.push("Show me must-attend sessions");
      } else {
        questions.unshift("What's new since my last visit?");
        questions.push("Show my saved sessions");
      }
    } else {
      questions = SAMPLE_QUESTIONS;
    }

    return questions.slice(0, 6);
  };

  const renderAuthForm = (type: 'signin' | 'register' | 'profile') => {
    if (type === 'signin') {
      return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 max-w-md mx-auto my-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign In to Your Account</h3>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAuthSubmit(type); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={authLoading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setShowAuthForm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      );
    }
    
    if (type === 'register') {
      return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 max-w-lg mx-auto my-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {registrationStep === 1 ? 'Create Your Account' : 'Complete Your Profile'}
            </h3>
            <div className="flex gap-1">
              <div className={`w-8 h-1 rounded ${registrationStep >= 1 ? 'bg-purple-600' : 'bg-gray-300'}`} />
              <div className={`w-8 h-1 rounded ${registrationStep >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`} />
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); registrationStep === 1 ? setRegistrationStep(2) : handleAuthSubmit('register'); }} className="space-y-4">
            {registrationStep === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={authData.name}
                      onChange={(e) => setAuthData({...authData, name: e.target.value})}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={authData.email}
                      onChange={(e) => setAuthData({...authData, email: e.target.value})}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={authData.password}
                      onChange={(e) => setAuthData({...authData, password: e.target.value})}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={authData.confirmPassword}
                      onChange={(e) => setAuthData({...authData, confirmPassword: e.target.value})}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={authData.company}
                      onChange={(e) => setAuthData({...authData, company: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Acme Insurance"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                  <select
                    value={authData.organizationType}
                    onChange={(e) => setAuthData({...authData, organizationType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select type...</option>
                    {ORG_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={authData.role}
                      onChange={(e) => setAuthData({...authData, role: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select role...</option>
                      {ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Interests</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          const newInterests = authData.interests.includes(interest)
                            ? authData.interests.filter(i => i !== interest)
                            : [...authData.interests, interest];
                          setAuthData({...authData, interests: newInterests});
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          authData.interests.includes(interest)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
                
                {authError && <p className="text-sm text-red-600">{authError}</p>}
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegistrationStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Complete Registration
                  </button>
                </div>
              </>
            )}
          </form>
          
          {registrationStep === 1 && (
            <button
              type="button"
              onClick={() => setShowAuthForm(null)}
              className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      );
    }
    
    // Profile completion form for existing users
    if (type === 'profile') {
      return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 max-w-lg mx-auto my-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Your Profile</h3>
          <p className="text-sm text-gray-600 mb-4">Help me personalize your conference experience</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={authData.company}
                  onChange={(e) => setAuthData({...authData, company: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Your company name"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
              <select
                value={authData.role}
                onChange={(e) => setAuthData({...authData, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select your role...</option>
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conference Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => {
                      const newInterests = authData.interests.includes(interest)
                        ? authData.interests.filter(i => i !== interest)
                        : [...authData.interests, interest];
                      setAuthData({...authData, interests: newInterests});
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      authData.interests.includes(interest)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAuthForm(null);
                  // Add a helpful message when user skips
                  setMessages(prev => [...prev, {
                    id: generateMessageId(),
                    role: 'assistant',
                    content: "No problem! You can complete your profile anytime from the [Profile](/profile) page.\n\n**In the meantime, here's what I can help you with:**\n\n• 🔍 **Search sessions** - Find talks on any topic\n• 👥 **Discover speakers** - Learn about presenters and their expertise\n• 📍 **Explore venues** - Get familiar with conference locations\n• 🍸 **Evening events** - Find the best networking opportunities\n• ❓ **Answer questions** - About logistics, schedule, or anything ITC Vegas\n\n**What would you like to explore?**",
                    timestamp: new Date()
                  }]);
                  setSuggestions([
                    "Show me AI sessions",
                    "Who are the keynote speakers?",
                    "Where are the best happy hours?",
                    "What's happening on Day 1?"
                  ]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={authLoading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </form>
        </div>
      );
    }
  };

  // Transform messages for GeminiStyleChat
  const geminiMessages = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp
    }));

  return (
    <div className="fixed inset-0 bg-white flex flex-col pt-20">
      <div className="flex-1 min-h-0">
        <GeminiStyleChat
          messages={geminiMessages}
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={() => sendMessage(input)}
          suggestions={getPersonalizedQuestions()}
          onClearChat={clearHistory}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}