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
      setResult(null);

      const response = await fetch('/api/admin/seed-structures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred');
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
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-6">
          <p className="font-bold">Success:</p>
          <p>{result.message}</p>
          <div className="mt-2">
            <p className="font-semibold">Blind Structure ID:</p>
            <p className="font-mono text-sm">{result.blindStructure.id}</p>
          </div>
          <div className="mt-2">
            <p className="font-semibold">Payout Structures Created:</p>
            <p className="font-mono text-sm">{result.payoutStructures.length}</p>
          </div>
        </div>
      )}
    </div>
  );
} 