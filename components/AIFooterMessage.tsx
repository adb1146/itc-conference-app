import { Sparkles } from 'lucide-react';

export function AIFooterMessage() {
  return (
    <div className="flex items-center justify-center gap-2 py-3 bg-gradient-to-t from-gray-50 to-transparent">
      <p className="text-xs text-gray-500">
        ITC Concierge can make mistakes. Double-check important information.
      </p>
      <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Powered by AI
      </span>
    </div>
  );
}