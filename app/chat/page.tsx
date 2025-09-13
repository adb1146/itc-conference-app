'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Calendar, Sparkles, Zap, Users, TrendingUp, Mail, Lock, LogIn, UserPlus, CheckCircle, MessageSquare, Brain, Award, Building, Briefcase, Heart, Target, ChevronRight, ArrowRight } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useChatPersistence } from '@/hooks/useChatPersistence';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actionType?: 'auth' | 'register' | 'profile' | 'complete-registration';
}

const SAMPLE_QUESTIONS = [
  "Show me all the keynote speakers",
  "What's happening on Day 2?",
  "Find AI and automation sessions",
  "Which sessions should I attend for cyber insurance?",
  "Create my personalized schedule",
  "Who is speaking about embedded insurance?"
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

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { messages, setMessages, addMessage, clearHistory, isLoaded } = useChatPersistence([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState<'signin' | 'register' | 'profile' | null>(null);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
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
              id: Date.now().toString(),
              role: 'assistant',
              content: "I notice your profile isn't complete yet. A complete profile helps me provide better personalized recommendations. Would you like to complete it now?",
              timestamp: new Date()
            }, {
              id: (Date.now() + 1).toString(),
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
  }, [status, session, hasGreeted, isFirstTime, isLoaded, messages.length]);

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
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "✅ **Profile updated successfully!** Now I can provide you with more personalized recommendations based on your interests.\n\nWhat would you like to explore first?",
          timestamp: new Date()
        }]);
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
            id: Date.now().toString(),
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
            setShowAuthForm(null);
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "🎉 **Welcome to ITC Vegas 2025!** I'm preparing your personalized conference experience...",
              timestamp: new Date()
            }]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Mark that user has interacted
    setHasUserInteracted(true);

    // Check if user is asking about signing in while unauthenticated
    if (status === 'unauthenticated' && 
        (input.toLowerCase().includes('sign in') || 
         input.toLowerCase().includes('log in') || 
         input.toLowerCase().includes('register') ||
         input.toLowerCase().includes('create account'))) {
      setMessages(prev => [...prev, 
        {
          id: Date.now().toString(),
          role: 'user',
          content: input.trim(),
          timestamp: new Date()
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'd be happy to help you get started! Would you like to sign in or create a new account?",
          timestamp: new Date()
        },
        {
          id: (Date.now() + 2).toString(),
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
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/vector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          userPreferences: session?.user ? {
            name: (session.user as any).name,
            role: (session.user as any).role,
            company: (session.user as any).company,
            interests: (session.user as any).interests || [],
            isFirstTime: isFirstTime
          } : {}
        }),
      });

      const data = await response.json();

      if (response.ok) {
        let assistantContent = data.response;
        
        // If not authenticated, add a subtle auth prompt occasionally
        if (status === 'unauthenticated' && Math.random() < 0.3) {
          assistantContent += '\n\n💡 **Tip:** Sign in to get personalized recommendations based on your interests!';
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or rephrase your question.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
      elements.push(
        <Link
          key={`link-${match.index}`}
          href={linkUrl}
          className="text-blue-600 hover:text-blue-700 underline font-medium"
        >
          {linkText}
        </Link>
      );
      
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
                onClick={() => setShowAuthForm(null)}
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

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col overflow-hidden pt-32">
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-5xl h-full flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col flex-1">
            {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">AI Conference Concierge</h1>
                  <p className="text-blue-100 text-sm">
                    {session?.user 
                      ? `Welcome back, ${(session.user as any).name?.split(' ')[0] || 'Attendee'}` 
                      : 'Your intelligent guide to ITC Vegas 2025'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {messages.length > 1 && (
                  <button
                    onClick={() => {
                      clearHistory();
                      setHasGreeted(false);
                    }}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                    title="Clear chat history"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear
                  </button>
                )}
                <div className="flex items-center gap-2 text-blue-100">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Oct 14-16, 2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="h-[700px] overflow-y-auto bg-gray-50 p-6">
            <div className="space-y-4">
              {messages.map((message) => {
                if (message.role === 'system') {
                  if (message.actionType === 'auth') {
                    return (
                      <div key={message.id} className="flex justify-center my-6">
                        {!showAuthForm ? (
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 max-w-md border border-purple-200">
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => setShowAuthForm('signin')}
                                className="flex-1 bg-white text-purple-700 py-3 px-4 rounded-xl hover:shadow-md transition-all flex items-center justify-center gap-2 border border-purple-200"
                              >
                                <LogIn className="w-5 h-5" />
                                Sign In
                              </button>
                              <button
                                onClick={() => setShowAuthForm('register')}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-xl hover:shadow-md transition-all flex items-center justify-center gap-2"
                              >
                                <UserPlus className="w-5 h-5" />
                                Create Account
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 text-center mt-4">
                              Or continue exploring without an account
                            </p>
                          </div>
                        ) : (
                          renderAuthForm(showAuthForm)
                        )}
                      </div>
                    );
                  }
                  
                  if (message.actionType === 'profile') {
                    return (
                      <div key={message.id} className="flex justify-center my-6">
                        {!showAuthForm ? (
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 max-w-md border border-purple-200">
                            <div className="flex flex-col gap-3">
                              <button
                                onClick={() => setShowAuthForm('profile')}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-xl hover:shadow-md transition-all flex items-center justify-center gap-2"
                              >
                                <User className="w-5 h-5" />
                                Complete My Profile
                              </button>
                              <button
                                onClick={() => {
                                  setMessages(prev => [...prev, {
                                    id: Date.now().toString(),
                                    role: 'assistant',
                                    content: "No problem! You can complete your profile anytime. Just let me know when you're ready.\n\nWhat would you like to explore about the conference?",
                                    timestamp: new Date()
                                  }]);
                                }}
                                className="w-full text-sm text-gray-600 hover:text-gray-800"
                              >
                                Maybe later
                              </button>
                            </div>
                          </div>
                        ) : (
                          renderAuthForm(showAuthForm)
                        )}
                      </div>
                    );
                  }
                  
                  return null;
                }

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className={`text-sm ${message.role === 'assistant' ? 'text-gray-800 space-y-2' : ''}`}>
                        {typeof message.content === 'string' 
                          ? formatContent(message.content)
                          : message.content}
                      </div>
                      <p className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && !isLoading && !showAuthForm && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {session?.user && (session.user as any).interests?.length > 0 
                  ? `Quick actions for you:` 
                  : 'Try asking:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {getPersonalizedQuestions().map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSampleQuestion(question)}
                    className="text-sm px-3 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors border border-gray-300"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="p-6 bg-white border-t border-gray-200">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  session?.user 
                    ? "Ask me anything about ITC Vegas..." 
                    : "Ask about sessions, speakers, or sign in for personalized recommendations"
                }
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading || showAuthForm !== null}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || showAuthForm !== null}
                className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
            <p className="text-xs text-gray-500 text-center mt-3">
              Powered by AI • ITC Vegas 2025 Conference Assistant
            </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}