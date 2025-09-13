'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgendaPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the intelligent agenda page
    router.replace('/agenda/intelligent');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading Smart Agenda...</p>
      </div>
    </div>
  );
}