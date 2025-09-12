'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, XCircle } from 'lucide-react';

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
        <Loader2 className="h-8 w-8 animate-spin" />
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
      <Card>
        <CardHeader>
          <CardTitle>Import Conference Data</CardTitle>
          <CardDescription>
            Import conference data from the latest export file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Warning:</strong> This will delete all existing data in the database and replace it with the exported data.
            </AlertDescription>
          </Alert>

          {!result && !error && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-600">
                Ready to import data from <code>data/exports/latest-export.json</code>
              </p>
              <Button 
                onClick={handleImport} 
                disabled={importing}
                size="lg"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start Import
                  </>
                )}
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
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
                <Button 
                  onClick={() => router.push('/agenda')}
                  variant="default"
                >
                  View Agenda
                </Button>
                <Button 
                  onClick={() => router.push('/admin/dashboard')}
                  variant="outline"
                >
                  Admin Dashboard
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Import failed</span>
              </div>
              <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
              <Button 
                onClick={handleImport} 
                disabled={importing}
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}