import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from 'next/router';

export default function Info() {
  const [loading, setLoading] = useState(true);
  const [blindStructure, setBlindStructure] = useState(null);
  const [payoutStructures, setPayoutStructures] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setDebugInfo(null);
        
        // Fetch the blind structure
        console.log('Fetching blind structure data...');
        const debug = { 
          blindStructure: { requestSent: true },
          payoutStructures: {}
        };
        
        try {
          const response = await fetch('/api/blinds/structure');
          debug.blindStructure.statusCode = response.status;
          debug.blindStructure.statusText = response.statusText;
          
          if (!response.ok) {
            let errorText = '';
            try {
              const errorData = await response.json();
              debug.blindStructure.errorData = errorData;
              errorText = errorData.message || 'Unknown error';
            } catch (e) {
              errorText = 'Failed to parse error response';
              debug.blindStructure.parseError = e.message;
            }
            throw new Error(`Failed to load blind structure: ${errorText}`);
          }
          
          const responseText = await response.text();
          debug.blindStructure.responseText = responseText;
          
          let data;
          try {
            data = JSON.parse(responseText);
            debug.blindStructure.dataParsed = true;
          } catch (e) {
            debug.blindStructure.parseError = e.message;
            throw new Error(`Failed to parse blind structure data: ${e.message}`);
          }
          
          debug.blindStructure.hasStructureField = !!data.structure;
          
          if (!data.structure) {
            throw new Error('Invalid blind structure data: structure field is missing');
          }

          debug.blindStructure.hasLevelsArray = Array.isArray(data.structure.levels);
          
          if (!Array.isArray(data.structure.levels)) {
            throw new Error('Invalid blind structure data: levels array is missing');
          }
          
          debug.blindStructure.levelsCount = data.structure.levels.length;
          
          // Process the levels to assign display numbers and handle break descriptions
          let regularLevelCount = 0;
          let breakCount = 0;
          const processedLevels = data.structure.levels.map(level => {
            if (level.isBreak) {
              breakCount++;
              // Add special text based on which break it is
              let specialDescription = '';
              
              if (level.specialAction) {
                if (level.specialAction.includes('CHIP_UP_1S')) {
                  specialDescription += 'Chip up 1s\n';
                }
                if (level.specialAction.includes('CHIP_UP_5S')) {
                  specialDescription += 'Chip up 5s\n';
                }
                if (level.specialAction.includes('REG_CLOSE')) {
                  specialDescription += 'Registration Closes\n';
                }
              } else {
                if (breakCount === 1) {
                  specialDescription = 'Chip up 1s';
                } else if (breakCount === 2) {
                  specialDescription = 'Chip up 5s\nRegistration Closes';
                }
              }
              
              return { 
                ...level, 
                displayLevel: level.breakName || 'Break',
                specialDescription
              };
            } else {
              regularLevelCount++;
              return { 
                ...level, 
                displayLevel: regularLevelCount,
                specialDescription: ''
              };
            }
          });
          
          setBlindStructure({
            ...data.structure,
            levels: processedLevels
          });
        } catch (e) {
          debug.blindStructure.error = e.message;
          debug.blindStructure.stack = e.stack;
          throw e;
        }
        
        // Fetch all payout structures
        debug.payoutStructures.requestSent = true;
        console.log('Fetching payout structures...');
        
        try {
          const payoutResponse = await fetch('/api/payout-structures');
          debug.payoutStructures.statusCode = payoutResponse.status;
          debug.payoutStructures.statusText = payoutResponse.statusText;
          
          if (!payoutResponse.ok) {
            let errorText = '';
            try {
              const errorData = await payoutResponse.json();
              debug.payoutStructures.errorData = errorData;
              errorText = errorData.error || errorData.message || 'Unknown error';
            } catch (e) {
              errorText = 'Failed to parse error response';
              debug.payoutStructures.parseError = e.message;
            }
            throw new Error(`Failed to fetch payout structures: ${errorText}`);
          }
          
          const payoutResponseText = await payoutResponse.text();
          debug.payoutStructures.responseText = payoutResponseText;
          
          let payoutData;
          try {
            payoutData = JSON.parse(payoutResponseText);
            debug.payoutStructures.dataParsed = true;
          } catch (e) {
            debug.payoutStructures.parseError = e.message;
            throw new Error(`Failed to parse payout structures data: ${e.message}`);
          }
          
          debug.payoutStructures.hasStructuresArray = Array.isArray(payoutData.structures);
          
          if (!payoutData.structures || !Array.isArray(payoutData.structures)) {
            throw new Error('Invalid payout structure data: structures array is missing');
          }
          
          debug.payoutStructures.structuresCount = payoutData.structures.length;
          
          setPayoutStructures(payoutData.structures);
        } catch (e) {
          debug.payoutStructures.error = e.message;
          debug.payoutStructures.stack = e.stack;
          // Don't throw here to display at least the blind structure if it loaded
          console.error('Error fetching payout structures:', e);
        }
        
      } catch (error) {
        console.error('Error fetching tournament structure data:', error);
        setError(`Failed to load tournament structure: ${error.message}`);
        setDebugInfo(debug);
        
        // If we encountered an error loading data, redirect to static version
        if (!isAdmin) {
          console.log('Redirecting to static structure page...');
          router.push('/structure');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, isAdmin]);

  if (loading) {
    return (
      <div className="container py-12 max-w-4xl">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Loading tournament structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p>{error}</p>
          {isAdmin && (
            <div className="mt-4 p-4 bg-gray-100 text-left rounded text-sm overflow-auto max-h-96">
              <p className="font-bold">Admin Debug Information:</p>
              <p>Please check server logs for more details. Ensure that:</p>
              <ul className="list-disc ml-5 mt-2 mb-4">
                <li>The <code>/data</code> directory exists</li>
                <li>The <code>/data/blindStructure.json</code> file exists and is valid JSON</li>
                <li>The <code>/data/payoutStructures.json</code> file exists and is valid JSON</li>
              </ul>
              
              <div className="mt-4">
                <p className="font-bold">Debug Data:</p>
                <pre className="bg-gray-50 p-2 rounded text-xs mt-1 overflow-x-auto">
                  {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'No debug data available'}
                </pre>
              </div>
              
              <div className="mt-4">
                <p className="font-bold">Static Alternative:</p>
                <p>You can view the <a href="/structure" className="text-blue-500 underline">static structure page</a> which doesn't rely on API calls.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!blindStructure) {
    return (
      <div className="container py-12 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-red-500 mb-2">No blind structure available</h2>
          <p>The tournament blind structure could not be loaded.</p>
          <div className="mt-4">
            <a href="/structure" className="text-blue-500 underline">View static structure page</a>
          </div>
        </div>
      </div>
    );
  }

  // Create a more compact display of positions
  // Only show key places: 1st, 2nd, 3rd, and optionally 4th-9th if they exist
  const displayPlaces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(place => {
    // Only include places that have payouts in at least one structure
    return payoutStructures.some(structure => 
      structure.tiers?.some(tier => tier.position === place)
    );
  });

  // Format the place name (1st, 2nd, 3rd, etc.)
  const getPlaceName = (place) => {
    switch(place) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${place}th Place`;
    }
  };

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Tournament Structure</h1>
      
      <div className="space-y-8">
        {/* Tournament/Cash Game Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament/Cash Game Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Pre-Registration</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                <li>Your reserved seat will be held for 30 minutes after the tournament start time.</li>
                <li>If you haven't arrived within 30 minutes of start time, your seat will be removed.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* General Tournament Info */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Rake</h3>
              <p className="text-muted-foreground">No rake</p>
            </div>
            <div>
              <h3 className="font-medium">Starting Stack</h3>
              <p className="text-muted-foreground">{blindStructure?.startingStack.toLocaleString()} chips</p>
            </div>
            <div>
              <h3 className="font-medium">Target Duration</h3>
              <p className="text-muted-foreground">~4-5 hours</p>
            </div>
            <div>
              <h3 className="font-medium">Re-entry Policy</h3>
              <p className="text-muted-foreground">Unlimited re-entries during registration period. If waitlist exists, eliminated players join the waitlist.</p>
            </div>
          </CardContent>
        </Card>

        {/* Blind Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Blind Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="my-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Level</th>
                      <th className="border p-2 text-left">Small Blind</th>
                      <th className="border p-2 text-left">Big Blind</th>
                      <th className="border p-2 text-left">Ante</th>
                      <th className="border p-2 text-left">Duration</th>
                      <th className="border p-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blindStructure?.levels.map((level, index) => (
                      <tr key={index} className={level.isBreak ? 'bg-accent/20' : ''}>
                        <td className="border p-2">{level.displayLevel}</td>
                        <td className="border p-2">{level.isBreak ? '-' : level.smallBlind}</td>
                        <td className="border p-2">{level.isBreak ? '-' : level.bigBlind}</td>
                        <td className="border p-2">{level.isBreak ? '-' : (level.ante || '-')}</td>
                        <td className="border p-2">{level.duration} mins</td>
                        <td className="border p-2 whitespace-pre-line">
                          {level.specialDescription ? level.specialDescription : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Structure</CardTitle>
          </CardHeader>
          <CardContent>
            {payoutStructures.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entries</TableHead>
                      {displayPlaces.map(place => (
                        <TableHead key={place} className="text-center">{getPlaceName(place)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutStructures.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell className="font-medium">{structure.name.replace("Players", "Entries")}</TableCell>
                        {displayPlaces.map(place => {
                          const tier = structure.tiers?.find(t => t.position === place);
                          return (
                            <TableCell key={place} className="text-center">
                              {tier ? `${tier.percentage}%` : '—'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No payout structures available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 