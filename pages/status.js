import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  
  // Cash game specific states
  const [buyInDialogOpen, setBuyInDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [buyInAmount, setBuyInAmount] = useState('');
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [sessionUpdating, setSessionUpdating] = useState(false);
  
  const router = useRouter();

  // Check for admin role in multiple possible locations
  const isAdminRole = session?.user?.role === "ADMIN";
  
  // Custom hooks for all data and functionality
  const { loading: sessionLoading, sessionData, fetchSessionData } = useSessionData();
  const { 
    blindStructureData, 
    serverLevelIndex,
    updateBlindLevel
  } = useBlindStructure(sessionData, fetchSessionData);
  
  // Pass server index and specific session details to timer hook
  const { 
    timer, 
    formatTimer, 
    blindsLoading, 
    setBlindsLoading,
    displayedLevelIndex
  } = useTournamentTimer(
    blindStructureData,
    serverLevelIndex,
    sessionData?.session?.levelStartTime,
    sessionData?.session?.status,
    isAdminRole,
    updateBlindLevel
  );
  
  // Memoize the displayed structure level to prevent unnecessary recalculations
  const displayedStructureLevel = useMemo(() => 
    blindStructureData?.levels?.[displayedLevelIndex],
    [blindStructureData, displayedLevelIndex]
  );
  
  const { 
    payoutStructure,
    fetchPayoutStructureIfNeeded 
  } = usePayoutStructure();
  
  const { 
    removePlayer, 
    updatePlayerStatus, 
    handleBuyIn,
    handleCashGameBuyIn,
    handleCashOut,
    stopRegistration, 
    seatFromWaitlist 
  } = usePlayerService(fetchSessionData);

  const { toast } = useToast();
        
  const [isUpdating, setIsUpdating] = useState(false);
  
  // If active tournament, fetch payout structure based on entry count
  useEffect(() => {
    const sessionExists = sessionData?.exists;
    const sessionDetails = sessionData?.session;
    
    if (sessionExists && sessionDetails?.type === 'TOURNAMENT' && sessionDetails?.status === 'ACTIVE') {
      // Calculate entry count, ensuring we handle null/undefined safely
      const entryCount = sessionDetails.entries ?? 0;
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Status Page Effect] Calling fetchPayoutStructureIfNeeded with count: ${entryCount}`);
      }
      
      fetchPayoutStructureIfNeeded(entryCount);
    }
  }, [
       sessionData?.exists, 
       sessionData?.session?.type, 
       sessionData?.session?.status, 
       sessionData?.session?.entries,
       fetchPayoutStructureIfNeeded
     ]);

  // Only log in development to reduce performance impact
  if (process.env.NODE_ENV === 'development') {
    console.log('[Status Page Render] Loading:', sessionLoading);
    console.log('[Status Page Render] Session Exists:', sessionData?.exists);
    console.log('[Status Page Render] Raw sessionData.blindInfo:', sessionData?.blindInfo);
    console.log('[Status Page Render] Derived blindStructureData for Timer:', blindStructureData);
    console.log('[Status Page Render] Server Level Index:', serverLevelIndex);
    console.log('[Status Page Render] Displayed Level Index:', displayedLevelIndex);
    console.log('[Status Page Render] Displayed Structure Level:', displayedStructureLevel);
    console.log('[Status Page Render] Payout Structure:', payoutStructure);
  }

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
  const isCashGame = currentSession.type === 'CASH_GAME';
  const isActive = currentSession.status === 'ACTIVE';
  const isNotStarted = currentSession.status === 'NOT_STARTED';

  // Handler for buy-in dialog
  const openBuyInDialog = (player) => {
    setSelectedPlayer(player);
    setBuyInAmount('');
    setBuyInDialogOpen(true);
  };

  // Handler for cash-out dialog
  const openCashOutDialog = (player) => {
    setSelectedPlayer(player);
    setCashOutAmount('');
    setCashOutDialogOpen(true);
  };

  // Handler for submitting a buy-in
  const submitBuyIn = async () => {
    if (!buyInAmount || buyInAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid buy-in amount",
        variant: "destructive",
      });
      return;
    }
    
    setSessionUpdating(true);
    const success = await handleCashGameBuyIn(selectedPlayer, buyInAmount);
    if (success) {
      setBuyInDialogOpen(false);
    }
    setSessionUpdating(false);
  };

  // Handler for submitting a cash-out
  const submitCashOut = async () => {
    if (!cashOutAmount || cashOutAmount <= 0) {
        toast({
          title: "Error",
        description: "Please enter a valid cash-out amount",
          variant: "destructive",
        });
      return;
    }
    
    setSessionUpdating(true);
    const success = await handleCashOut(selectedPlayer, cashOutAmount);
    if (success) {
      setCashOutDialogOpen(false);
    }
    setSessionUpdating(false);
  };

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

  // Simple Buy-in Dialog
  const BuyInDialog = () => {
    // Create a ref for the input element
    const inputRef = useRef(null);
    
    // Focus the input when dialog opens
    useEffect(() => {
      if (buyInDialogOpen && inputRef.current) {
        // Set a small timeout to ensure DOM is ready
        setTimeout(() => {
          inputRef.current.focus();
        }, 50);
      }
    }, [buyInDialogOpen]);

    return buyInDialogOpen ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           onClick={(e) => {
             // Prevent closing when clicking inside the dialog
             if (e.target !== e.currentTarget) return;
             setBuyInDialogOpen(false);
           }}>
        <div className="bg-white p-4 rounded-md w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-medium mb-2">Add Buy-In</h3>
          
          <div className="mb-4">
            <input
              ref={inputRef}
              type="number"
              min="0"
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="Enter amount"
              // Prevent default behavior for up/down arrow keys
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                }
              }}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button 
              className="px-3 py-1 border border-gray-300 rounded"
              onClick={() => setBuyInDialogOpen(false)}
            >
              Cancel
            </button>
            <button 
              className="px-3 py-1 bg-blue-600 text-white rounded"
              onClick={submitBuyIn}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    ) : null;
  };

  // Simple Cash-out Dialog
  const CashOutDialog = () => {
    // Create a ref for the input element
    const inputRef = useRef(null);
    
    // Focus the input when dialog opens
    useEffect(() => {
      if (cashOutDialogOpen && inputRef.current) {
        // Set a small timeout to ensure DOM is ready
        setTimeout(() => {
          inputRef.current.focus();
        }, 50);
      }
    }, [cashOutDialogOpen]);
    
    return cashOutDialogOpen ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           onClick={(e) => {
             // Prevent closing when clicking inside the dialog
             if (e.target !== e.currentTarget) return;
             setCashOutDialogOpen(false);
           }}>
        <div className="bg-white p-4 rounded-md w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-medium mb-2">Process Cash-Out</h3>
          
          <div className="mb-4">
            <input
              ref={inputRef}
              type="number"
              min="0"
              value={cashOutAmount}
              onChange={(e) => setCashOutAmount(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="Enter amount"
              // Prevent default behavior for up/down arrow keys
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                }
              }}
            />
          </div>
          
          {selectedPlayer && (
            <div className="text-sm mb-4">
              <p>Total Buy-In: ${selectedPlayer.buyInTotal || 0}</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button 
              className="px-3 py-1 border border-gray-300 rounded"
              onClick={() => setCashOutDialogOpen(false)}
            >
              Cancel
            </button>
            <button 
              className="px-3 py-1 bg-blue-600 text-white rounded"
              onClick={submitCashOut}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    ) : null;
  };

  // Make sure the component registers "Finished" players for cash games
  let finishedPlayers = [];
  if (isCashGame && currentSession.registrations) {
    finishedPlayers = currentSession.registrations.finished || [];
  }

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
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-medium">
                  {currentSession.currentPlayersCount}/{currentSession.maxPlayers}
                </p>
              </div>
              <p className="text-xl text-muted-foreground">{isActive ? "Current Players" : "Registered Players"}</p>
            </div>
            
                <div>
              <p className="text-2xl font-medium">{currentSession.waitlistedPlayersCount || 0}</p>
              <p className="text-xl text-muted-foreground">Waitlisted</p>
                </div>
                
            {isTournament && (
              <>
                <div>
                  <p className="text-2xl font-medium">{currentSession.entries || 0}</p>
                  <p className="text-xl text-muted-foreground">Total Entries</p>
                </div>
                
                <div>
                  <p className="text-2xl font-medium">{currentSession.eliminatedPlayersCount || 0}</p>
                  <p className="text-xl text-muted-foreground">Eliminated</p>
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
              </div>
            </div>
          )}
          
          {/* Tournament timer component */}
          {isTournament && isActive && (
            <TournamentTimer
              formatTimer={formatTimer}
              blindStructureData={{ ...blindStructureData, currentLevel: displayedStructureLevel, currentLevelIndex: displayedLevelIndex }}
              isAdmin={isAdminRole}
              blindsLoading={blindsLoading}
              currentSession={currentSession}
              updateBlindLevel={updateBlindLevel}
            />
          )}
          
          {/* In The Money Section with Empty Slots */}
          {isTournament && (
            <div className="mt-6">
              <h3 className="font-medium text-lg mb-3">In The Money</h3>
              
              {(() => {
                // Ensure payoutStructure is checked for null before accessing tiers
                if (!payoutStructure) {
                  return <p className="text-muted-foreground text-sm">Loading payout data...</p>;
                }
                
                // Get number of payout positions
                let payoutPositions = 0;
                if (payoutStructure.tiers && payoutStructure.tiers.length > 0) {
                  payoutPositions = Math.max(
                    ...payoutStructure.tiers.map(tier => tier.position)
                  );
                }
                
                // If no payout structure available yet
                if (payoutPositions === 0) {
                  return (
                    <p className="text-muted-foreground text-sm">Payout positions will appear once the structure is set</p>
                  );
                }
                
                // Create array of payout slots
                const payoutSlots = Array.from({ length: payoutPositions }, (_, i) => {
                  // Position in reverse order - start with position 1 at index 0
                  const position = payoutPositions - i;
                  
                  // Find prize amount for this position
                  let prize = 0;
                  const tier = payoutStructure.tiers.find(t => t.position === position);
                  if (tier) {
                    const totalPrize = currentSession.buyIn * (currentSession.entries || 0);
                    prize = Math.floor(totalPrize * (tier.percentage / 100));
                  }
                  
                  // Find if there's a player in this position
                  // (Players are assigned from bottom up)
                  const playersInITM = currentSession.registrations.itm || [];
                  const itmCount = playersInITM.length;
                  
                  // Match player to this position if available
                  // If we have 3 positions (1,2,3) and 1 player in ITM, that player goes to position 3
                  // If we have 3 positions and 2 players in ITM, they go to positions 3 and 2
                  let playerIndex = null;
                  if (position > payoutPositions - itmCount) {
                    // Calculate index in the ITM array
                    playerIndex = itmCount - (payoutPositions - position) - 1;
                  }
                  
                  // Return slot info with player if assigned
                  return {
                    position,
                    prize,
                    player: playerIndex !== null && playerIndex >= 0 ? playersInITM[playerIndex] : null
                  };
                });
                
                // Render slots
                return (
                  <div className="border rounded-md overflow-hidden">
                    <ul className="divide-y">
                      {payoutSlots
                        .sort((a, b) => a.position - b.position) // Sort by position so 1st place is at the top
                        .map((slot) => (
                        <li key={`place-${slot.position}`} className="p-3 flex items-center justify-between">
                          {/* Left side - Place and player info */}
                          <div className="flex items-center space-x-3">
                            {/* Place number */}
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                              {slot.position}
                  </div>
                  
                            {slot.player ? (
                              <>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={slot.player.user?.image} alt={slot.player.user?.name} />
                                  <AvatarFallback className="bg-blue-100 text-blue-800">
                                    {slot.player.user?.firstName || slot.player.user?.lastName 
                                      ? `${slot.player.user.firstName?.[0] || ''}${slot.player.user.lastName?.[0] || ''}`.toUpperCase() 
                                      : getInitials(slot.player.user?.name || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {(slot.player.user?.firstName || slot.player.user?.lastName) 
                                      ? `${slot.player.user.firstName || ''} ${slot.player.user.lastName || ''}`.trim() 
                                      : slot.player.user?.name || 'Unknown Player'}
                                  </p>
                                  <div className="flex flex-col gap-1">
                                    {slot.player.rebuys > 0 && (
                                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                        {slot.player.rebuys} {slot.player.rebuys === 1 ? 'buy-in' : 'buy-ins'}
                                      </span>
                                    )}
                                    {/* Display Venmo ID for admins */}
                                    {isAdmin && slot.player.user?.venmoId && (
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full flex items-center">
                                        <span className="font-medium">Venmo:</span> 
                                        <span className="ml-1">{slot.player.user.venmoId}</span>
                                      </span>
                                    )}
                    </div>
                    </div>
                </>
              ) : (
                              <div className="text-muted-foreground text-sm ml-2">
                                {slot.position === 1
                                  ? "1st Place (Winner)"
                                  : `${slot.position}${getOrdinalSuffix(slot.position)} Place`} 
            </div>
          )}
                </div>
                          
                          {/* Right side - Prize and action buttons */}
                          <div className="flex items-center">
                            {/* Prize amount */}
                            <div className="mr-2 text-sm font-medium text-green-600">
                              ${slot.prize}
                </div>
                            
                            {/* Return button (only for filled slots) */}
                            {isAdmin && slot.player && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updatePlayerStatus(slot.player.id, 'ELIMINATED')}
                                title="Return player to eliminated players"
                              >
                                Return
                              </Button>
                            )}
                    </div>
                        </li>
                      ))}
                    </ul>
                    </div>
                );
              })()}
            </div>
          )}
          
          {/* Participants lists - shown to all users, but only admins see action buttons */}
          <div className="border-t pt-4 mt-6">
              <h3 className="font-medium text-lg mb-3">Participants</h3>
              
              <PlayerList 
                players={currentSession.registrations.current}
                title="Current Players"
                emptyMessage="No active players currently at the table"
                colorClass="bg-green-100 text-green-800"
                isAdmin={isAdmin}
                removePlayer={isAdmin ? removePlayer : null}
                isCashGame={isCashGame}
                actions={isAdmin ? [
                  ...(isTournament ? [{
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
                  }] : []),
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
                  } : null,
                  // Cash game specific buttons
                  ...(isCashGame ? [
                    {
                      label: "Buy-in",
                      variant: "default",
                      title: "Add a buy-in for this player",
                      onClick: (registration) => openBuyInDialog(registration)
                    },
                    {
                      label: "Cash-out",
                      variant: "outline",
                      title: "Process cash-out for this player",
                      onClick: (registration) => openCashOutDialog(registration)
                    },
                    {
                      label: "Finish",
                      variant: "outline",
                      title: "Move player to finished players",
                      onClick: (registration) => updatePlayerStatus(registration.id, 'FINISHED')
                    }
                  ] : [])
                ].filter(Boolean) : []}
              />
              
                <PlayerList 
                players={currentSession.registrations.waitlist}
                title="Waitlist"
                emptyMessage="No players on the waitlist"
                colorClass="bg-yellow-100 text-yellow-800"
                isAdmin={isAdmin}
                isCashGame={isCashGame}
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
            
              {/* Finished players section - show for cash games */}
              {isCashGame && (
                <PlayerList
                  players={finishedPlayers}
                  title="Finished Players"
                  emptyMessage="No finished players yet"
                  colorClass="bg-blue-100 text-blue-800"
                  isAdmin={isAdmin}
                  isCashGame={isCashGame}
                  removePlayer={isAdmin ? removePlayer : null}
                  actions={isAdmin ? [
                    {
                      label: "Return",
                      variant: "outline",
                      title: "Return player to active players",
                      onClick: (registration) => updatePlayerStatus(registration.id, 'ACTIVE')
                    },
                    {
                      label: "Cash-out",
                      variant: "default",
                      title: "Update cash-out amount",
                      onClick: (registration) => openCashOutDialog(registration)
                    }
                  ] : []}
                />
              )}
              
              {isTournament && currentSession.registrations.eliminated && (
              <PlayerList 
                players={currentSession.registrations.eliminated}
                title="Eliminated"
                emptyMessage="No eliminated players yet"
                colorClass="bg-red-100 text-red-800"
                isAdmin={isAdmin}
                isCashGame={isCashGame}
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
          </div>
          
          {/* Payout structure component */}
          {isTournament && (
            <div className="mt-6">
              <PayoutStructure 
                shouldShowPayouts={true}
                payoutStructure={payoutStructure} 
                currentSession={currentSession}
                isAdmin={isAdminRole}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add the dialogs */}
      <ConfirmationDialog />
      <BuyInDialog />
      <CashOutDialog />
    </div>
  );
} 