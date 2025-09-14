'use client';

import { useState, useEffect } from 'react';
import { Star, LogIn } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface FavoriteButtonProps {
  itemId: string;
  type: 'session' | 'speaker';
  className?: string;
  showLabel?: boolean;
}

export default function FavoriteButton({ itemId, type, className = '', showLabel = false }: FavoriteButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (session) {
      checkFavoriteStatus();
    }
  }, [session, itemId, type]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/favorites?type=${type}`);
      if (response.ok) {
        const data = await response.json();
        const favorited = data.favorites.some((fav: any) =>
          type === 'session' ? fav.sessionId === itemId : fav.speakerId === itemId
        );
        setIsFavorited(favorited);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!session) {
      setShowLoginPrompt(true);
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorited) {
        // Remove favorite
        const params = new URLSearchParams({
          type,
          ...(type === 'session' ? { sessionId: itemId } : { speakerId: itemId })
        });

        const response = await fetch(`/api/favorites?${params.toString()}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setIsFavorited(false);
        }
      } else {
        // Add favorite
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            ...(type === 'session' ? { sessionId: itemId } : { speakerId: itemId })
          })
        });

        if (response.ok) {
          setIsFavorited(true);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoginPrompt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
            <LogIn className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Sign In Required
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            You need to sign in to save your favorite {type === 'session' ? 'sessions' : 'speakers'} and build your personalized schedule.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/auth/register')}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Create Account
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading || status === 'loading'}
      className={`inline-flex items-center gap-2 transition-all ${
        isFavorited
          ? 'text-yellow-500 hover:text-yellow-600'
          : 'text-gray-400 hover:text-gray-600'
      } ${isLoading ? 'opacity-50 cursor-wait' : ''} ${className}`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`w-5 h-5 transition-all ${
          isFavorited ? 'fill-current' : ''
        }`}
      />
      {showLabel && (
        <span className="text-sm">
          {isFavorited ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
}