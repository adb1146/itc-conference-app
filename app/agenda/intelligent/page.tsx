'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar, Clock, MapPin, Search, Filter, Star, User, Tag,
  MessageCircle, Brain, Sparkles, TrendingUp, AlertCircle,
  ChevronRight, X, Zap, Target, Users, BarChart3,
  ThumbsUp, ThumbsDown, RefreshCw, Wand2, Info
} from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { PSAdvisoryCTA } from '@/components/ps-advisory-cta';

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

function IntelligentAgendaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('2025-10-15');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // AI Features - Always use Full AI mode
  const aiMode = 'full'; // Always enabled
  const [userProfile, setUserProfile] = useState({
    role: '',
    interests: [] as string[],
    experience: 'intermediate'
  });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [lastAiSearch, setLastAiSearch] = useState(''); // Track last search for persistence
  const [isAiSearchActive, setIsAiSearchActive] = useState(false); // Track if AI search is active
  const [allAiSearchResults, setAllAiSearchResults] = useState<Session[]>([]); // Store all AI results
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [personalizedSessions, setPersonalizedSessions] = useState<Session[]>([]);
  const [conflicts, setConflicts] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    fetchSessions();
    loadUserProfile();
  }, []);

  // Initialize from URL parameters
  useEffect(() => {
    const trackParam = searchParams.get('track');
    const dayParam = searchParams.get('day');

    if (trackParam && trackParam !== selectedTrack) {
      setSelectedTrack(trackParam);
    }

    // Handle day parameter (convert from day number to date)
    if (dayParam) {
      const dayMap = {
        '1': '2025-10-15',
        '2': '2025-10-16',
        '3': '2025-10-17'
      };
      const targetDate = dayMap[dayParam as keyof typeof dayMap];
      if (targetDate && targetDate !== selectedDay) {
        setSelectedDay(targetDate);
      }
    }
  }, [searchParams, selectedTrack, selectedDay]);

  useEffect(() => {
    // Only filter if not using AI search
    if (!isAiSearchActive) {
      filterSessions();
    }
  }, [sessions, selectedDay, searchQuery, selectedTrack, isAiSearchActive]);

  useEffect(() => {
    generateAIInsights();
    detectConflicts();
  }, [filteredSessions, favorites, userProfile, selectedDay]);

  // Re-filter AI search results when day changes
  useEffect(() => {
    if (isAiSearchActive && allAiSearchResults.length > 0) {
      const dayFilteredSessions = allAiSearchResults.filter(session => {
        const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
        return sessionDate === selectedDay;
      });
      setFilteredSessions(dayFilteredSessions);

      // Update insights for the new day
      const day1Count = allAiSearchResults.filter(s =>
        new Date(s.startTime).toISOString().split('T')[0] === '2025-10-15'
      ).length;
      const day2Count = allAiSearchResults.filter(s =>
        new Date(s.startTime).toISOString().split('T')[0] === '2025-10-16'
      ).length;
      const day3Count = allAiSearchResults.filter(s =>
        new Date(s.startTime).toISOString().split('T')[0] === '2025-10-17'
      ).length;

      setAiInsights([{
        type: 'recommendation',
        message: `🔍 Showing ${dayFilteredSessions.length} of ${allAiSearchResults.length} "${lastAiSearch}" results on ${new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        sessionIds: dayFilteredSessions.slice(0, 3).filter(s => s && s.id).map(s => s.id)
      }, {
        type: 'tip',
        message: `📊 Distribution: Day 1 (${day1Count}), Day 2 (${day2Count}), Day 3 (${day3Count})`,
        sessionIds: []
      }]);
    }
  }, [selectedDay, isAiSearchActive, allAiSearchResults, lastAiSearch]);

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
      generateAIInsights();
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
    
    // AI insights are always enabled
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
    
    
    // Track-based recommendations
    if (selectedTrack && selectedTrack !== 'all') {
      const trackSessions = filteredSessions.filter(s => s.track === selectedTrack);
      if (trackSessions.length > 0) {
        insights.push({
          type: 'recommendation',
          message: `Found ${trackSessions.length} sessions in ${selectedTrack} track`,
          sessionIds: trackSessions.slice(0, 3).filter(s => s && s.id).map(s => s.id)
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
    
    // Advanced AI insights
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
          sessionIds: relevantSessions.slice(0, 3).filter(s => s && s.id).map(s => s.id)
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
    
    // Conflict detection for favorites
    if (favorites.size > 0 && conflicts.size > 0) {
      insights.push({
        type: 'conflict',
        message: `⚠️ Schedule conflict: ${conflicts.size} overlapping favorites`
      });
    }
    
    // Ensure we always have insights
    if (insights.length === 1) {
      insights.push({
        type: 'tip',
        message: '⭐ Add sessions to favorites to track your schedule'
      });
    }
    
    // Limit to prevent overwhelming
    const finalInsights = insights.slice(0, 6);
    setAiInsights(finalInsights);
  };

  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) return;

    setIsAIThinking(true);
    setIsAiSearchActive(true);
    setLastAiSearch(aiSearchQuery); // Store the search query

    try {
      // First, try the intelligent chat endpoint which has better semantic search
      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiSearchQuery,
          userProfile: userProfile,
          context: 'agenda_search',
          includeAllDays: true // Request sessions from all days
        })
      });

      const data = await response.json();

      // The intelligent endpoint returns relevant sessions in its response
      if (data.sessions && Array.isArray(data.sessions)) {
        // Store ALL AI-found sessions for filtering by day
        const allAiSessions = data.sessions;
        setAllAiSearchResults(allAiSessions); // Store for re-filtering when day changes

        // Filter to show only sessions for the selected day
        const dayFilteredSessions = allAiSessions.filter((session: Session) => {
          const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
          return sessionDate === selectedDay;
        });

        setFilteredSessions(dayFilteredSessions);

        // Count sessions for each day to give better feedback
        const day1Count = allAiSessions.filter((s: Session) =>
          new Date(s.startTime).toISOString().split('T')[0] === '2025-10-15'
        ).length;
        const day2Count = allAiSessions.filter((s: Session) =>
          new Date(s.startTime).toISOString().split('T')[0] === '2025-10-16'
        ).length;
        const day3Count = allAiSessions.filter((s: Session) =>
          new Date(s.startTime).toISOString().split('T')[0] === '2025-10-17'
        ).length;

        // Add comprehensive insight about the search
        const insights = [{
          type: 'recommendation' as const,
          message: `🔍 AI found ${allAiSessions.length} total relevant sessions for "${aiSearchQuery}"`,
          sessionIds: dayFilteredSessions.slice(0, 3).filter((s: Session) => s && s.id).map((s: Session) => s.id)
        }];

        if (dayFilteredSessions.length > 0) {
          insights.push({
            type: 'recommendation' as const,
            message: `📅 Showing ${dayFilteredSessions.length} on ${new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
            sessionIds: dayFilteredSessions.slice(0, 3).filter((s: Session) => s && s.id).map((s: Session) => s.id)
          });
        }

        insights.push({
          type: 'recommendation' as const,
          message: `📊 Distribution: Day 1 (${day1Count}), Day 2 (${day2Count}), Day 3 (${day3Count})`,
          sessionIds: []
        });

        setAiInsights([...insights, ...aiInsights.slice(0, 2)]); // Keep some old insights
      } else if (data.response) {
        // If we got a text response, extract session recommendations from it
        const relevantSessions = sessions.filter(session => {
          const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
          if (sessionDate !== selectedDay) return false;

          const searchLower = aiSearchQuery.toLowerCase();
          const sessionText = `${session.title} ${session.description || ''} ${session.tags?.join(' ') || ''}`.toLowerCase();

          // More comprehensive matching for underwriters
          const underwriterKeywords = ['underwriting', 'risk', 'assessment', 'pricing', 'claims', 'actuarial', 'data', 'analytics', 'automation', 'ai', 'machine learning', 'insurtech', 'policy', 'commercial', 'specialty'];

          if (searchLower.includes('underwriter')) {
            return underwriterKeywords.some(keyword => sessionText.includes(keyword));
          }

          return sessionText.includes(searchLower);
        });

        setFilteredSessions(relevantSessions);

        setAiInsights([{
          type: 'recommendation' as const,
          message: `🔍 Found ${relevantSessions.length} sessions for "${aiSearchQuery}" on ${new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
          sessionIds: relevantSessions.slice(0, 5).filter(s => s && s.id).map(s => s.id)
        }, ...aiInsights.slice(0, 4)]);
      }

    } catch (error) {
      console.error('AI search error:', error);

      // Enhanced fallback search with better keyword matching
      const relevantSessions = sessions.filter(session => {
        const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
        if (sessionDate !== selectedDay) return false;

        const searchLower = aiSearchQuery.toLowerCase();
        const sessionText = `${session.title} ${session.description || ''} ${session.tags?.join(' ') || ''}`.toLowerCase();

        // Special handling for role-based searches
        if (searchLower.includes('underwriter')) {
          const underwriterKeywords = ['underwriting', 'risk', 'assessment', 'pricing', 'claims', 'actuarial', 'data', 'analytics', 'automation'];
          return underwriterKeywords.some(keyword => sessionText.includes(keyword));
        }

        return sessionText.includes(searchLower);
      });

      setFilteredSessions(relevantSessions);

      setAiInsights([{
        type: 'tip' as const,
        message: `⚠️ Using enhanced keyword search for "${aiSearchQuery}" - found ${relevantSessions.length} sessions`,
      }, ...aiInsights.slice(0, 4)]);
    } finally {
      setIsAIThinking(false);
      // Don't clear the search query to maintain persistence
    }
  };

  const handleAskAIAboutSession = (session: Session) => {
    // Navigate to chat with session context
    const sessionInfo = `I'd like to know more about the session "${session.title}" scheduled from ${new Date(session.startTime).toLocaleTimeString()} to ${new Date(session.endTime).toLocaleTimeString()} at ${session.location}. ${session.description}`;
    const encodedMessage = encodeURIComponent(sessionInfo);
    router.push(`/chat?message=${encodedMessage}`);
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

    // Sort by relevance (AI always enabled)
    filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    setFilteredSessions(filtered);
  };


  // Clear AI search
  const clearAISearch = () => {
    setAiSearchQuery('');
    setLastAiSearch('');
    setIsAiSearchActive(false);
    setAllAiSearchResults([]); // Clear stored AI results
    filterSessions(); // Revert to normal filtering
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

      {/* PS Advisory CTA - Inline variant for agenda page */}
      <div className="max-w-7xl mx-auto px-4 py-2">
        <PSAdvisoryCTA variant="inline" />
      </div>

      {/* Intelligent Header */}
      <div className="sticky top-16 z-30 bg-white shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Conference Agenda
                <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  <Brain className="w-3 h-3 mr-1" />
                  AI-Enhanced
                </span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">October 15-17, 2025 • Las Vegas</p>
            </div>
            
            {/* AI Status - Always Full AI */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow-sm">
                <Brain className="w-4 h-4" />
                <span className="text-xs font-medium">AI Enhanced</span>
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
              onClick={() => {
                setSelectedDay(day.date);
                // When AI search is active, the useEffect will handle re-filtering
                // based on the day change
              }}
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
          {/* Show active search indicator */}
          {isAiSearchActive && lastAiSearch && (
            <div className="mb-2 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <Sparkles className="w-4 h-4" />
                <span>AI Search: "{lastAiSearch}"</span>
              </div>
              <button
                onClick={clearAISearch}
                className="text-purple-600 hover:text-purple-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
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
        {showAIPanel && (
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
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 px-4 py-4">
          {/* AI Toggle Button - Vertical tab attached to left side */}
          {!showAIPanel && (
            <button
              onClick={() => {
                setShowAIPanel(true);
              }}
              className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-purple-600 text-white rounded-r-lg shadow-lg hover:bg-purple-700 transition-all hover:translate-x-1 writing-mode-vertical-lr"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                padding: '12px 8px'
              }}
              title="Show AI Insights"
            >
              <div className="flex items-center gap-2" style={{ writingMode: 'vertical-rl' }}>
                <Brain className="w-5 h-5 rotate-90" />
                <span className="text-sm font-medium">AI Insights</span>
              </div>
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
                      getRelevanceColor(relevanceScore)
                    } ${hasConflict ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {/* AI Relevance Indicator */}
                    {relevanceScore > 0.5 && (
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
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <BarChart3 className="w-3 h-3" />
                          {Math.round(relevanceScore * 100)}% match
                        </div>
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
                      <Link
                        href={`/agenda/session/${session.id}`}
                        className="text-lg font-semibold text-gray-900 flex-1 hover:text-purple-600 transition-colors cursor-pointer"
                      >
                        {session.title}
                      </Link>
                      <button
                        onClick={() => toggleFavorite(session.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          favorites.has(session.id)
                            ? 'text-yellow-500 bg-yellow-50'
                            : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                        }`}
                        title={favorites.has(session.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`h-5 w-5 ${favorites.has(session.id) ? 'fill-current' : ''}`} />
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
                      <button
                        onClick={() => handleAskAIAboutSession(session)}
                        className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Ask AI about this
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

export default function IntelligentAgendaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agenda...</p>
        </div>
      </div>
    }>
      <IntelligentAgendaContent />
    </Suspense>
  );
}