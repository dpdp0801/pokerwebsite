import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function SetupDatabase() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isAdmin = session?.role === 'ADMIN';

  // Redirect if not admin
  if (status === 'authenticated' && !isAdmin) {
    router.push('/');
    return null;
  }

  // Show loading if session is still loading
  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // If not logged in
  if (status === 'unauthenticated') {
    router.push('/api/auth/signin');
    return null;
  }

  const handleSetupDatabase = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/admin/run-migrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Something went wrong');
      }

      setResult(data);
    } catch (err) {
      console.error('Error setting up database:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Head>
        <title>Database Setup | Admin</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Database Setup</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          Return to Admin Dashboard
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> This tool will set up the required database tables for the tournament system and seed them with the necessary data. Use it when starting a new deployment or if you encounter issues with missing tables.
              </p>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">What This Will Do</h2>
        
        <ol className="list-decimal pl-6 mb-6 space-y-2">
          <li>Create the <code className="bg-gray-100 px-1 rounded">BlindStructure</code> and <code className="bg-gray-100 px-1 rounded">BlindLevel</code> tables if they don't exist</li>
          <li>Create the blind structure with the following highlights:
            <ul className="list-disc pl-6 mt-1 text-sm">
              <li>Level 1: 1/2 blinds, 2 ante</li>
              <li>Level 2: 2/3 blinds, 3 ante</li>
              <li>Level 5: Break</li>
              <li>Level 10: Break (registration close)</li>
              <li>Level 11: 50/50 blinds, 50 ante</li>
            </ul>
          </li>
          <li>Create payout structures for different tournament sizes (2-100 players)</li>
        </ol>
        
        <div className="flex justify-end">
          <button
            onClick={handleSetupDatabase}
            disabled={loading}
            className={`px-4 py-2 rounded font-medium ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Setting Up Database...' : 'Run Database Setup'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          
          <div className="mt-4">
            <p className="font-semibold">Possible Solutions:</p>
            <ul className="list-disc pl-6 mt-2 text-sm">
              <li>Verify that the database is properly set up and accessible</li>
              <li>Check your database connection settings</li>
              <li>Try restarting the application</li>
              <li>Contact your database administrator if issues persist</li>
            </ul>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-6">
          <p className="font-bold">Success:</p>
          <p>{result.message}</p>
          
          {result.actions && result.actions.length > 0 && (
            <div className="mt-4">
              <p className="font-semibold">Actions Performed:</p>
              <ul className="list-disc pl-6 mt-2">
                {result.actions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-white rounded border border-green-200">
            <p className="font-semibold text-green-800">What's Next:</p>
            <ol className="list-decimal pl-6 mt-2 text-sm space-y-1">
              <li>Return to the <Link href="/admin" className="text-blue-600 hover:underline">Admin Dashboard</Link></li>
              <li>Try creating a new tournament session</li>
              <li>Start the session to test the blind structure integration</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
} 