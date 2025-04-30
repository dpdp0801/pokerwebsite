import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, UserPlus, Clock, DollarSign, Play, CheckCircle, X } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/lib/hooks/use-toast";
import { formatDate, formatTimeOnly, shouldShowPayouts } from "@/lib/tournament-utils";
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import Tooltip from '@/components/tooltip'
import useUserSettings from '@/hooks/useUserSettings'
import useTournamentSession from '@/hooks/useTournamentSession'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export default function Status() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentBlindLevel, setCurrentBlindLevel] = useState(0);
  const [blindStructure, setBlindStructure] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionUpdating, setSessionUpdating] = useState(false);
  const [showBlindsDialog, setShowBlindsDialog] = useState(false);
  const [showPayoutsDialog, setShowPayoutsDialog] = useState(false);
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
    markNoShow, 
    updatePlayerStatus, 
    handleBuyIn, 
    stopRegistration, 
    seatFromWaitlist 
  } = usePlayerService(fetchSessionData);

  const { toast } = useToast();
        
  // Function to update session status
  const updateSessionStatus = async (newStatus) => {
    setSessionUpdating(true);
    try {
      const response = await fetch('/api/admin/session/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionData.session.id,
          status: newStatus
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update session status');
      }

      await fetchSessionData();
      
      const statusMessages = {
        'ACTIVE': 'Session has been started successfully',
        'FINISHED': 'Session has been marked as finished',
        'CANCELLED': 'Session has been cancelled'
      };
      
      toast.success(statusMessages[newStatus] || 'Session status updated successfully');
    } catch (error) {
      console.error('Error updating session status:', error);
      toast.error(error.message || 'Failed to update session status');
    } finally {
      setSessionUpdating(false);
      setConfirmOpen(false);
    }
  };

  // Function to set up and show confirmation
  const confirmSessionStatusChange = (status, message) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => updateSessionStatus(status));
    setConfirmOpen(true);
  };
        
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

  // Add handler functions for session status changes near other handler functions
  const handleStartSession = async () => {
    setSessionUpdating(true);
    try {
      const response = await fetch(`/api/sessions/${sessionData.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start session');
      }

      await fetchSessionData();
      toast.success('Session started successfully');
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error(error.message || 'Failed to start session');
    } finally {
      setSessionUpdating(false);
    }
  };

  const handleFinishSession = async () => {
    setSessionUpdating(true);
    try {
      const response = await fetch(`/api/sessions/${sessionData.id}/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to finish session');
      }

      await fetchSessionData();
      toast.success('Session finished successfully');
    } catch (error) {
      console.error('Error finishing session:', error);
      toast.error(error.message || 'Failed to finish session');
    } finally {
      setSessionUpdating(false);
    }
  };

  const handleCancelSession = async () => {
    setSessionUpdating(true);
    try {
      const response = await fetch(`/api/sessions/${sessionData.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel session');
      }

      await fetchSessionData();
      toast.success('Session cancelled successfully');
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error(error.message || 'Failed to cancel session');
    } finally {
      setSessionUpdating(false);
    }
  };

  const confirmSessionAction = (action, message) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <Button
                    onClick={() => router.push("/registration?sessionId=" + sessionData.session.id)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Players
                  </Button>
                  
                  <Button
                    onClick={() => setShowBlindsDialog(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    View Blinds
                  </Button>
                  
                  <Button
                    onClick={() => setShowPayoutsDialog(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    View Payouts
                  </Button>
                </div>
              </div>

              {/* Session Status Controls */}
              <div>
                <h3 className="text-lg font-medium">Session Status Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  {/* Start Session Button - Show only if session is SCHEDULED */}
                  {sessionData?.session?.status === "SCHEDULED" && (
                    <Button
                      onClick={() => 
                        confirmSessionAction(
                          handleStartSession, 
                          "Are you sure you want to start this session? This will mark the session as active."
                        )
                      }
                      variant="outline"
                      size="sm"
                      className="w-full bg-green-50 hover:bg-green-100 border-green-200"
                      disabled={sessionUpdating}
                    >
                      <Play className="mr-2 h-4 w-4 text-green-600" />
                      Start Session
                    </Button>
                  )}
                  
                  {/* Finish Session Button - Show only if session is ACTIVE */}
                  {sessionData?.session?.status === "ACTIVE" && (
                    <Button
                      onClick={() => 
                        confirmSessionAction(
                          handleFinishSession, 
                          "Are you sure you want to finish this session? This will mark the session as complete."
                        )
                      }
                      variant="outline"
                      size="sm"
                      className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                      disabled={sessionUpdating}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                      Finish Session
                    </Button>
                  )}
                  
                  {/* Cancel Session Button - Show if session is SCHEDULED or ACTIVE */}
                  {(sessionData?.session?.status === "SCHEDULED" || sessionData?.session?.status === "ACTIVE") && (
                    <Button
                      onClick={() => 
                        confirmSessionAction(
                          handleCancelSession, 
                          "Are you sure you want to cancel this session? This action cannot be undone."
                        )
                      }
                      variant="outline"
                      size="sm"
                      className="w-full bg-red-50 hover:bg-red-100 border-red-200"
                      disabled={sessionUpdating}
                    >
                      <X className="mr-2 h-4 w-4 text-red-600" />
                      Cancel Session
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
                title="Current Players"
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
                      // Check if we're at the final table (# of current players equals # of payout positions)
                      // and if registration is closed
                      const payoutPositions = payoutStructure?.length || 0;
                      const currentPlayerCount = currentSession.currentPlayersCount;
                      
                      if (payoutPositions > 0 && 
                          currentPlayerCount <= payoutPositions && 
                          currentSession.registrationClosed) {
                        // We're in the money - move directly to ITM
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
                  currentSession.registeredPlayers < currentSession.maxPlayers ? {
                    label: "Seat",
                    variant: "default",
                    title: "Seat player from waitlist",
                    onClick: (registration) => seatFromWaitlist(registration.id)
                  } : null,
                  {
                    label: "No-show",
                    variant: "destructive",
                    title: "Mark player as no-show",
                    onClick: (registration) => markNoShow(registration.id)
                  }
                ].filter(Boolean) : []}
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
                    // Add prize information to ITM players
                    if (payoutStructure && payoutStructure.length > 0) {
                      // Reverse the index since the first player eliminated should get the lowest prize
                      const position = payoutStructure.length - index;
                      const prize = payoutStructure[position - 1]?.amount;
                      
                      if (prize) {
                        return {
                          ...player,
                          displayName: `${player.displayName} - ${position}${getOrdinalSuffix(position)} Place ($${prize})`
                        };
                      }
                    }
                    return player;
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