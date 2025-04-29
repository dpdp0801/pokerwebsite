import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useToast } from "@/lib/hooks/use-toast";

export default function Structure() {
  const [loading, setLoading] = useState(true);
  const [seedingPayouts, setSeedingPayouts] = useState(false);
  const [blindStructure, setBlindStructure] = useState(null);
  const [payoutStructures, setPayoutStructures] = useState([]);
  const [activePayoutTab, setActivePayoutTab] = useState('default');
  const [error, setError] = useState(null);
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.role === "ADMIN";

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch blind structure
        const blindResponse = await fetch('/api/blinds/structure');
        
        if (!blindResponse.ok) {
          throw new Error('Failed to fetch blind structure');
        }
        
        const blindData = await blindResponse.json();
        setBlindStructure(blindData.structure);
        
        // Fetch all payout structures
        const payoutResponse = await fetch('/api/payout-structures');
        
        if (!payoutResponse.ok) {
          throw new Error('Failed to fetch payout structures');
        }
        
        const payoutData = await payoutResponse.json();
        setPayoutStructures(payoutData.structures);
        
        // Set the default active tab to the first structure
        if (payoutData.structures.length > 0) {
          setActivePayoutTab(payoutData.structures[0].id.toString());
        }
      } catch (err) {
        console.error('Error fetching tournament structure:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle seeding payout structures
  const handleSeedPayoutStructures = async () => {
    if (!isAdmin) return;
    
    try {
      setSeedingPayouts(true);
      const response = await fetch('/api/admin/seed-payouts', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to seed payout structures');
      }
      
      const data = await response.json();
      
      // Refresh the payout structures
      const refreshResponse = await fetch('/api/payout-structures');
      const refreshData = await refreshResponse.json();
      setPayoutStructures(refreshData.structures);
      
      if (refreshData.structures.length > 0) {
        setActivePayoutTab(refreshData.structures[0].id.toString());
      }
      
      toast({
        title: "Success",
        description: "Payout structures seeded successfully",
      });
    } catch (err) {
      console.error('Error seeding payout structures:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to seed payout structures",
        variant: "destructive"
      });
    } finally {
      setSeedingPayouts(false);
    }
  };

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
              <h3 className="font-medium">In the Money</h3>
              <p className="text-muted-foreground">Varies based on number of entries</p>
            </div>
            <div className="md:col-span-2">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Small Blind</TableHead>
                  <TableHead>Big Blind</TableHead>
                  <TableHead>Ante</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blindStructure?.levels.map((level) => (
                  <TableRow key={level.id} className={level.isBreak ? "bg-muted/30" : ""}>
                    <TableCell>
                      {level.isBreak ? level.breakName : level.level}
                    </TableCell>
                    <TableCell>{level.duration} min</TableCell>
                    <TableCell>{level.isBreak ? '—' : level.smallBlind}</TableCell>
                    <TableCell>{level.isBreak ? '—' : level.bigBlind}</TableCell>
                    <TableCell>{level.isBreak ? '—' : level.ante}</TableCell>
                    <TableCell>
                      {level.specialAction === 'REG_CLOSE' && 'Registration Closes'}
                      {level.specialAction === 'CHIP_UP_1S' && 'Chip Up 1s'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payout Structure */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Payout Structure</CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedPayoutStructures}
                disabled={seedingPayouts}
              >
                {seedingPayouts ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  "Seed Payout Structures"
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {payoutStructures.length > 0 ? (
              <>
                <Tabs defaultValue={activePayoutTab} value={activePayoutTab} onValueChange={setActivePayoutTab} className="mb-4">
                  <TabsList className="mb-2">
                    {payoutStructures.map((structure) => (
                      <TabsTrigger key={structure.id} value={structure.id.toString()}>
                        {structure.name} ({structure.minEntries}-{structure.maxEntries} players)
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {payoutStructures.map((structure) => (
                    <TabsContent key={structure.id} value={structure.id.toString()}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Position</TableHead>
                            <TableHead>Percentage of Prize Pool</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {structure.tiers?.map((tier) => (
                            <TableRow key={tier.id}>
                              <TableCell>{tier.position}</TableCell>
                              <TableCell>{tier.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  ))}
                </Tabs>
              </>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No payout structures available.</p>
                {isAdmin && (
                  <Button onClick={handleSeedPayoutStructures} disabled={seedingPayouts}>
                    {seedingPayouts ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Payout Structures...
                      </>
                    ) : (
                      "Create Payout Structures"
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 