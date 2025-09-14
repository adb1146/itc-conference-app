'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Users, Calendar, Map, Star, ArrowLeft } from 'lucide-react';
import Navigation from '@/components/Navigation';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch('/api/search/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm, limit: 20 })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      // Update URL with search query
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      window.history.pushState({}, '', `/search?${params.toString()}`);
      performSearch(searchQuery);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'speaker': return Users;
      case 'session': return Calendar;
      case 'track': return Map;
      case 'location': return Map;
      default: return Star;
    }
  };

  const groupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="h-16"></div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Search ITC Vegas 2025</h1>

          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions, speakers, tracks, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
            {searching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {searchQuery && searchResults.length > 0 && (
          <p className="text-sm text-gray-600 mb-6">
            Found {searchResults.length} results for "{searchQuery}"
          </p>
        )}

        {searchQuery && searchResults.length === 0 && !searching && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No results found for "{searchQuery}"</p>
            <p className="text-sm text-gray-400 mt-2">Try different keywords or check your spelling</p>
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Enter a search term to find content</p>
          </div>
        )}

        {Object.entries(groupedResults).map(([type, results]) => (
          <div key={type} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              {type}s ({results.length})
            </h2>
            <div className="space-y-3">
              {results.map((result) => {
                const Icon = getResultIcon(result.type);
                return (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.url}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        result.type === 'speaker' ? 'bg-blue-100 text-blue-600' :
                        result.type === 'session' ? 'bg-purple-100 text-purple-600' :
                        result.type === 'track' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900 line-clamp-1">
                          {result.title}
                        </h3>
                        {result.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {result.description}
                          </p>
                        )}
                        {result.metadata && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {result.metadata.time && (
                              <span>{new Date(result.metadata.time).toLocaleString()}</span>
                            )}
                            {result.metadata.location && (
                              <span>{result.metadata.location}</span>
                            )}
                            {result.metadata.company && (
                              <span>{result.metadata.company}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}