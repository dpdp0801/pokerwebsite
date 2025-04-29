import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, Trash2, Timer, Clock, ArrowLeft, ArrowRight, Award } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/lib/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState({
    exists: false,
    session: null
  });
  const [blindStructureData, setBlindStructureData] = useState(null);
  const [blindsLoading, setBlindsLoading] = useState(false);
  const [payoutStructure, setPayoutStructure] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  const { data: session } = useSession();
  const isAdmin = session?.role === "ADMIN";
  const router = useRouter();
  const { toast } = useToast();

  // Fetch real session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/session-status');
        const data = await response.json();
        setSessionData(data);
        
        // If active tournament, fetch blind structure and payout structure
        if (data.exists && data.session.type === 'TOURNAMENT' && data.session.status === 'ACTIVE') {
          fetchBlindStructure(data.session.id);
          // Use entries if available, otherwise use registered players
          fetchPayoutStructure(data.session.entries || data.session.registeredPlayers);
        }
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, []);

  // Fetch blind structure for active tournament
  const fetchBlindStructure = async (sessionId) => {
    try {
      setBlindsLoading(true);
      const response = await fetch(`/api/blinds/current?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blind structure');
      }
      
      const data = await response.json();
      setBlindStructureData(data);
    } catch (error) {
      console.error('Error fetching blind structure:', error);
    } finally {
      setBlindsLoading(false);
    }
  };

  // Fetch payout structure based on player count
  const fetchPayoutStructure = async (playerCount) => {
    try {
      setPayoutLoading(true);
      const response = await fetch(`/api/payout-structures/get-by-entries?entries=${playerCount}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payout structure');
      }
      
      const data = await response.json();
      setPayoutStructure(data);
    } catch (error) {
      console.error('Error fetching payout structure:', error);
    } finally {
      setPayoutLoading(false);
    }
  };

  // Update blind level (admin only)
  const updateBlindLevel = async (levelIndex) => {
    if (!isAdmin || !sessionData.exists) return;
    
    try {
      const response = await fetch('/api/blinds/update-level', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionData.session.id,
          levelIndex
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update blind level');
      }
      
      // Refresh blind structure data
      fetchBlindStructure(sessionData.session.id);
      
      toast({
        title: "Blind Level Updated",
        description: "The current blind level has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the blind level",
        variant: "destructive",
      });
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTimeOnly = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Calculate payout amount
  const calculatePayout = (percentage, buyIn, playerCount) => {
    const totalPrizePool = buyIn * playerCount;
    return (totalPrizePool * (percentage / 100)).toFixed(2);
  };

  // Remove player from registration or waitlist
  const removePlayer = async (registrationId) => {
    if (!isAdmin) return;
    
    if (window.confirm("Are you sure you want to remove this player?")) {
      try {
        const response = await fetch(`/api/registration?id=${registrationId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          toast({
            title: "Player Removed",
            description: "The player has been removed successfully.",
          });
          
          // Refresh the session data
          const updatedResponse = await fetch('/api/session-status');
          const updatedData = await updatedResponse.json();
          setSessionData(updatedData);
        } else {
          const data = await response.json();
          throw new Error(data.error || "Failed to remove player");
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err.message || "An error occurred while removing the player",
          variant: "destructive",
        });
      }
    }
  };

  const PlayerList = ({ players, title, emptyMessage, colorClass }) => {
    if (!players || players.length === 0) {
      return (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <div className="border rounded-md overflow-hidden">
          <ul className="divide-y">
            {players.map((registration) => (
              <li key={registration.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={registration.user.image} alt={registration.user.name} />
                    <AvatarFallback className={colorClass}>
                      {getInitials(registration.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{registration.user.name}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removePlayer(registration.id)}
                    title="Remove player"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-6 w-32 bg-muted rounded mb-4"></div>
              <div className="h-4 w-48 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionData.exists) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span>Current Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground text-lg mb-6">
              No session is currently ongoing
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSession = sessionData.session;
  const registrations = currentSession.registrations || { confirmed: [], waitlisted: [] };
  const isTournament = currentSession.type === 'TOURNAMENT';
  const isActive = currentSession.status === 'ACTIVE';

  return (
    <div className="container py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <span>{isTournament ? 'Tournament' : 'Cash Game'} Status</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isActive ? 'bg-green-100 text-green-800' : 
              'bg-blue-100 text-blue-800'
            }`}>
              {isActive ? 'Live' : 'Not Started'}
            </span>
          </CardTitle>
          <CardDescription className="text-center">
            {formatDate(currentSession.date)} at {formatTimeOnly(currentSession.startTime)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">{currentSession.title}</h2>
            <p className="text-sm text-muted-foreground">{currentSession.location}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-center">
            {isTournament ? (
              <>
                <div>
                  <p className="text-xl font-medium">${currentSession.buyIn}</p>
                  <p className="text-muted-foreground">Buy-in</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xl font-medium">${currentSession.smallBlind}/${currentSession.bigBlind}</p>
                  <p className="text-muted-foreground">Blinds</p>
                </div>
                
                <div>
                  <p className="text-xl font-medium">${currentSession.minBuyIn}</p>
                  <p className="text-muted-foreground">Min Buy-in</p>
                </div>
              </>
            )}
            
            <div>
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-xl font-medium">
                  {currentSession.registeredPlayers}/{currentSession.maxPlayers}
                </p>
              </div>
              <p className="text-muted-foreground">Registered Players</p>
            </div>
            
            <div>
              <p className="text-xl font-medium">{currentSession.waitlistedPlayers || 0}</p>
              <p className="text-muted-foreground">Waitlisted</p>
            </div>

            {isTournament && (
              <div className="col-span-2">
                <p className="text-xl font-medium">{currentSession.entries || 0}</p>
                <p className="text-muted-foreground">Total Entries</p>
              </div>
            )}
          </div>
          
          {/* Show blind structure for active tournaments */}
          {isTournament && isActive && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-lg mb-3 text-center">Blind Structure</h3>
              
              {blindsLoading ? (
                <div className="flex justify-center items-center py-4">
                  <Clock className="h-5 w-5 animate-spin mr-2" />
                  <p>Loading blind structure...</p>
                </div>
              ) : blindStructureData ? (
                <>
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="text-sm text-muted-foreground">
                        Level {blindStructureData.currentLevel?.level || 1} / {blindStructureData.totalLevels || 'Unknown'}
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => updateBlindLevel(Math.max(0, (currentSession.currentBlindLevel || 0) - 1))}
                            disabled={!currentSession.currentBlindLevel}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => updateBlindLevel((currentSession.currentBlindLevel || 0) + 1)}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {blindStructureData.currentLevel?.isBreak ? (
                    <div className="bg-blue-50 p-4 rounded-md text-center mb-4">
                      <h4 className="font-medium text-blue-800">
                        {blindStructureData.currentLevel.breakName || 'Break'} - {blindStructureData.currentLevel.duration} minutes
                      </h4>
                      {blindStructureData.currentLevel.specialAction && (
                        <p className="text-sm text-blue-700 mt-1">
                          {blindStructureData.currentLevel.specialAction === 'CHIP_UP_1S' && 'Chip Up 1s'}
                          {blindStructureData.currentLevel.specialAction === 'REG_CLOSE' && 'Registration Closes'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Small Blind</TableHead>
                            <TableHead className="text-center">Big Blind</TableHead>
                            <TableHead className="text-center">Ante</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-center font-medium">
                              {blindStructureData.currentLevel?.smallBlind || '—'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {blindStructureData.currentLevel?.bigBlind || '—'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {blindStructureData.currentLevel?.ante || '—'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {isAdmin && (
                    <div className="text-center mb-2">
                      <Link href="/structure" className="text-sm text-primary hover:underline inline-flex items-center">
                        <span>View Full Structure</span>
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground">No blind structure information available</p>
              )}
            </div>
          )}
          
          {/* Show payout structure for active tournaments */}
          {isTournament && isActive && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-lg mb-3 text-center flex items-center justify-center">
                <Award className="h-5 w-5 mr-1 text-amber-500" />
                Payout Structure
              </h3>
              
              {payoutLoading ? (
                <div className="flex justify-center items-center py-4">
                  <Clock className="h-5 w-5 animate-spin mr-2" />
                  <p>Loading payout structure...</p>
                </div>
              ) : blindStructureData?.currentLevel?.specialAction === 'REG_CLOSE' || 
                  (currentSession.currentBlindLevel && 
                  blindStructureData?.levels?.findIndex(l => l.specialAction === 'REG_CLOSE') < currentSession.currentBlindLevel) ? (
                // Registration is closed, show payout structure
                payoutStructure ? (
                  <>
                    <div className="mb-2 text-center text-sm text-muted-foreground">
                      Based on {currentSession.entries || currentSession.registeredPlayers} entries - Total Prize Pool: ${(currentSession.buyIn * (currentSession.entries || currentSession.registeredPlayers)).toLocaleString()}
                    </div>
                    <div className="border rounded-md overflow-hidden mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Position</TableHead>
                            <TableHead>Percentage</TableHead>
                            <TableHead>Payout</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payoutStructure.tiers?.map((tier) => (
                            <TableRow key={tier.id}>
                              <TableCell className="font-medium">{tier.position}</TableCell>
                              <TableCell>{tier.percentage}%</TableCell>
                              <TableCell className="font-medium">
                                ${calculatePayout(tier.percentage, currentSession.buyIn, currentSession.entries || currentSession.registeredPlayers)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">No payout structure information available</p>
                )
              ) : (
                // Registration is still open
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Payouts will be posted after registration closes.</p>
                  {isAdmin && (
                    <div className="mt-2">
                      <Link href="/structure" className="text-sm text-primary hover:underline inline-flex items-center">
                        <span>View Payout Structure Table</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Only show participants list to admins */}
          {isAdmin && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-lg mb-3">Participants</h3>
              
              <PlayerList 
                players={registrations.confirmed}
                title="Registered Players"
                emptyMessage="No players have registered yet"
                colorClass="bg-green-100 text-green-800"
              />
              
              <PlayerList 
                players={registrations.waitlisted}
                title="Waitlist"
                emptyMessage="No players on the waitlist"
                colorClass="bg-yellow-100 text-yellow-800"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 