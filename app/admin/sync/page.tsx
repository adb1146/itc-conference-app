'use client';

import { useState } from 'react';
import { Loader2, Download, CheckCircle, AlertCircle, Zap, Globe } from 'lucide-react';

export default function AdminSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [method, setMethod] = useState<'firecrawl' | 'webfetch'>('firecrawl');

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setResult(null);

    try {
      const endpoint = method === 'firecrawl' 
        ? '/api/agenda/firecrawl-extract'
        : '/api/agenda/enhanced-sync';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda',
          pageNumbers: [1, 2, 3]
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError('Failed to sync agenda data');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin: Sync Conference Agenda</h1>

        {/* Method Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Extraction Method</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMethod('firecrawl')}
              className={`p-4 rounded-lg border-2 transition-all ${
                method === 'firecrawl'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Zap className="w-6 h-6 mb-2 text-blue-600" />
              <h3 className="font-semibold">Firecrawl API</h3>
              <p className="text-sm text-gray-600 mt-1">
                Structured extraction with schema validation
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Requires API key from firecrawl.dev
              </p>
            </button>

            <button
              onClick={() => setMethod('webfetch')}
              className={`p-4 rounded-lg border-2 transition-all ${
                method === 'webfetch'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Globe className="w-6 h-6 mb-2 text-purple-600" />
              <h3 className="font-semibold">Anthropic WebFetch</h3>
              <p className="text-sm text-gray-600 mt-1">
                AI-powered extraction with Claude Opus
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Uses your Anthropic API key
              </p>
            </button>
          </div>
        </div>

        {/* Sync Button */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sync ITC Vegas 2025 Agenda</h2>
          <p className="text-gray-600 mb-4">
            This will extract all sessions and speakers from the official ITC Vegas website.
          </p>
          
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {syncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting data...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Start Sync with {method === 'firecrawl' ? 'Firecrawl' : 'WebFetch'}
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              {error.includes('API key') && method === 'firecrawl' && (
                <div className="mt-2 text-xs text-red-700">
                  <p>To get a Firecrawl API key:</p>
                  <ol className="list-decimal ml-4 mt-1">
                    <li>Go to <a href="https://www.firecrawl.dev/" target="_blank" className="underline">firecrawl.dev</a></li>
                    <li>Sign up for a free account</li>
                    <li>Copy your API key from the dashboard</li>
                    <li>Add it to your .env.local file as FIRECRAWL_API_KEY</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Sync Successful!</h3>
                <p className="text-sm text-green-800 mt-1">{result.message}</p>
              </div>
            </div>

            {result.stats && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600">Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {result.stats.sessionsSaved || 0} / {result.stats.sessionsExtracted || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600">Speakers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {result.stats.speakersSaved || 0} / {result.stats.speakersExtracted || 0}
                  </p>
                </div>
              </div>
            )}

            {result.sample && result.sample.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Sample Sessions Extracted:</h4>
                <div className="space-y-2">
                  {result.sample.map((session: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3">
                      <p className="font-medium text-gray-900">{session.title}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Day {session.day} • {session.track || 'General Track'}
                      </p>
                      {session.speakers && session.speakers.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Speakers: {session.speakers.map((s: any) => s.name).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <p className="font-medium">For Firecrawl (Recommended):</p>
              <ol className="list-decimal ml-4 mt-1">
                <li>Sign up at <a href="https://www.firecrawl.dev/" target="_blank" className="underline">firecrawl.dev</a></li>
                <li>Get your API key from the dashboard</li>
                <li>Add FIRECRAWL_API_KEY to your .env.local file</li>
              </ol>
            </div>
            <div>
              <p className="font-medium">For WebFetch:</p>
              <p className="ml-4">Uses your existing Anthropic API key (already configured)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}