'use client';

import Link from 'next/link';
import { Clock, MapPin, Users, Calendar, Plus, Eye } from 'lucide-react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Speaker {
  name: string;
  role?: string;
  company?: string;
}

interface SessionCardProps {
  id: string;
  title: string;
  startTime?: Date | string;
  endTime?: Date | string;
  location?: string;
  track?: string;
  speakers?: Speaker[];
  onAddToSchedule?: (sessionId: string) => void;
  compact?: boolean;
}

export default function SessionCard({ 
  id, 
  title, 
  startTime, 
  endTime, 
  location, 
  track, 
  speakers = [],
  onAddToSchedule,
  compact = false
}: SessionCardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (time: Date | string | undefined) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (time: Date | string | undefined) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleAddToSchedule = async () => {
    // Check if user is authenticated
    if (status !== 'authenticated') {
      // Store current path and session ID in session storage to persist after auth
      sessionStorage.setItem('returnPath', window.location.pathname);
      sessionStorage.setItem('pendingScheduleAdd', id);
      // Redirect to sign in
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id })
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 3000);
        
        // Call the parent callback if provided
        if (onAddToSchedule) {
          onAddToSchedule(id);
        }
      } else if (data.requiresAuth) {
        // Redirect to sign in
        sessionStorage.setItem('returnPath', window.location.pathname);
        sessionStorage.setItem('pendingScheduleAdd', id);
        router.push('/auth/signin');
      } else if (data.alreadyAdded) {
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
      }
    } catch (error) {
      console.error('Error adding to schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    // Compact view for chat responses
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
        <Link href={`/agenda/session/${id}`} className="block">
          <h4 className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
            {title}
          </h4>
        </Link>
        
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
          {startTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(startTime)}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{location}</span>
            </div>
          )}
          {speakers.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{speakers.length} speaker{speakers.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Link 
            href={`/agenda/session/${id}`}
            className="flex-1 text-center text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-3 h-3" />
            View Details
          </Link>
          <button
            onClick={handleAddToSchedule}
            disabled={isAdded || isLoading}
            className={`flex-1 text-center text-xs px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${
              isAdded 
                ? 'bg-green-100 text-green-700' 
                : isLoading
                ? 'bg-gray-100 text-gray-500'
                : status !== 'authenticated'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Plus className="w-3 h-3" />
            {isAdded ? 'Added!' : isLoading ? 'Adding...' : status !== 'authenticated' ? 'Sign in to Add' : 'Add to Schedule'}
          </button>
        </div>
      </div>
    );
  }

  // Full view for standalone display
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <Link href={`/agenda/session/${id}`} className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {title}
          </h3>
        </Link>
        {track && (
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {track}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 text-xs sm:text-sm text-gray-600">
        {startTime && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(startTime)}</span>
          </div>
        )}
        {startTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{location}</span>
          </div>
        )}
        {speakers.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{speakers.length} speaker{speakers.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {speakers.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 mb-1">Speakers:</p>
          <div className="flex flex-wrap gap-2">
            {speakers.map((speaker, idx) => (
              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {speaker.name} {speaker.company && `(${speaker.company})`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link 
          href={`/agenda/session/${id}`}
          className="flex-1 text-center text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          View Details
        </Link>
        <button
          onClick={handleAddToSchedule}
          disabled={isAdded || isLoading}
          className={`flex-1 text-center text-sm px-4 py-2 rounded-lg transition-colors ${
            isAdded 
              ? 'bg-green-100 text-green-700' 
              : isLoading
              ? 'bg-gray-100 text-gray-500'
              : status !== 'authenticated'
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAdded ? '✓ Added to Schedule' : isLoading ? 'Adding...' : status !== 'authenticated' ? 'Sign in to Add' : 'Add to Schedule'}
        </button>
      </div>
    </div>
  );
}