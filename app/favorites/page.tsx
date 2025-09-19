import { Suspense } from 'react';
import FavoritesClient from './FavoritesClient';
import { Loader2 } from 'lucide-react';

function LoadingFavorites() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading favorites...</p>
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<LoadingFavorites />}>
      <FavoritesClient />
    </Suspense>
  );
}