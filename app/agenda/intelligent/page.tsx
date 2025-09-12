'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, Search, Filter, Heart, User, Tag, 
  MessageCircle, Brain, Sparkles, TrendingUp, AlertCircle,
  ChevronRight, X, Zap, Target, Users, BarChart3, 
  ThumbsUp, ThumbsDown, RefreshCw, Wand2, Info
} from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Speaker {
  id?: string;
  name: string;
  title?: string;
  role?: string;
  company?: string;
  bio?: string;
  imageUrl?: string;
}

interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  track?: string;
  level?: string;
  tags: string[];
  speakers: { speaker: Speaker }[];
  // AI-enhanced fields
  relevanceScore?: number;
  conflictsWith?: string[];
  recommendedFor?: string[];
  learningPath?: string;
  networkingScore?: number;
}

interface AIInsight {
  type: 'recommendation' | 'conflict' | 'tip' | 'path';
  message: string;
  sessionIds?: string[];
}

export default function IntelligentAgendaPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('2025-10-15');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // AI Features
  const [aiMode, setAiMode] = useState('smart'); // 'off', 'smart', 'full'
  const [userProfile, setUserProfile] = useState({
    role: '',
    interests: [] as string[],
    experience: 'intermediate'
  });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [personalizedSessions, setPersonalizedSessions] = useState<Session[]>([]);
  const [conflicts, setConflicts] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    fetchSessions();
    loadUserProfile();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, selectedDay, searchQuery, selectedTrack, aiMode]);

  useEffect(() => {
    if (aiMode !== 'off') {
      generateAIInsights();
      detectConflicts();
    } else {
      setAiInsights([]);
    }
  }, [filteredSessions, aiMode, favorites, userProfile, selectedDay]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/agenda/sessions');
      const data = await response.json();
      const enhancedSessions = await enhanceSessionsWithAI(data.sessions || []);
      setSessions(enhancedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = () => {
    // Load from localStorage or API
    try {
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        setUserProfile(JSON.parse(saved));
      }
    } catch (error) {
      console.log('No saved profile found');
    }
  };

  const saveUserProfile = (profile: typeof userProfile) => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
      setUserProfile(profile);
      // Regenerate insights when profile changes
      if (aiMode !== 'off') {
        generateAIInsights();
      }
    } catch (error) {
      console.error('Failed to save profile');
    }
  };

  const enhanceSessionsWithAI = async (sessions: Session[]) => {
    // Calculate relevance scores and add AI metadata
    return sessions.map(session => ({
      ...session,
      relevanceScore: calculateRelevance(session),
      recommendedFor: getRecommendedAudience(session),
      networkingScore: calculateNetworkingScore(session),
      learningPath: identifyLearningPath(session)
    }));
  };

  const calculateRelevance = (session: Session): number => {
    let score = 0.5; // Base score
    
    // Increase score based on user interests
    userProfile.interests.forEach(interest => {
      if (session.title.toLowerCase().includes(interest.toLowerCase()) ||
          session.description?.toLowerCase().includes(interest.toLowerCase())) {
        score += 0.2;
      }
    });
    
    // Track relevance
    if (session.track && userProfile.interests.includes(session.track)) {
      score += 0.15;
    }
    
    // Speaker relevance
    if (session.speakers?.length > 0) {
      score += 0.1;
    }
    
    return Math.min(score, 1);
  };

  const getRecommendedAudience = (session: Session): string[] => {
    const audiences = [];
    const title = session.title.toLowerCase();
    const desc = session.description?.toLowerCase() || '';
    
    if (title.includes('executive') || title.includes('leadership')) {
      audiences.push('Executives');
    }
    if (title.includes('technical') || title.includes('api') || title.includes('code')) {
      audiences.push('Developers');
    }
    if (title.includes('product') || title.includes('design')) {
      audiences.push('Product Managers');
    }
    if (title.includes('sales') || title.includes('distribution')) {
      audiences.push('Sales Teams');
    }
    
    return audiences;
  };

  const calculateNetworkingScore = (session: Session): number => {
    let score = 0;
    
    if (session.title.toLowerCase().includes('networking') || 
        session.title.toLowerCase().includes('reception') ||
        session.title.toLowerCase().includes('lunch') ||
        session.title.toLowerCase().includes('breakfast')) {
      score = 1;
    } else if (session.title.toLowerCase().includes('panel') || 
               session.title.toLowerCase().includes('discussion')) {
      score = 0.7;
    } else if (session.title.toLowerCase().includes('workshop')) {
      score = 0.6;
    } else {
      score = 0.3;
    }
    
    return score;
  };

  const identifyLearningPath = (session: Session): string => {
    if (session.level === 'Beginner') return 'Foundation';
    if (session.level === 'Advanced') return 'Expert';
    if (session.title.toLowerCase().includes('intro')) return 'Foundation';
    if (session.title.toLowerCase().includes('advanced')) return 'Expert';
    return 'Core';
  };

  const detectConflicts = () => {
    const newConflicts = new Map<string, string[]>();
    const favoritedSessions = sessions.filter(s => favorites.has(s.id));
    
    favoritedSessions.forEach(session1 => {
      const conflictingSessions = favoritedSessions.filter(session2 => {
        if (session1.id === session2.id) return false;
        const start1 = new Date(session1.startTime).getTime();
        const end1 = new Date(session1.endTime).getTime();
        const start2 = new Date(session2.startTime).getTime();
        const end2 = new Date(session2.endTime).getTime();
        
        return (start1 < end2 && end1 > start2);
      });
      
      if (conflictingSessions.length > 0) {
        newConflicts.set(session1.id, conflictingSessions.map(s => s.id));
      }
    });
    
    setConflicts(newConflicts);
  };

  const generateAIInsights = async () => {
    const insights: AIInsight[] = [];
    
    // Check if we have sessions to analyze
    if (!filteredSessions || filteredSessions.length === 0) {
      insights.push({
        type: 'tip',
        message: 'No sessions found. Try switching days or adjusting filters.'
      });
      setAiInsights(insights);
      return;
    }
    
    // Show session count for the day
    const dayLabel = new Date(selectedDay).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    insights.push({
      type: 'tip',
      message: `📅 ${filteredSessions.length} sessions on ${dayLabel}`
    });
    
    // Find networking opportunities
    const networkingSessions = filteredSessions.filter(s => {
      const title = s.title.toLowerCase();
      return title.includes('networking') || title.includes('breakfast') || 
             title.includes('lunch') || title.includes('reception') || 
             title.includes('happy hour') || title.includes('party');
    });
    
    if (networkingSessions.length > 0) {
      insights.push({
        type: 'recommendation',
        message: `🤝 Networking: ${networkingSessions[0].title}`,
        sessionIds: [networkingSessions[0].id]
      });
    }
    
    // Smart Mode and Full AI Mode insights
    if (aiMode === 'smart' || aiMode === 'full') {
      // Keynote recommendations
      const keynotes = filteredSessions.filter(s => 
        s.title.toLowerCase().includes('keynote') || 
        s.title.toLowerCase().includes('opening') ||
        s.title.toLowerCase().includes('closing') ||
        s.track === 'Main Stage'
      );
      if (keynotes.length > 0) {
        insights.push({
          type: 'recommendation',
          message: `⭐ Must-see: ${keynotes[0].title}`,
          sessionIds: [keynotes[0].id]
        });
      }
      
      // Panel discussions
      const panels = filteredSessions.filter(s => 
        s.speakers && s.speakers.length >= 2
      );
      if (panels.length > 0) {
        const bestPanel = panels.sort((a, b) => b.speakers.length - a.speakers.length)[0];
        insights.push({
          type: 'recommendation',
          message: `👥 Panel (${bestPanel.speakers.length} speakers): ${bestPanel.title}`,
          sessionIds: [bestPanel.id]
        });
      }
    }
    
    
    // Track-based recommendations
    if (selectedTrack && selectedTrack !== 'all') {
      const trackSessions = filteredSessions.filter(s => s.track === selectedTrack);
      if (trackSessions.length > 0) {
        insights.push({
          type: 'recommendation',
          message: `Found ${trackSessions.length} sessions in ${selectedTrack} track`,
          sessionIds: trackSessions.slice(0, 3).map(s => s.id)
        });
      }
    }
    
    // Morning vs afternoon distribution
    const morningSessions = filteredSessions.filter(s => {
      const hour = new Date(s.startTime).getHours();
      return hour < 12;
    });
    const afternoonSessions = filteredSessions.filter(s => {
      const hour = new Date(s.startTime).getHours();
      return hour >= 12;
    });
    
    if (morningSessions.length > 0 && afternoonSessions.length > 0) {
      insights.push({
        type: 'tip',
        message: `${morningSessions.length} morning sessions, ${afternoonSessions.length} afternoon sessions today`
      });
    }
    
    // Full AI Mode - Advanced insights
    if (aiMode === 'full') {
      // Profile-based recommendations
      if (userProfile.interests && userProfile.interests.length > 0) {
        const relevantSessions = filteredSessions.filter(s => {
          const content = `${s.title} ${s.description || ''} ${s.tags?.join(' ') || ''}`.toLowerCase();
          return userProfile.interests.some(interest => 
            content.includes(interest.toLowerCase())
          );
        });
        
        if (relevantSessions.length > 0) {
          insights.push({
            type: 'recommendation',
            message: `💡 Matches your interests: ${relevantSessions.length} sessions`,
            sessionIds: relevantSessions.slice(0, 3).map(s => s.id)
          });
        }
      } else {
        insights.push({
          type: 'tip',
          message: '💡 Set your interests above for personalized recommendations'
        });
      }
      
      // VIP Speaker detection
      const vipSessions = filteredSessions.filter(s => {
        return s.speakers?.some(sp => {
          const role = sp.speaker.role?.toLowerCase() || '';
          return role.includes('ceo') || 
                 role.includes('founder') || 
                 role.includes('president') ||
                 role.includes('chief');
        });
      });
      
      if (vipSessions.length > 0) {
        const vipSpeaker = vipSessions[0].speakers.find(sp => {
          const role = sp.speaker.role?.toLowerCase() || '';
          return role.includes('ceo') || role.includes('founder');
        })?.speaker;
        
        if (vipSpeaker) {
          insights.push({
            type: 'recommendation',
            message: `🎯 VIP: ${vipSpeaker.name} (${vipSpeaker.company})`,
            sessionIds: [vipSessions[0].id]
          });
        }
      }
    }
    
    // Conflict detection for favorites
    if (favorites.size > 0 && conflicts.size > 0) {
      insights.push({
        type: 'conflict',
        message: `⚠️ Schedule conflict: ${conflicts.size} overlapping favorites`
      });
    }
    
    // Ensure we always have insights
    if (insights.length === 1) {
      // Add a helpful tip based on mode
      if (aiMode === 'smart') {
        insights.push({
          type: 'tip',
          message: '💡 Switch to Full AI mode for more personalized recommendations'
        });
      } else if (aiMode === 'full') {
        insights.push({
          type: 'tip',
          message: '⭐ Add sessions to favorites to track your schedule'
        });
      }
    }
    
    // Limit to prevent overwhelming
    const finalInsights = insights.slice(0, 6);
    setAiInsights(finalInsights);
  };

  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) return;
    
    setIsAIThinking(true);
    
    try {
      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiSearchQuery,
          userProfile: userProfile,
          context: 'agenda_search'
        })
      });
      
      const data = await response.json();
      
      // Parse AI response to filter sessions
      const relevantSessions = sessions.filter(session => {
        // AI logic to match sessions based on natural language query
        return data.response.toLowerCase().includes(session.title.toLowerCase());
      });
      
      setFilteredSessions(relevantSessions);
      
      // Add insight about the search
      setAiInsights([{
        type: 'recommendation',
        message: `Found ${relevantSessions.length} sessions matching "${aiSearchQuery}"`,
        sessionIds: relevantSessions.map(s => s.id)
      }, ...aiInsights]);
      
    } catch (error) {
      console.error('AI search error:', error);
    } finally {
      setIsAIThinking(false);
      setAiSearchQuery('');
    }
  };

  const filterSessions = () => {
    let filtered = sessions.filter(session => {
      const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
      return sessionDate === selectedDay;
    });

    if (searchQuery) {
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.speakers?.some(s => 
          s.speaker.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    if (selectedTrack !== 'all') {
      filtered = filtered.filter(session => session.track === selectedTrack);
    }

    // Sort by relevance if AI mode is on
    if (aiMode !== 'off') {
      filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    setFilteredSessions(filtered);
  };

  const toggleFavorite = (sessionId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(sessionId)) {
      newFavorites.delete(sessionId);
    } else {
      newFavorites.add(sessionId);
    }
    setFavorites(newFavorites);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTracks = () => {
    const tracks = new Set(sessions.map(s => s.track).filter(Boolean));
    return Array.from(tracks).sort();
  };

  const getRelevanceColor = (score: number = 0) => {
    if (score > 0.7) return 'bg-green-100 border-green-300';
    if (score > 0.5) return 'bg-blue-100 border-blue-300';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Spacer for fixed navigation */}
      <div className="h-16"></div>
      
      {/* Intelligent Header */}
      <div className="sticky top-16 z-30 bg-white shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Conference Agenda
                {aiMode !== 'off' && (
                  <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    <Brain className="w-3 h-3 mr-1" />
                    AI-Enhanced
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600 mt-1">October 15-17, 2025 • Las Vegas</p>
            </div>
            
            {/* AI Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">AI Mode:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setAiMode('off')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    aiMode === 'off' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  Off
                </button>
                <button
                  onClick={() => setAiMode('smart')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    aiMode === 'smart' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  Smart
                </button>
                <button
                  onClick={() => setAiMode('full')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    aiMode === 'full' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  Full AI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
          {[
            { date: '2025-10-15', label: 'Day 1', subLabel: 'Oct 15' },
            { date: '2025-10-16', label: 'Day 2', subLabel: 'Oct 16' },
            { date: '2025-10-17', label: 'Day 3', subLabel: 'Oct 17' },
          ].map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day.date)}
              className={`flex-1 py-2 px-3 rounded-lg text-center transition-colors ${
                selectedDay === day.date
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <div className="font-semibold text-sm">{day.label}</div>
              <div className="text-xs opacity-75">{day.subLabel}</div>
            </button>
          ))}
        </div>

        {/* Smart Search Bar */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex gap-2">
            {aiMode === 'full' ? (
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={aiSearchQuery}
                    onChange={(e) => setAiSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                    placeholder="Ask AI: 'Find AI sessions in the morning' or 'What should a CTO attend?'"
                    className="w-full pl-10 pr-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <Wand2 className="absolute left-3 top-2.5 h-5 w-5 text-purple-500" />
                </div>
                <button
                  onClick={handleAISearch}
                  disabled={isAIThinking}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isAIThinking ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions, speakers, or topics..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            )}
            
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Tracks</option>
              {getTracks().map(track => (
                <option key={track} value={track}>{track}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* AI Insights Panel */}
        {aiMode !== 'off' && showAIPanel && (
          <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto" style={{ height: 'calc(100vh - 16rem)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI Insights
              </h3>
              <button
                onClick={() => setShowAIPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* User Profile Quick Edit */}
            {aiMode === 'full' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">Your Profile</p>
                <div className="space-y-2">
                  <select
                    value={userProfile.role}
                    onChange={(e) => {
                      const newProfile = { ...userProfile, role: e.target.value };
                      setUserProfile(newProfile);
                      saveUserProfile(newProfile);
                    }}
                    className="w-full text-xs px-2 py-1 border border-gray-200 rounded"
                  >
                    <option value="">Select Role...</option>
                    <option value="executive">Executive</option>
                    <option value="developer">Developer</option>
                    <option value="product">Product Manager</option>
                    <option value="sales">Sales/BD</option>
                  </select>
                  <div className="flex flex-wrap gap-1">
                    {['AI', 'Claims', 'Cyber', 'Data'].map(interest => (
                      <button
                        key={interest}
                        onClick={() => {
                          const interests = userProfile.interests.includes(interest)
                            ? userProfile.interests.filter(i => i !== interest)
                            : [...userProfile.interests, interest];
                          const newProfile = { ...userProfile, interests };
                          saveUserProfile(newProfile);
                        }}
                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          userProfile.interests.includes(interest)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Insights List */}
            <div className="space-y-3">
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-sm ${
                    insight.type === 'conflict' ? 'bg-red-50 border border-red-200' :
                    insight.type === 'recommendation' ? 'bg-green-50 border border-green-200' :
                    insight.type === 'tip' ? 'bg-blue-50 border border-blue-200' :
                    'bg-purple-50 border border-purple-200'
                  }`}
                >
                  <p className="text-gray-800">{insight.message}</p>
                  {insight.sessionIds && insight.sessionIds.length > 0 && (
                    <button 
                      onClick={() => {
                        // Highlight the recommended sessions
                        if (insight.sessionIds && insight.sessionIds.length > 0) {
                          const firstSessionId = insight.sessionIds[0];
                          const sessionElement = document.getElementById(`session-${firstSessionId}`);
                          if (sessionElement) {
                            sessionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            sessionElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                            setTimeout(() => {
                              sessionElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                            }, 3000);
                          }
                        }
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View Sessions
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              
              {aiInsights.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">AI insights will appear here</p>
                  <p className="text-xs mt-1">Set your profile for personalized recommendations</p>
                </div>
              )}
            </div>
            
            {/* Quick Stats */}
            {aiMode === 'full' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-3">Session Stats</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-lg font-bold text-gray-900">{filteredSessions.length}</div>
                    <div className="text-xs text-gray-600">Total Sessions</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-lg font-bold text-purple-600">
                      {filteredSessions.filter(s => (s.relevanceScore || 0) > 0.7).length}
                    </div>
                    <div className="text-xs text-gray-600">Recommended</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-lg font-bold text-blue-600">{favorites.size}</div>
                    <div className="text-xs text-gray-600">Favorited</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <div className="text-lg font-bold text-red-600">{conflicts.size}</div>
                    <div className="text-xs text-gray-600">Conflicts</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 px-4 py-4">
          {/* AI Toggle Button if Panel is Hidden */}
          {aiMode !== 'off' && !showAIPanel && (
            <button
              onClick={() => setShowAIPanel(true)}
              className="fixed left-4 top-32 z-20 px-3 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              <span className="text-sm">Show AI</span>
            </button>
          )}
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Loading sessions...
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No sessions found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const hasConflict = conflicts.has(session.id);
                const relevanceScore = session.relevanceScore || 0;
                
                return (
                  <div
                    key={session.id}
                    id={`session-${session.id}`}
                    className={`bg-white rounded-lg shadow-sm border-2 p-4 transition-all hover:shadow-md ${
                      aiMode !== 'off' ? getRelevanceColor(relevanceScore) : 'border-gray-200'
                    } ${hasConflict ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {/* AI Relevance Indicator */}
                    {aiMode !== 'off' && relevanceScore > 0.5 && (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {relevanceScore > 0.7 && (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              <Target className="w-3 h-3 mr-1" />
                              Highly Recommended
                            </span>
                          )}
                          {session.networkingScore && session.networkingScore > 0.7 && (
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              <Users className="w-3 h-3 mr-1" />
                              Networking
                            </span>
                          )}
                          {session.learningPath && (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {session.learningPath}
                            </span>
                          )}
                        </div>
                        {aiMode === 'full' && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <BarChart3 className="w-3 h-3" />
                            {Math.round(relevanceScore * 100)}% match
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Conflict Warning */}
                    {hasConflict && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Conflicts with another favorited session
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {session.title}
                      </h3>
                      <button
                        onClick={() => toggleFavorite(session.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          favorites.has(session.id)
                            ? 'text-red-500 bg-red-50'
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${favorites.has(session.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {session.description && (
                      <p className="text-sm text-gray-600 mb-3">{session.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{session.location}</span>
                      </div>
                      {session.track && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          <span>{session.track}</span>
                        </div>
                      )}
                      {session.level && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {session.level}
                        </span>
                      )}
                    </div>

                    {/* Speakers */}
                    {session.speakers && session.speakers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Speakers</p>
                        <div className="flex flex-wrap gap-2">
                          {session.speakers.map((s, idx) => 
                            s.speaker.id ? (
                              <Link
                                key={idx}
                                href={`/speakers/${s.speaker.id}`}
                                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                              >
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {s.speaker.name?.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                  {s.speaker.name}
                                </div>
                                {s.speaker.company && (
                                  <div className="text-xs text-gray-600">
                                    {s.speaker.role} @ {s.speaker.company}
                                  </div>
                                )}
                              </div>
                            </Link>
                          ) : (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                            >
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {s.speaker.name?.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {s.speaker.name}
                                </div>
                                {s.speaker.company && (
                                  <div className="text-xs text-gray-600">
                                    {s.speaker.role} @ {s.speaker.company}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* AI Quick Actions */}
                    {aiMode === 'full' && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex gap-2">
                          <button className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            Relevant
                          </button>
                          <button className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1">
                            <ThumbsDown className="w-3 h-3" />
                            Not for me
                          </button>
                        </div>
                        <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          Ask AI about this
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating AI Assistant Button */}
      {aiMode !== 'off' && (
        <Link 
          href="/chat/intelligent"
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all z-40 flex items-center justify-center group"
        >
          <Brain className="h-6 w-6" />
          <span className="absolute right-full mr-2 bg-gray-900 text-white text-sm rounded-lg px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Ask AI Assistant
          </span>
        </Link>
      )}

      <Footer />
    </div>
  );
}