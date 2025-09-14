'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Loader2, Calendar, Clock, MapPin, Users,
  LogIn, UserPlus, Star, AlertCircle
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import UserDashboard from '@/components/UserDashboard';
import SmartAgendaView from '@/components/agenda/SmartAgendaView';
import { SmartAgenda, ScheduleItem } from '@/lib/tools/schedule/types';

export default function SmartAgendaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [smartAgenda, setSmartAgenda] = useState<SmartAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAgenda, setGeneratingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLoading(false);
    } else if (status === 'authenticated') {
      // Try to load any existing agenda from localStorage
      const savedAgenda = localStorage.getItem('smartAgenda');
      if (savedAgenda) {
        try {
          setSmartAgenda(JSON.parse(savedAgenda));
        } catch (error) {
          console.error('Error parsing saved agenda:', error);
        }
      }
      setLoading(false);

      // Auto-generate if no agenda exists
      if (!savedAgenda) {
        generateSmartAgenda();
      }
    }
  }, [status]);

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
        setSmartAgenda(data.agenda);
        // Save to localStorage for persistence
        localStorage.setItem('smartAgenda', JSON.stringify(data.agenda));
      }
    } catch (error) {
      console.error('Error generating agenda:', error);
      setAgendaError('An error occurred while generating your agenda. Please try again.');
    } finally {
      setGeneratingAgenda(false);
    }
  };

  const handleAgendaItemRemove = (dayIndex: number, itemIndex: number) => {
    if (!smartAgenda) return;

    const updatedAgenda = { ...smartAgenda };
    updatedAgenda.days[dayIndex].schedule.splice(itemIndex, 1);
    setSmartAgenda(updatedAgenda);
    localStorage.setItem('smartAgenda', JSON.stringify(updatedAgenda));
  };

  const handleAgendaItemReplace = async (dayIndex: number, itemIndex: number, newItem: ScheduleItem) => {
    if (!smartAgenda) return;

    const updatedAgenda = { ...smartAgenda };
    updatedAgenda.days[dayIndex].schedule[itemIndex] = newItem;
    setSmartAgenda(updatedAgenda);
    localStorage.setItem('smartAgenda', JSON.stringify(updatedAgenda));
  };

  const handleRegenerateDay = async (dayIndex: number) => {
    // This would regenerate just one day
    generateSmartAgenda();
  };

  const handleExport = () => {
    if (!smartAgenda) return;

    const agendaText = smartAgenda.days.map(day => {
      const dayHeader = `Day ${day.dayNumber} - ${new Date(day.date).toLocaleDateString()}\\n`;
      const items = day.schedule.map(item => {
        const time = `${new Date(item.startTime).toLocaleTimeString()} - ${new Date(item.endTime).toLocaleTimeString()}`;
        return `${time}: ${item.title}`;
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
  };

  if (status === 'unauthenticated') {
    return (
      <>
        <Navigation />
        <UserDashboard activeTab="agenda" />

        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-gray-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In to Access Smart Agenda</h2>
            <p className="text-gray-600 mb-6">
              Create your personalized conference schedule with AI-powered recommendations
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <UserDashboard activeTab="agenda" />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Smart Agenda
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Your AI-powered personalized conference schedule
              </p>
            </div>

            {smartAgenda && (
              <button
                onClick={generateSmartAgenda}
                disabled={generatingAgenda}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  generatingAgenda
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg'
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
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your smart agenda...</p>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Unable to Generate Agenda</h3>
                <p className="text-red-700 mt-1">{agendaError}</p>
                <button
                  onClick={generateSmartAgenda}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : smartAgenda ? (
          <SmartAgendaView
            agenda={smartAgenda}
            onItemRemove={handleAgendaItemRemove}
            onItemReplace={handleAgendaItemReplace}
            onRegenerateDay={handleRegenerateDay}
            onExport={handleExport}
          />
        ) : (
          <div className="text-center py-20">
            <div className="bg-gray-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Agenda Generated Yet</h2>
            <p className="text-gray-600 mb-6">
              Click the button below to generate your personalized conference schedule
            </p>
            <button
              onClick={generateSmartAgenda}
              disabled={generatingAgenda}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Generate Smart Agenda
            </button>
          </div>
        )}
      </div>
    </>
  );
}