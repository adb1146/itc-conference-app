'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Send, Bot, User, Loader2, Calendar, Users, MapPin, 
  Brain, Sparkles, Target, Clock, AlertCircle, Plus,
  ChevronRight, Settings, TrendingUp, Info, Building2, ExternalLink
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface UserProfile {
  name?: string;
  role?: string;
  company?: string;
  interests: string[];
  experience?: string;
  goals: string[];
}

const SAMPLE_QUESTIONS = [
  "Show me Salesforce solutions for insurance",
  "What AI sessions match my interests?",
  "Find sessions on claims automation",
  "Which sessions cover digital distribution?",
  "Sessions for insurance brokers and carriers",
  "What's the best schedule for learning about insurtech?"
];

const INTERESTS = [
  'AI & Automation', 'Claims Technology', 'Cybersecurity', 'Embedded Insurance',
  'Digital Distribution', 'Customer Experience', 'Underwriting', 'Data Analytics',
  'Blockchain', 'IoT & Telematics', 'Health Tech', 'Climate Risk'
];

const ROLES = [
  'Executive', 'Product Manager', 'Developer', 'Data Scientist', 
  'Underwriter', 'Claims Manager', 'Sales/BD', 'Startup Founder',
  'Investor', 'Consultant', 'Broker/Agent', 'Other'
];

