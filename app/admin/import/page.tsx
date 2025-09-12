'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ImportDataPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.email === 'test@example.com' || (session?.user as any)?.isAdmin;

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    router.push('/');
    return null;
  }

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/import-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">Import Conference Data</h1>
          <p className="text-gray-600 mt-1">
            Import conference data from the latest export file
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm">
              <strong>Warning:</strong> This will delete all existing data in the database and replace it with the exported data.
            </p>
          </div>

          {!result && !error && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">
                Ready to import data from <code className="bg-gray-100 px-2 py-1 rounded">data/exports/latest-export.json</code>
              </p>
              <button 
                onClick={handleImport} 
                disabled={importing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  'Start Import'
                )}
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Import completed successfully!</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Imported:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>Speakers: {result.imported.speakers}</li>
                    <li>Sessions: {result.imported.sessions}</li>
                    <li>Relationships: {result.imported.sessionSpeakers}</li>
                    <li>Users: {result.imported.users}</li>
                    <li>Favorites: {result.imported.favorites}</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Final counts:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>Speakers: {result.final.speakers}</li>
                    <li>Sessions: {result.final.sessions}</li>
                    <li>Relationships: {result.final.sessionSpeakers}</li>
                    <li>Users: {result.final.users}</li>
                    <li>Favorites: {result.final.favorites}</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => router.push('/agenda')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Agenda
                </button>
                <button 
                  onClick={() => router.push('/admin/dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Admin Dashboard
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-red-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Import failed</span>
              </div>
              <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
              <button 
                onClick={handleImport} 
                disabled={importing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}