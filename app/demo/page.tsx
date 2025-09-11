'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    // Set demo session data
    localStorage.setItem('demo-user', JSON.stringify({
      id: 'demo-user-123',
      email: 'test@example.com',
      name: 'Andrew Bartels',
      role: 'Executive',
      company: 'PS Advisory LLC',
      interests: ['AI & Automation', 'Digital Distribution', 'Underwriting'],
      isDemo: true
    }));
    
    // Redirect to home
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Setting up demo session...</h1>
        <p className="text-gray-600">Redirecting to home page...</p>
      </div>
    </div>
  );
}