export default function IntelligentChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    interests: [],
    goals: []
  });
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [sessionMetadata, setSessionMetadata] = useState<any>(null);
  const [conversationId] = useState(() => `conv-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize messages on client side only
  useEffect(() => {
    if (!isInitialized && status !== 'loading') {
      let welcomeMessage = "🎯 Welcome to PS Advisory's AI Conference Demo! This demonstration showcases how AI and Salesforce can transform conference experiences. I'll help you explore ITC Vegas 2025 sessions with personalized recommendations.";
      
      if (status === 'authenticated' && session?.user) {
        const userName = session.user.name || session.user.email?.split('@')[0] || 'there';
        welcomeMessage = `🎯 Welcome back, ${userName}! This is PS Advisory's demo of AI-powered conference intelligence. See how Salesforce + AI can personalize your ITC Vegas 2025 experience with smart recommendations and insights.`;
      }
      
      setMessages([{
        id: '1',
        role: 'system',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
      setIsInitialized(true);
    }
  }, [isInitialized, status, session]);

  // Add personalized message when profile loads
  useEffect(() => {
    if (isInitialized && status === 'authenticated' && userProfile.name && userProfile.interests.length > 0 && messages.length === 1) {
      const interests = userProfile.interests.slice(0, 3).join(', ');
      const personalizedMessage = `I see you're interested in ${interests}. I've prepared some personalized suggestions based on your profile. How can I help you make the most of ITC Vegas 2025?`;
      
      // Add a follow-up message with personalization
      const timer = setTimeout(() => {
        setMessages(prev => [...prev, {
          id: generateMessageId(),
          role: 'assistant',
          content: personalizedMessage,
          timestamp: new Date()
        }]);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized, status, userProfile, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user profile when logged in
  useEffect(() => {
    console.log('Session status:', status, 'User:', session?.user?.email);
    if (status === 'authenticated' && session?.user?.email) {
      fetchUserProfile();
    }
  }, [session, status]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const profile = await response.json();
        setUserProfile({
          name: profile.name,
          role: profile.role,
          company: profile.company,
          interests: profile.interests || [],
          goals: profile.goals || []
        });
        generatePersonalizedSuggestions(profile);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const generatePersonalizedSuggestions = (profile: any) => {
    const suggestions = [];
    
    // Generate suggestions based on interests
    if (profile.interests && profile.interests.length > 0) {
      const interest = profile.interests[0];
      suggestions.push(`Show me all ${interest} sessions at the conference`);
      suggestions.push(`Find ${interest} networking opportunities`);
    }
    
    // Generate suggestions based on role
    if (profile.role) {
      suggestions.push(`What sessions are best for a ${profile.role}?`);
      suggestions.push(`Connect me with other ${profile.role}s attending`);
    }
    
    // Generate suggestions based on goals
    if (profile.goals && profile.goals.length > 0) {
      if (profile.goals.includes('Learn')) {
        suggestions.push('What are the must-attend educational sessions?');
      }
      if (profile.goals.includes('Network')) {
        suggestions.push('When are the best networking events?');
      }
      if (profile.goals.includes('Find Solutions')) {
        suggestions.push('Which vendors match my technology needs?');
      }
    }
    
    // Add personalized schedule suggestion
    if (profile.name) {
      suggestions.push(`Build my personalized Day 1 schedule`);
    }
    
    setPersonalizedSuggestions(suggestions.slice(0, 6));
  };

  // Remove the duplicate welcome message effect - we already have the initial system message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setFollowUpQuestions([]);

    try {
      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          userId: 'user-123', // In production, use actual user ID
          userProfile: userProfile,
          conversationId: conversationId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          metadata: data.metadata
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Set follow-up questions
        if (data.suggestedFollowUps) {
          setFollowUpQuestions(data.suggestedFollowUps);
        }
        
        // Store metadata for UI enhancements
        setSessionMetadata(data.metadata);
        
        // Show insights if available
        if (data.metadata && data.metadata.intent) {
          showInsights(data.metadata);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'I encountered an error. Please try rephrasing your question or check your connection.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const showInsights = (metadata: any) => {
    if (metadata.conflicts && metadata.conflicts.length > 0) {
      setMessages(prev => [...prev, {
        id: generateMessageId(),
        role: 'system',
        content: `⚠️ I detected ${metadata.conflicts.length} scheduling conflicts in your selections. I'll help you resolve them.`,
        timestamp: new Date()
      }]);
    }
  };

  const handleSampleQuestion = (question: string) => {
    setInput(question);
  };

  const handleFollowUp = async (question: string) => {
    // Set the input and directly process the message
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setFollowUpQuestions([]);

    try {
      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          userId: 'user-123',
          userProfile: userProfile,
          conversationId: conversationId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          metadata: data.metadata
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        if (data.suggestedFollowUps) {
          setFollowUpQuestions(data.suggestedFollowUps);
        }
        
        setSessionMetadata(data.metadata);
        
        if (data.metadata && data.metadata.intent) {
          showInsights(data.metadata);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'I encountered an error. Please try rephrasing your question or check your connection.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setUserProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        // Handle bullet points
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          return <li key={i} className="ml-4 mb-1">{line.substring(1).trim()}</li>;
        }
        // Handle numbered lists
        if (/^\d+\./.test(line)) {
          return <li key={i} className="ml-4 mb-1">{line}</li>;
        }
        // Handle bold text (markdown style)
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={i} className="mb-2">
              {parts.map((part, j) => 
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        }
        // Handle headers (markdown style)
        if (line.startsWith('###')) {
          return <h4 key={i} className="font-semibold mt-3 mb-1">{line.substring(3).trim()}</h4>;
        }
        if (line.startsWith('##')) {
          return <h3 key={i} className="font-bold text-lg mt-3 mb-2">{line.substring(2).trim()}</h3>;
        }
        // Handle star ratings
        if (line.includes('⭐')) {
          return <p key={i} className="mb-2 text-yellow-600 font-medium">{line}</p>;
        }
        // Regular paragraph
        return line.trim() ? <p key={i} className="mb-2">{line}</p> : null;
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-20">
      <div className="max-w-5xl mx-auto px-4">
        {/* Enhanced Header */}
        <div className="bg-white rounded-t-3xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Conference Concierge <span className="text-sm font-normal text-orange-600">(Demo)</span></h1>
                <p className="text-sm text-gray-600 mt-1">Powered by Claude 3.5 + Salesforce • PS Advisory Demo</p>
              </div>
            </div>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Profile</span>
            </button>
          </div>
          
          {/* Metadata Bar */}
          {sessionMetadata && (
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>Intent: {sessionMetadata.intent?.primary}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{sessionMetadata.relevantSessions} relevant sessions</span>
              </div>
              {sessionMetadata.conflicts > 0 && (
                <div className="flex items-center gap-1 text-orange-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>{sessionMetadata.conflicts} conflicts detected</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PS Advisory Demo Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-x border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div className="text-sm">
                <span className="font-medium text-gray-900">PS Advisory Demo:</span>
                <span className="text-gray-600 ml-2">
                  Salesforce Partner specializing in insurance technology solutions
                </span>
              </div>
            </div>
            <a 
              href="https://www.psadvisory.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <span>Learn More</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Profile Panel */}
        {showProfile && (
          <div className="bg-white border-x border-gray-200 px-6 py-4">
            <h3 className="font-semibold text-gray-900 mb-3">Your Profile</h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
                <select
                  value={userProfile.role || ''}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select your role...</option>
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={userProfile.company || ''}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Your company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      userProfile.interests.includes(interest)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Info className="w-4 h-4" />
              <span>Your profile helps me provide more relevant recommendations</span>
            </div>
          </div>
        )}

        {/* Sample Questions - Show when conversation is new */}
        {messages.length <= 2 && (
          <div className="bg-white border-x border-gray-200 px-6 py-4">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              {status === 'authenticated' && personalizedSuggestions.length > 0 
                ? `Personalized suggestions for you:` 
                : `Smart prompts to get started:`}
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {(status === 'authenticated' && personalizedSuggestions.length > 0 
                ? personalizedSuggestions 
                : SAMPLE_QUESTIONS
              ).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuestion(question)}
                  className={`text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                    status === 'authenticated' && personalizedSuggestions.length > 0
                      ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 hover:from-purple-100 hover:to-blue-100'
                      : 'bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 hover:from-blue-100 hover:to-purple-100'
                  }`}
                >
                  <ChevronRight className="w-3 h-3 inline mr-1" />
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="bg-white border-x border-gray-200 min-h-[400px] max-h-[600px] overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role !== 'user' && (
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'system' 
                      ? 'bg-purple-100' 
                      : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                    {message.role === 'system' ? (
                      <Info className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : message.role === 'system'
                      ? 'bg-purple-50 text-purple-900 border border-purple-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm">
                    {typeof message.content === 'string' 
                      ? formatContent(message.content)
                      : message.content}
                  </div>
                  {message.metadata && message.metadata.recommendations && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold mb-1">
                        📊 Found {message.metadata.recommendations} personalized recommendations
                      </p>
                    </div>
                  )}
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp && new Date(message.timestamp).toLocaleTimeString('en-US', {
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
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                    <span className="text-sm text-gray-600">Analyzing your request...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Follow-up Questions */}
        {followUpQuestions.length > 0 && (
          <div className="bg-white border-x border-gray-200 px-6 py-3">
            <p className="text-xs font-medium text-gray-600 mb-2">Suggested follow-ups:</p>
            <div className="flex flex-wrap gap-2">
              {followUpQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleFollowUp(question)}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Input Form */}
        <div className="bg-white rounded-b-3xl border border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about sessions, speakers, or get personalized recommendations..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              Powered by Claude Opus 4.1 • Context-aware recommendations
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>💡 Pro tip: Set your profile for better recommendations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}