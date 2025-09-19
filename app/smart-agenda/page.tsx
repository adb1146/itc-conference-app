'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { invalidateCache, CACHE_KEYS } from '@/lib/cache-utils';
import {
  Sparkles, Loader2, Calendar, Clock, MapPin, Users,
  LogIn, UserPlus, Star, AlertCircle, Trash2, Save, CheckCircle, Database, CloudOff, Cloud, RefreshCw
} from 'lucide-react';
import UserDashboard from '@/components/UserDashboard';
import SmartAgendaView from '@/components/agenda/SmartAgendaView';
import AgendaInsights from '@/components/agenda/AgendaInsights';
import { SmartAgenda, ScheduleItem } from '@/lib/tools/schedule/types';

// Version for cache invalidation
const CURRENT_VERSION = 'v15-ai-review-insights';  // AI review perspective in insights

export default function SmartAgendaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [smartAgenda, setSmartAgenda] = useState<SmartAgenda & { insights?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAgenda, setGeneratingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'not-found' | 'error'>('idle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const user = session?.user;

  // Load saved agenda from database on mount
  useEffect(() => {

    const loadSavedAgenda = async () => {
      if (status === 'authenticated' && user) {
        setLoading(true);
        setLoadStatus('loading');
        try {
          const response = await fetch('/api/smart-agenda', {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.agenda) {
              console.log('✅ Successfully loaded agenda from database');
              setSmartAgenda(data.agenda);
              setLoadStatus('loaded');
            } else {
              console.log('📭 No saved agenda found in database');
              setLoadStatus('not-found');
            }
          } else if (response.status === 401) {
            console.log('🔐 Authentication required - user not signed in');
            setLoadStatus('not-found');
          } else {
            console.error('❌ Failed to load agenda from database:', response.status);
            setLoadStatus('error');
          }
        } catch (error) {
          console.error('❌ Error loading saved agenda:', error);
          setLoadStatus('error');
        } finally {
          setLoading(false);
        }
      } else if (status === 'unauthenticated') {
        setLoading(false);
      }
    };

    loadSavedAgenda();
  }, [status, user]);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache and reload the page
      invalidateCache(CACHE_KEYS.SMART_AGENDA);
      router.refresh();

      // Reload the saved agenda from database
      const loadSavedAgenda = async () => {
        if (status === 'authenticated' && user) {
          setLoadStatus('loading');
          try {
            const response = await fetch('/api/smart-agenda', {
              method: 'GET',
              cache: 'no-store',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              },
            });

            if (response.ok) {
              const data = await response.json();
              if (data.agenda) {
                console.log('✅ Successfully refreshed agenda from database');
                setSmartAgenda(data.agenda);
                setLoadStatus('loaded');
              } else {
                console.log('📭 No saved agenda found in database');
                setLoadStatus('not-found');
              }
            } else if (response.status === 401) {
              console.log('🔐 Authentication required - user not signed in');
              setLoadStatus('not-found');
            } else {
              console.error('❌ Failed to refresh agenda from database:', response.status);
              setLoadStatus('error');
            }
          } catch (error) {
            console.error('❌ Error refreshing saved agenda:', error);
            setLoadStatus('error');
          }
        }
      };

      await loadSavedAgenda();
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearAgenda = async () => {
    setSmartAgenda(null);
    setAgendaError(null);

    // Clear saved agenda from database
    if (user?.email) {
      try {
        await fetch('/api/smart-agenda', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Cleared agenda from database');
      } catch (error) {
        console.error('Error clearing agenda:', error);
      }
    }
  };


  const generateSmartAgenda = async () => {
    setGeneratingAgenda(true);
    setAgendaError(null);

    try {
      const response = await fetch('/api/tools/agenda-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: {} })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresAuth) {
          setAgendaError('Please sign in to generate your smart agenda');
        } else {
          setAgendaError(data.error || 'Failed to generate agenda');
        }
        return;
      }

      if (data.success && data.agenda) {
        console.log('New agenda generated');
        const result = data.agenda;
        setSmartAgenda(result);

        // Invalidate cache for smart agenda
        invalidateCache(CACHE_KEYS.SMART_AGENDA, user?.id);

        // Save the agenda to database
        if (user?.email) {
          setSaveStatus('saving');
          try {
            const saveResponse = await fetch('/api/smart-agenda', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                agenda: result,
                metadata: {
                  generatedAt: new Date().toISOString(),
                  version: CURRENT_VERSION,
                  insights: result.insights,
                },
                researchProfile: data.profile || null,
              }),
            });

            if (!saveResponse.ok) {
              console.error('❌ Failed to save agenda to database');
              setSaveStatus('error');
              // Show error for 3 seconds then reset
              setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
              const saveData = await saveResponse.json();
              console.log('✅ Agenda saved to database successfully:', saveData);
              setSaveStatus('saved');
              // Show success for 3 seconds then reset
              setTimeout(() => setSaveStatus('idle'), 3000);
            }
          } catch (saveError) {
            console.error('❌ Error saving agenda:', saveError);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
          }
        }
      }
    } catch (error) {
      console.error('Error generating agenda:', error);
      setAgendaError('An error occurred while generating your agenda. Please try again.');
    } finally {
      setGeneratingAgenda(false);
    }
  };

  const handleAgendaItemRemove = async (itemId: string) => {
    if (!smartAgenda) return;

    const updatedAgenda = { ...smartAgenda };
    // Find and remove the item from all days
    updatedAgenda.days.forEach(day => {
      const originalLength = day.schedule.length;
      day.schedule = day.schedule.filter(item => item.id !== itemId);

      // Update day stats if item was removed
      if (day.schedule.length < originalLength) {
        const removedItem = smartAgenda.days
          .find(d => d.dayNumber === day.dayNumber)?.schedule
          .find(item => item.id === itemId);

        if (removedItem) {
          if (removedItem.type === 'session') {
            day.stats.totalSessions--;
            if (removedItem.source === 'user-favorite') {
              day.stats.favoritesCovered--;
            } else if (removedItem.source === 'ai-suggested') {
              day.stats.aiSuggestions--;
            }
          }
        }
      }
    });

    // Update metrics
    updatedAgenda.metrics.favoritesIncluded = updatedAgenda.days.reduce(
      (sum, day) => sum + day.stats.favoritesCovered, 0
    );
    updatedAgenda.metrics.aiSuggestionsAdded = updatedAgenda.days.reduce(
      (sum, day) => sum + day.stats.aiSuggestions, 0
    );

    setSmartAgenda(updatedAgenda);

    // Update agenda in database when removing an item
    if (user?.email) {
      setSaveStatus('saving');
      try {
        const response = await fetch('/api/smart-agenda', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agenda: updatedAgenda,
            changeDescription: 'User removed a session',
          }),
        });

        if (response.ok) {
          console.log('✅ Updated agenda in database');
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          console.error('❌ Failed to update agenda in database');
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      } catch (error) {
        console.error('❌ Error updating agenda:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  const handleAgendaItemReplace = async (itemId: string, alternativeId: string) => {
    if (!smartAgenda) return;

    // This would need to fetch the alternative item and replace it
    // For now, just regenerate the agenda
    generateSmartAgenda();
  };

  const handleAgendaItemFavorite = (sessionId: string) => {
    // Optionally refresh the agenda to reflect the new favorite status
    // For now, the UI will update immediately via the SmartAgendaView component
    console.log('Session favorited:', sessionId);
  };

  const handleRegenerateDay = async (dayNumber: number) => {
    // This would regenerate just one day
    generateSmartAgenda();
  };

  const handleExport = async (format: 'ics' | 'pdf' | 'email' = 'ics') => {
    if (!smartAgenda) return;

    if (format === 'email') {
      // Prevent duplicate emails
      if (sendingEmail) return;

      // Send email with the personalized agenda
      setSendingEmail(true);
      try {
        const response = await fetch('/api/schedule/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agenda: smartAgenda })
        });

        const result = await response.json();

        if (result.success) {
          alert(`✅ ${result.message}`);
        } else {
          alert(`❌ ${result.error || 'Failed to send email'}`);
        }
      } catch (error) {
        console.error('Error sending email:', error);
        alert('❌ Failed to send schedule email');
      } finally {
        setSendingEmail(false);
      }
    } else {
      // Handle other export formats (ics, pdf) - for now just download as text
      const agendaText = smartAgenda.days.map(day => {
        const dayHeader = `Day ${day.dayNumber} - ${new Date(day.date + 'T12:00:00').toLocaleDateString()}\\n`;
        const items = day.schedule.map(item => {
          const time = `${item.time} - ${item.endTime}`;
          return `${time}: ${item.item.title}`;
        }).join('\\n');
        return dayHeader + items;
      }).join('\\n\\n');

      const blob = new Blob([agendaText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'itc-vegas-2025-agenda.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">

        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-full p-5 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
              <Sparkles className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-normal mb-3">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Access Smart Agenda</span>
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Create your personalized conference schedule with AI-powered recommendations
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">

      <UserDashboard activeTab="agenda" />

      {/* Main content */}
      {(
        <div className="bg-white/80 backdrop-blur border-b border-purple-100">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-normal flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl shadow-md">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-purple-600" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Smart Agenda</span>
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-2 sm:ml-14">
                  Your AI-powered personalized conference schedule
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Database Status Indicator */}
                {(saveStatus !== 'idle' || loadStatus === 'loaded') && (
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      saveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                      saveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                      saveStatus === 'error' ? 'bg-red-100 text-red-700' :
                      loadStatus === 'loaded' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {saveStatus === 'saving' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving to database...
                        </>
                      ) : saveStatus === 'saved' ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Saved to database
                        </>
                      ) : saveStatus === 'error' ? (
                        <>
                          <CloudOff className="w-4 h-4" />
                          Save failed
                        </>
                      ) : loadStatus === 'loaded' && smartAgenda ? (
                        <>
                          <Cloud className="w-4 h-4" />
                          Synced
                        </>
                      ) : null}
                    </div>

                    {/* Refresh Button */}
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`p-2 rounded-lg transition-all ${
                        isRefreshing
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 border border-gray-200'
                      }`}
                      title="Refresh agenda"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                )}

                {smartAgenda && (
                <div className="flex gap-3">
                <button
                  onClick={clearAgenda}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all bg-white border border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
                <button
                  onClick={generateSmartAgenda}
                  disabled={generatingAgenda}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg ${
                    generatingAgenda
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {generatingAgenda ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate Agenda
                    </>
                  )}
                </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your smart agenda...</p>
            </div>
          </div>
        ) : loadStatus === 'loading' ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Database className="w-8 h-8 animate-pulse text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your saved agenda from database...</p>
            </div>
          </div>
        ) : generatingAgenda && !smartAgenda ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Generating your personalized agenda...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          </div>
        ) : agendaError ? (
          <div className="bg-red-50/50 backdrop-blur border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-red-900">Unable to Generate Agenda</h3>
                <p className="text-red-700 mt-1">{agendaError}</p>
                <button
                  onClick={generateSmartAgenda}
                  className="mt-3 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : smartAgenda ? (
          <>
            {smartAgenda.insights && (
              <AgendaInsights insights={smartAgenda.insights} />
            )}
          <SmartAgendaView
            agenda={smartAgenda}
            onItemRemove={handleAgendaItemRemove}
            onItemReplace={handleAgendaItemReplace}
            onItemFavorite={handleAgendaItemFavorite}
            onRegenerateDay={handleRegenerateDay}
            onExport={handleExport}
          />
          </>
        ) : (
          <div className="text-center py-20 bg-white/50 backdrop-blur rounded-2xl border border-purple-100 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-full p-5 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
              <Calendar className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-normal mb-3">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Your Agenda is Empty</span>
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Click the button below to generate your personalized conference schedule
            </p>
            <button
              onClick={generateSmartAgenda}
              disabled={generatingAgenda}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Generate Smart Agenda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}