import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SeedStructures() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [detailedError, setDetailedError] = useState(null);

  const isAdmin = session?.user?.role === 'ADMIN';

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

  const handleSeedStructures = async () => {
    try {
      setLoading(true);
      setError(null);
      setDetailedError(null);
      setResult(null);

      const response = await fetch('/api/admin/seed-structures', {
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
      console.error('Error seeding structures:', err);
      setError(err.message || 'An error occurred');
      setDetailedError(err.stack || JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Head>
        <title>Seed Tournament Structures</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Seed Tournament Structures</h1>
      
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <p className="mb-4">This will create the following structures in the database:</p>
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Blind Structure</h2>
          <p>Standard tournament structure with 20-minute levels</p>
          <div className="mt-2 text-xs text-gray-600">
            <p>- Level 1: 1/2 blinds, 2 ante</p>
            <p>- Level 2: 2/3 blinds, 3 ante</p>
            <p>- Level 5: Break (chip up)</p>
            <p>- Level 10: Break (registration close)</p>
            <p>- Level 11: 50/50 blinds, 50 ante</p>
            <p>- Level 15: Break</p>
          </div>
        </div>
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Payout Structures</h2>
          <ul className="list-disc pl-6">
            <li>2-10 Players (2 places paid)</li>
            <li>11-20 Players (3 places paid)</li>
            <li>21-30 Players (4 places paid)</li>
            <li>31-40 Players (5 places paid)</li>
            <li>41-50 Players (6 places paid)</li>
            <li>51-60 Players (7 places paid)</li>
            <li>61-75 Players (8 places paid)</li>
            <li>76-100 Players (10 places paid)</li>
          </ul>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={handleSeedStructures}
            disabled={loading}
            className={`px-4 py-2 rounded font-medium ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Processing...' : 'Seed Structures'}
          </button>
          
          <div className="ml-4">
            <a href="/admin" className="text-blue-600 hover:underline">
              Return to Admin Dashboard
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          
          {detailedError && (
            <div className="mt-4">
              <p className="font-bold">Technical Details:</p>
              <pre className="overflow-auto p-2 bg-red-50 text-red-800 text-xs mt-2 max-h-60">
                {detailedError}
              </pre>
            </div>
          )}
          
          <div className="mt-4">
            <p className="font-semibold">Possible Solutions:</p>
            <ul className="list-disc pl-6 mt-2 text-sm">
              <li>Verify that the database is properly set up and accessible</li>
              <li>Check if the BlindStructure and PayoutStructure tables already exist</li>
              <li>Ensure your database schema is up to date with the latest Prisma schema</li>
              <li>Try running <code className="bg-red-50 px-1">npx prisma db push</code> to sync the schema</li>
            </ul>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-6">
          <p className="font-bold">Success:</p>
          <p>{result.message}</p>
          
          {result.blindStructure && (
            <div className="mt-4">
              <p className="font-semibold">Blind Structure Created:</p>
              <div className="bg-white p-3 rounded mt-2 border border-green-200">
                <p>ID: <span className="font-mono text-sm">{result.blindStructure.id}</span></p>
                <p>Name: {result.blindStructure.name}</p>
                <p>Starting Stack: {result.blindStructure.startingStack.toLocaleString()}</p>
              </div>
            </div>
          )}
          
          {result.payoutStructures && (
            <div className="mt-4">
              <p className="font-semibold">Payout Structures Created:</p>
              <div className="bg-white p-3 rounded mt-2 border border-green-200">
                <p>Total structures: {result.payoutStructures.length}</p>
                <ul className="list-disc pl-6 mt-2 text-sm">
                  {result.payoutStructures.map((structure, index) => (
                    <li key={index}>{structure.name} ({structure.minEntries}-{structure.maxEntries} players)</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-white rounded border border-green-200">
            <p className="font-semibold text-green-800">What's Next:</p>
            <ol className="list-decimal pl-6 mt-2 text-sm space-y-1">
              <li>Return to the <a href="/admin" className="text-blue-600 hover:underline">Admin Dashboard</a></li>
              <li>Try creating a new tournament session</li>
              <li>Start the session to test the blind structure integration</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
} 