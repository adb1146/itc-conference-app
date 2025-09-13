'use client';

import { Brain } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ChatWidget() {
  const pathname = usePathname();
  
  // Don't show on chat pages
  if (pathname?.includes('/chat')) {
    return null;
  }

  const handleClick = () => {
    // Reset scroll position before navigation
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    // Navigate to chat
    window.location.href = '/chat/intelligent';
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all z-40 flex items-center justify-center group min-h-[48px] min-w-[48px] sm:min-h-[56px] sm:min-w-[56px]"
      aria-label="Open AI Assistant"
    >
      <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
      <span className="absolute right-full mr-2 bg-gray-900 text-white text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
        Ask AI Assistant
      </span>
    </button>
  );
}