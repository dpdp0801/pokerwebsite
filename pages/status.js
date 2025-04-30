import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/lib/hooks/use-toast";
import { formatDate, formatTimeOnly, shouldShowPayouts } from "@/lib/tournament-utils";
import { useRouter } from 'next/router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowRight,
  Calendar,
  Filter,
  User,
} from "lucide-react";

// Custom hooks
import useSessionData from "@/hooks/useSessionData";
import useBlindStructure from "@/hooks/useBlindStructure";
import useTournamentTimer from "@/hooks/useTournamentTimer";
import usePayoutStructure from "@/hooks/usePayoutStructure";
import { usePlayerService } from "@/lib/services/player-service";

// Components
import PlayerList from "@/components/ui/tournament/PlayerList";
import TournamentTimer from "@/components/ui/tournament/TournamentTimer";
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

// Helper function to calculate prize amount
const calculatePrizeAmount = (percentage, buyIn, entries) => {
  if (!percentage || !buyIn || !entries) return "0";
  
  const totalPrizePool = buyIn * entries;
  const amount = (totalPrizePool * (percentage / 100)).toFixed(0);
  return amount;
};

export default function Status() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;
  const [loading, setLoading] = useState(true);
  const [currentBlindLevel, setCurrentBlindLevel] = useState(0);
  const [blindStructure, setBlindStructure] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Check for admin role in multiple possible locations
  const isAdminRole = 
    session?.user?.isAdmin === true || 
    session?.role === "ADMIN" || 
    session?.user?.role === "ADMIN";
  
  // Custom hooks for all data and functionality
  const { loading: sessionLoading, sessionData, fetchSessionData } = useSessionData();
  const { 
    blindStructureData, 
    fetchBlindStructureIfNeeded,
    updateBlindLevel
  } = useBlindStructure(sessionData, fetchSessionData);
  
  const { timer, formatTimer, blindsLoading, setBlindsLoading } = useTournamentTimer(
    blindStructureData, 
    sessionData, 
    isAdmin,
    updateBlindLevel
  );
  
  const { 
    payoutStructure,
    fetchPayoutStructureIfNeeded 
  } = usePayoutStructure();
  
  const { 
    removePlayer, 
    updatePlayerStatus, 
    handleBuyIn, 
    stopRegistration, 
    seatFromWaitlist 
  } = usePlayerService(fetchSessionData);

  const { toast } = useToast();
        
  // If active tournament, fetch blind structure and payout structure
  useEffect(() => {
    if (sessionData.exists && sessionData.session.type === 'TOURNAMENT' && sessionData.session.status === 'ACTIVE') {
      fetchBlindStructureIfNeeded(sessionData.session.id, sessionData.session.currentBlindLevel);
      fetchPayoutStructureIfNeeded(sessionData.session.totalEntries || sessionData.session.registeredPlayers);
    }
  }, [sessionData]);

  // Loading state
  if (sessionLoading) {
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

  // No active session
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

  // Session exists
  const currentSession = sessionData.session;
  const isTournament = currentSession.type === 'TOURNAMENT';
  const isActive = currentSession.status === 'ACTIVE';
  const isNotStarted = currentSession.status === 'NOT_STARTED';

  // Add the confirmation dialog component
  const ConfirmationDialog = () => {
    if (!confirmOpen) return null;
    
    return (
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>{confirmMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                confirmAction && confirmAction();
                setConfirmOpen(false);
              }}
              disabled={sessionUpdating}
            >
              {sessionUpdating ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

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
            {currentSession.registrationClosed && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Registration Closed
                </span>
              </div>
            )}
          </div>
          
          {/* Session statistics overview */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-center">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-xl font-medium">
                  {currentSession.currentPlayersCount}/{currentSession.maxPlayers}
                </p>
              </div>
              <p className="text-muted-foreground">{isActive ? "Current Players" : "Registered Players"}</p>
            </div>
            
            <div>
              <p className="text-xl font-medium">{currentSession.waitlistedPlayersCount || 0}</p>
              <p className="text-muted-foreground">Waitlisted</p>
            </div>
            
            {isTournament && (
              <>
                <div>
                  <p className="text-xl font-medium">{currentSession.totalEntries || 0}</p>
                  <p className="text-muted-foreground">Total Entries</p>
                </div>
                
                <div>
                  <p className="text-xl font-medium">{currentSession.eliminatedPlayersCount || 0}</p>
                  <p className="text-muted-foreground">Eliminated</p>
                </div>
              </>
            )}
          </div>
          
          {/* Admin Panel */}
          {session?.user?.isAdmin && sessionData?.session && (
            <div className="space-y-4 mt-6">
              <div>
                <h3 className="text-lg font-medium">Admin Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-2">
                  {/* Close Registration Button */}
                  {!currentSession.registrationClosed && (
                    <Button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to close registration? This will prevent new registrations.")) {
                          stopRegistration(currentSession.id);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full bg-red-50 hover:bg-red-100 border-red-200"
                    >
                      Close Registration
                    </Button>
                  )}
                </div>
                
                {/* Debug Tools - Only visible to admins */}
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs text-muted-foreground">Debug Tools</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/debug-session');
                          if (res.ok) {
                            const data = await res.json();
                            toast.success("Debug data saved. Check console.");
                            console.log("Session Debug Data:", data);
                            // Open the debug data in a new tab
                            window.open(`/debug/session-debug.json`, '_blank');
                          } else {
                            toast.error("Failed to save debug data");
                          }
                        } catch (error) {
                          console.error("Debug error:", error);
                          toast.error("Error generating debug data");
                        }
                      }}
                    >
                      Debug Session Data
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>waitlisted: {JSON.stringify(currentSession.registrations.waitlisted?.length)}</p>
                    <p>waitlist: {JSON.stringify(currentSession.registrations.waitlist?.length)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tournament timer component */}
          {isTournament && isActive && (
            <TournamentTimer
              formatTimer={formatTimer}
              blindStructureData={blindStructureData}
              isAdmin={isAdmin}
              blindsLoading={blindsLoading}
              currentSession={currentSession}
              updateBlindLevel={updateBlindLevel}
            />
          )}
          
          {/* Payout structure component */}
          {isTournament && isActive && (
            <PayoutStructure 
              shouldShowPayouts={shouldShowPayouts(blindStructureData, currentSession)}
              payoutStructure={payoutStructure} 
              currentSession={currentSession}
              isAdmin={isAdmin}
            />
          )}
          
          {/* Participants lists - shown to all users, but only admins see action buttons */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-lg mb-3">Participants</h3>
              
              <PlayerList 
                players={currentSession.registrations.current}
                title={
                  (() => {
                    // See if we're in ITM mode
                    let payoutPositions = 0;
                    if (payoutStructure && payoutStructure.tiers) {
                      payoutPositions = Math.max(
                        ...payoutStructure.tiers.map(tier => tier.position)
                      );
                    }
                    
                    const isITMMode = 
                      currentSession.registrationClosed && 
                      payoutPositions > 0 && 
                      currentSession.currentPlayersCount <= payoutPositions;
                    
                    return (
                      <div className="flex items-center">
                        <span>Current Players</span>
                        {isITMMode && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            ITM Mode
                          </span>
                        )}
                      </div>
                    );
                  })()
                }
                emptyMessage="No active players currently at the table"
                colorClass="bg-green-100 text-green-800"
                isAdmin={isAdmin}
                removePlayer={isAdmin ? removePlayer : null}
                actions={isAdmin ? [
                  {
                    label: "Eliminate",
                    variant: "outline",
                    title: "Move player to eliminated",
                    onClick: (registration) => {
                      // Get payout positions from the payout structure
                      let payoutPositions = 0;
                      if (payoutStructure && payoutStructure.tiers) {
                        // Find the max position from the tiers
                        payoutPositions = Math.max(
                          ...payoutStructure.tiers.map(tier => tier.position)
                        );
                      }
                      
                      // Get current number of players
                      const currentPlayerCount = currentSession.currentPlayersCount;
                      
                      // Registration must be closed to use ITM
                      const isRegistrationClosed = currentSession.registrationClosed;
                      
                      // Debug info
                      console.log("Eliminate clicked:", {
                        currentPlayerCount,
                        payoutPositions,
                        isRegistrationClosed
                      });
                      
                      // If we've reached ITM criteria, place directly in ITM
                      if (isRegistrationClosed && 
                          payoutPositions > 0 && 
                          currentPlayerCount <= payoutPositions) {
                        console.log("Placing player in ITM");
                        updatePlayerStatus(registration.id, 'ITM');
                      } else {
                        // Standard elimination
                        updatePlayerStatus(registration.id, 'ELIMINATED');
                      }
                    }
                  },
                  {
                    label: "Waitlist",
                    variant: "outline",
                    title: "Move player to waitlist",
                    onClick: (registration) => updatePlayerStatus(registration.id, 'WAITLIST')
                  },
                  isTournament ? {
                    label: "Buy-in",
                    variant: "default",
                    title: "Process a buy-in for this player",
                    disabled: isSubmitting,
                    onClick: (registration) => handleBuyIn(registration, setIsSubmitting)
                  } : null
                ].filter(Boolean) : []}
              />
              
              <PlayerList 
                players={currentSession.registrations.waitlist}
                title="Waitlist"
                emptyMessage="No players on the waitlist"
                colorClass="bg-yellow-100 text-yellow-800"
                isAdmin={isAdmin}
                removePlayer={isAdmin ? removePlayer : null}
                actions={isAdmin ? [
                  {
                    label: "Seat",
                    variant: "default",
                    title: "Seat player from waitlist",
                    onClick: (registration) => seatFromWaitlist(registration.id)
                  }
                ] : []}
              />
              
              {isTournament && currentSession.registrations.eliminated && (
                <PlayerList 
                  players={currentSession.registrations.eliminated}
                  title="Eliminated"
                  emptyMessage="No eliminated players yet"
                  colorClass="bg-red-100 text-red-800"
                  isAdmin={isAdmin}
                  removePlayer={isAdmin ? removePlayer : null}
                  actions={isAdmin ? [
                    {
                      label: "Return",
                      variant: "outline",
                      title: "Return player to active players",
                      onClick: (registration) => updatePlayerStatus(registration.id, 'ACTIVE')
                    },
                    {
                      label: "ITM",
                      variant: "default",
                      title: "Mark player as In The Money",
                      onClick: (registration) => updatePlayerStatus(registration.id, 'ITM')
                    }
                  ] : []}
                />
              )}
              
              {isTournament && currentSession.registrations.itm && (
                <PlayerList 
                  players={currentSession.registrations.itm.map((player, index) => {
                    // Calculate player position (bottom-up assignment)
                    // Last player gets 1st, second-to-last gets 2nd, etc.
                    const itmCount = currentSession.registrations.itm.length;
                    const position = itmCount - index;
                    
                    // Find the corresponding payout tier if available
                    let payoutInfo = "";
                    if (payoutStructure && payoutStructure.tiers && payoutStructure.tiers.length > 0) {
                      const tier = payoutStructure.tiers.find(t => t.position === position);
                      
                      if (tier) {
                        const percentage = tier.percentage;
                        const totalPrize = currentSession.buyIn * (currentSession.totalEntries || 0);
                        const amount = Math.floor(totalPrize * (percentage / 100));
                        payoutInfo = ` - ${position}${getOrdinalSuffix(position)} Place ($${amount})`;
                      }
                    }
                    
                    // Format display name with place and payout
                    const displayName = player.user 
                      ? `${player.user.name || player.user.email}${payoutInfo}`
                      : `Unknown Player${payoutInfo}`;
                    
                    return {
                      ...player,
                      displayName
                    };
                  })}
                  title="In The Money"
                  emptyMessage="No players in the money yet"
                  colorClass="bg-blue-100 text-blue-800"
                  isAdmin={isAdmin}
                  removePlayer={isAdmin ? removePlayer : null}
                  actions={isAdmin ? [
                    {
                      label: "Return",
                      variant: "outline",
                      title: "Return player to eliminated players",
                      onClick: (registration) => updatePlayerStatus(registration.id, 'ELIMINATED')
                    }
                  ] : []}
                />
              )}
            </div>
        </CardContent>
      </Card>
      
      {/* Add the confirmation dialog */}
      <ConfirmationDialog />
    </div>
  );
} 