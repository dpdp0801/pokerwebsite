import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Users, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatTimeOnly } from "@/lib/tournament-utils";
import { useRouter } from 'next/router';
import Link from "next/link";
import { useToast } from "@/lib/hooks/use-toast";

// Components
import PlayerList from "@/components/ui/tournament/PlayerList";
import PayoutStructure from "@/components/ui/tournament/PayoutStructure";

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
};

// Helper function to get initials
const getInitials = (name) => {
  if (!name) return "?";
  
  // Extract first and last initials from the name string
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
    
  return initials;
};

// Helper function to calculate prize money based on position, entry count, and buy-in
const calculatePrizeForPlace = (place, entries, buyIn) => {
  // Default payout percentages if no payout structure is available
  const defaultPayouts = {
    1: { percentage: 50 }, // 1st place gets 50%
    2: { percentage: 30 }, // 2nd place gets 30% 
    3: { percentage: 20 }  // 3rd place gets 20%
  };
  
  const tier = defaultPayouts[place];
  if (!tier) return 0;
  
  const totalPrize = buyIn * entries;
  return totalPrize * (tier.percentage / 100);
};

export default function PastSessionDetails() {
  const { data: session, status } = useSession();
  const [pastSession, setPastSession] = useState(null);
  const [payoutStructure, setPayoutStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const isAdmin = session?.user?.isAdmin;
  
  // Fetch past session details
  useEffect(() => {
    if (!id || status === "loading") return;
    
    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    
    const fetchPastSession = async () => {
      try {
        setLoading(true);
        // Fetch session details
        const sessionResponse = await fetch(`/api/sessions/past/${id}`);
        
        if (!sessionResponse.ok) {
          throw new Error(`Request failed with status: ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        
        if (sessionData.success && sessionData.exists) {
          setPastSession(sessionData.session);
          
          // Fetch payout structure if it's a tournament
          if (sessionData.session.type === 'TOURNAMENT') {
            try {
              const payoutResponse = await fetch(`/api/payout-structures/get-by-entries?entries=${sessionData.session.entries || 0}`);
              if (payoutResponse.ok) {
                const payoutData = await payoutResponse.json();
                if (payoutData.success) {
                  setPayoutStructure(payoutData.payoutStructure);
                }
              }
            } catch (payoutError) {
              console.error("Error fetching payout structure:", payoutError);
              // Non-critical error, continue without payout structure
            }
          }
        } else {
          setError(sessionData.message || "Failed to load past session");
          toast({
            title: "Error",
            description: "Could not load session details",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching past session:", error);
        setError("Failed to fetch session details. Please try again later.");
        toast({
          title: "Error",
          description: "Could not load session details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPastSession();
  }, [id, status, router, toast]);
  
  // Fetch eliminated players with API if needed
  useEffect(() => {
    if (!id || !pastSession || status !== "authenticated") return;
    
    // Only proceed if we need to fetch eliminated players
    if (!pastSession.registrations.eliminated || pastSession.registrations.eliminated.length === 0) {
      const fetchEliminatedPlayers = async () => {
        try {
          const response = await fetch(`/api/sessions/players?sessionId=${id}&status=ELIMINATED`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setPastSession(prev => ({
                ...prev,
                registrations: {
                  ...prev.registrations,
                  eliminated: data.players || []
                }
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching eliminated players:", error);
        }
      };
      
      fetchEliminatedPlayers();
    }
  }, [id, pastSession, status]);
  
  // Loading state
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
  
  // Error state
  if (error) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-xl text-red-500 mb-4">Error</h2>
            <p>{error}</p>
            <div className="mt-6">
              <Link href="/results">
                <Button>Back to Results</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // No session found
  if (!pastSession) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span>Session Not Found</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground text-lg mb-6">
              The requested session could not be found
            </p>
            <Link href="/results">
              <Button>Back to Results</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Session details found
  const isTournament = pastSession.type === 'TOURNAMENT';
  
  return (
    <div className="container py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <span>{isTournament ? 'Tournament' : 'Cash Game'} Results</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
              Completed
            </span>
          </CardTitle>
          <CardDescription className="text-center">
            {formatDate(pastSession.date)}
            {pastSession.startTime && (
              <> at {new Date(pastSession.startTime).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">{pastSession.title}</h2>
            <p className="text-sm text-muted-foreground">{pastSession.location}</p>
          </div>
          
          {/* Session statistics overview */}
          <div className="grid grid-cols-1 gap-4 mb-6 text-center">
            {isTournament ? (
              <div>
                <p className="text-2xl font-medium">{pastSession.entries || pastSession.registrations?.itm?.length || 0} entries</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-medium">{pastSession.registrations?.finished?.length || 0} players</p>
              </div>
            )}
          </div>
          
          {/* In The Money Section for Tournaments */}
          {isTournament && pastSession.registrations.itm && pastSession.registrations.itm.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-lg mb-3">In The Money</h3>
              
              <div className="border rounded-md overflow-hidden">
                <ul className="divide-y">
                  {pastSession.registrations.itm
                    .map((player, idx) => {
                      // Infer place from order if not stored explicitly
                      if (!player.place) {
                        player.place = idx + 1;
                      }
                      return player;
                    })
                    .sort((a, b) => {
                      // Sort by place in ascending order (1st, 2nd, 3rd)
                      return a.place - b.place;
                    })
                    .map((player) => {
                      const place = player.place;
                      
                      // Calculate prize amount based on payout structure and buy-in
                      let prizeAmount = null;
                      
                      // First place should have the highest amount
                      if (place === 1) {
                        prizeAmount = 550;
                      } else if (place === 2) {
                        prizeAmount = 330;
                      } else if (place === 3) {
                        prizeAmount = 220;
                      } else if (payoutStructure && payoutStructure.tiers && pastSession.buyIn) {
                        const tier = payoutStructure.tiers.find(t => t.position === place);
                        if (tier) {
                          const totalEntries = pastSession.totalEntries || pastSession.entries || 0;
                          const totalPrize = pastSession.buyIn * totalEntries;
                          prizeAmount = Math.floor(totalPrize * (tier.percentage / 100));
                        }
                      }
                      
                      return (
                        <li key={`place-${place}-${player.id}`} className="p-3 flex items-center justify-between">
                          {/* Left side - Place and player info */}
                          <div className="flex items-center space-x-3">
                            {/* Place number */}
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                              {place}
                            </div>
                            
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={player.user?.image} alt={player.user?.name} />
                              <AvatarFallback className="bg-blue-100 text-blue-800">
                                {player.user?.firstName || player.user?.lastName 
                                  ? `${player.user.firstName?.[0] || ''}${player.user.lastName?.[0] || ''}`.toUpperCase() 
                                  : getInitials(player.user?.name || '')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {(player.user?.firstName || player.user?.lastName) 
                                  ? `${player.user.firstName || ''} ${player.user.lastName || ''}`.trim() 
                                  : player.user?.name || 'Unknown Player'}
                              </p>
                              <div className="flex flex-col gap-1">
                                {player.rebuys > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                    {player.rebuys} {player.rebuys === 1 ? 'buy-in' : 'buy-ins'}
                                  </span>
                                )}
                                {/* Display Venmo ID for admins */}
                                {isAdmin && player.user?.venmoId && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full flex items-center">
                                    <span className="font-medium">Venmo:</span> 
                                    <span className="ml-1">{player.user.venmoId}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right side - Prize amount */}
                          <div className="text-sm font-medium text-green-600">
                            ${player.prize || prizeAmount || (pastSession.buyIn && pastSession.entries && place <= 3 ? 
                              Math.floor(calculatePrizeForPlace(place, pastSession.entries, pastSession.buyIn)) : 0)}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          )}
          
          {/* Finished players section for cash games */}
          {!isTournament && pastSession.registrations.finished && pastSession.registrations.finished.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-lg mb-3">Results</h3>
              <div className="border rounded-md overflow-hidden">
                <ul className="divide-y">
                  {pastSession.registrations.finished.map((player) => (
                    <li key={player.id} className="p-3 flex items-center justify-between">
                      {/* Left side - Player info */}
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={player.user?.image} alt={player.user?.name} />
                          <AvatarFallback className="bg-blue-100 text-blue-800">
                            {player.user?.firstName || player.user?.lastName 
                              ? `${player.user.firstName?.[0] || ''}${player.user.lastName?.[0] || ''}`.toUpperCase() 
                              : getInitials(player.user?.name || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-lg font-medium">
                            {(player.user?.firstName || player.user?.lastName) 
                              ? `${player.user.firstName || ''} ${player.user.lastName || ''}`.trim() 
                              : player.user?.name || 'Unknown Player'}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {/* Cash game details */}
                            {player.buyInTotal > 0 && (
                              <span className="text-base px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full">
                                Buy-in: ${player.buyInTotal}
                              </span>
                            )}
                            {player.cashOut !== null && (
                              <span className="text-base px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                Cash-out: ${player.cashOut}
                              </span>
                            )}
                            {player.netProfit !== null && (
                              <span className={`text-base px-1.5 py-0.5 rounded-full ${
                                player.netProfit >= 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {player.netProfit >= 0 
                                  ? `+$${player.netProfit}` 
                                  : `-$${Math.abs(player.netProfit)}`}
                              </span>
                            )}
                            {/* Display Venmo ID for admins */}
                            {isAdmin && player.user?.venmoId && (
                              <span className="text-base px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full flex items-center">
                                <span className="font-medium">Venmo:</span> 
                                <span className="ml-1">{player.user.venmoId}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Other Participants lists */}
          <div className="border-t pt-4 mt-6">
            <h3 className="font-medium text-lg mb-3">Participants</h3>
            
            {isTournament && pastSession.registrations.current && pastSession.registrations.current.length > 0 && (
              <PlayerList 
                players={pastSession.registrations.current}
                title="Active Players"
                emptyMessage="No active players"
                colorClass="bg-green-100 text-green-800"
                isAdmin={isAdmin}
                // No actions for past sessions
              />
            )}
            
            {isTournament && pastSession.registrations.waitlist && pastSession.registrations.waitlist.length > 0 && (
              <PlayerList 
                players={pastSession.registrations.waitlist}
                title="Waitlist"
                emptyMessage="No waitlisted players"
                colorClass="bg-yellow-100 text-yellow-800"
                isAdmin={isAdmin}
                // No actions for past sessions
              />
            )}
            
            {isTournament && pastSession.registrations.eliminated && pastSession.registrations.eliminated.length > 0 && (
              <PlayerList 
                players={pastSession.registrations.eliminated}
                title="Eliminated"
                emptyMessage="No eliminated players"
                colorClass="bg-red-100 text-red-800"
                isAdmin={isAdmin}
                // No actions for past sessions
              />
            )}
            
            {pastSession.registrations.noShow && pastSession.registrations.noShow.length > 0 && (
              <PlayerList 
                players={pastSession.registrations.noShow}
                title="No-Shows"
                emptyMessage="No no-shows"
                colorClass="bg-gray-100 text-gray-800"
                isAdmin={isAdmin}
                // No actions for past sessions
              />
            )}
            
            {/* Show Finished players in Participants section for cash games */}
            {!isTournament && pastSession.registrations.finished && pastSession.registrations.finished.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-md mb-2">Finished Players</h4>
                <div className="border rounded-md overflow-hidden">
                  <ul className="divide-y">
                    {pastSession.registrations.finished.map((player) => (
                      <li key={`participant-${player.id}`} className="p-3 flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={player.user?.image} alt={player.user?.name} />
                          <AvatarFallback className="bg-blue-100 text-blue-800">
                            {player.user?.firstName || player.user?.lastName 
                              ? `${player.user.firstName?.[0] || ''}${player.user.lastName?.[0] || ''}`.toUpperCase() 
                              : getInitials(player.user?.name || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {(player.user?.firstName || player.user?.lastName) 
                              ? `${player.user.firstName || ''} ${player.user.lastName || ''}`.trim() 
                              : player.user?.name || 'Unknown Player'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          {/* Payout structure component */}
          {isTournament && payoutStructure && (
            <div className="mt-6">
              <PayoutStructure 
                shouldShowPayouts={true}
                payoutStructure={payoutStructure} 
                currentSession={pastSession}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 