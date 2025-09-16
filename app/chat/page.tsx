'use client';

import dynamic from 'next/dynamic';

// Dynamic import with no SSR for better mobile detection
const ResponsiveChatPage = dynamic(
  () => import('./ResponsiveChatPage'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }
);

export default function ChatPage() {
  return <ResponsiveChatPage />;
}