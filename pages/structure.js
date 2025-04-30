import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Structure() {
  const [loading, setLoading] = useState(true);
  const [blindStructure, setBlindStructure] = useState(null);
  const [payoutStructures, setPayoutStructures] = useState([]);
  const [error, setError] = useState(null);
  const { data: session } = useSession();
  const isAdmin = session?.role === "ADMIN";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch the blind structure
        const response = await fetch('/api/blinds/structure');
        
        if (!response.ok) {
          throw new Error('Failed to load blind structure');
        }
        
        const data = await response.json();
        
        // Process the levels to assign display numbers (skip breaks)
        let regularLevelCount = 0;
        let breakCount = 0;
        const processedLevels = data.structure.levels.map(level => {
          if (level.isBreak) {
            breakCount++;
            // Add special text to the second break
            const breakText = breakCount === 2 ? "Break (Chip up 5s - Registration Closes)" : "Break";
            return { ...level, displayLevel: breakText };
          } else {
            regularLevelCount++;
            return { ...level, displayLevel: regularLevelCount };
          }
        });
        
        setBlindStructure({
          ...data.structure,
          levels: processedLevels
        });
        
        // Fetch all payout structures
        const payoutResponse = await fetch('/api/payout-structures');
        
        if (!payoutResponse.ok) {
          const errorData = await payoutResponse.json();
          throw new Error(`Failed to fetch payout structures: ${errorData.error || errorData.message || 'Unknown error'}`);
        }
        
        const payoutData = await payoutResponse.json();
        setPayoutStructures(payoutData.structures);
      } catch (error) {
        console.error('Error fetching blind structure:', error);
        setError('Failed to load blind structure. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        </div>
      </div>
    );
  }

  if (!blindStructure) {
    return (
      <div className="container py-12 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-red-500 mb-2">No blind structure available</h2>
        </div>
      </div>
    );
  }

  // Get unique positions from all payout structures
  const allPositions = [];
  payoutStructures.forEach(structure => {
    structure.tiers?.forEach(tier => {
      if (!allPositions.includes(tier.position)) {
        allPositions.push(tier.position);
      }
    });
  });
  
  // Sort positions in ascending order
  allPositions.sort((a, b) => a - b);

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Tournament Structure</h1>
      
      <div className="space-y-8">
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
            <CardTitle>Tournament Blind Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="my-6">
              <h2 className="text-2xl font-bold mb-4">Tournament Blind Structure</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Level</th>
                      <th className="border p-2 text-left">Small Blind</th>
                      <th className="border p-2 text-left">Big Blind</th>
                      <th className="border p-2 text-left">Ante</th>
                      <th className="border p-2 text-left">Duration</th>
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
                      {allPositions.map(position => (
                        <TableHead key={position} className="text-center">{position === 1 ? '1st' : position === 2 ? '2nd' : position === 3 ? '3rd' : `${position}th`}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutStructures.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell className="font-medium">{structure.name.replace("Players", "Entries")}</TableCell>
                        {allPositions.map(position => {
                          const tier = structure.tiers?.find(t => t.position === position);
                          return (
                            <TableCell key={position} className="text-center">
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