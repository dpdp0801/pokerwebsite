import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, Trash2, Timer, Clock, ArrowLeft, ArrowRight, Award, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/lib/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function Status() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();
  
  // Check for admin role in multiple possible locations
  const isAdmin = 
    session?.user?.isAdmin === true || 
    session?.role === "ADMIN" || 
    session?.user?.role === "ADMIN";
  
  // Custom hooks for all data and functionality
  const { loading, sessionData, fetchSessionData } = useSessionData();
  const { 
    blindStructureData, 
    fetchBlindStructureIfNeeded,
    updateBlindLevel,
    getNextBlindLevel
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

  const router = useRouter();
  const { toast } = useToast();

  // If active tournament, fetch blind structure and payout structure
  useEffect(() => {
    if (sessionData.exists && sessionData.session.type === 'TOURNAMENT' && sessionData.session.status === 'ACTIVE') {
      fetchBlindStructureIfNeeded(sessionData.session.id, sessionData.session.currentBlindLevel);
      fetchPayoutStructureIfNeeded(sessionData.session.totalEntries || sessionData.session.registeredPlayers);
    }
  }, [sessionData]);

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
  const nextLevel = getNextBlindLevel();

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
          
          {/* Admin actions */}
          {isAdmin && isTournament && isActive && (
            <div className="flex justify-center mb-6">
              <Button 
                variant={currentSession.registrationClosed ? "outline" : "default"}
                onClick={() => stopRegistration(currentSession.id)}
                disabled={currentSession.registrationClosed}
                className={currentSession.registrationClosed ? "opacity-50" : ""}
              >
                {currentSession.registrationClosed ? "Registration Closed" : "Stop Registration"}
              </Button>
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
              nextLevel={nextLevel}
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
          
          {/* Participants lists - only shown to admins */}
          {isAdmin && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-lg mb-3">Participants</h3>
              
              <PlayerList 
                players={currentSession.registrations.current}
                title="Current Players"
                emptyMessage="No active players currently at the table"
                colorClass="bg-green-100 text-green-800"
                isAdmin={isAdmin}
                removePlayer={removePlayer}
                actions={[
                  {
                    label: "Eliminate",
                    variant: "outline",
                    title: "Move player to eliminated",
                    onClick: (registration) => updatePlayerStatus(registration.id, 'ELIMINATED')
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
                ].filter(Boolean)}
              />
              
              {isTournament && currentSession.registrations.inTheMoney && currentSession.registrations.inTheMoney.length > 0 && (
                <PlayerList 
                  players={currentSession.registrations.inTheMoney}
                  title="In the Money"
                  emptyMessage="No players in the money yet"
                  colorClass="bg-amber-100 text-amber-800"
                  isAdmin={isAdmin}
                  removePlayer={removePlayer}
                  actions={[]}
                />
              )}
              
              <PlayerList 
                players={currentSession.registrations.waitlisted}
                title="Waitlist"
                emptyMessage="No players on the waitlist"
                colorClass="bg-yellow-100 text-yellow-800"
                isAdmin={isAdmin}
                removePlayer={removePlayer}
                actions={[
                  {
                    label: "Seat",
                    variant: "default",
                    title: "Move player from waitlist to current",
                    onClick: seatFromWaitlist
                  }
                ]}
              />
              
              <PlayerList 
                players={currentSession.registrations.eliminated}
                title="Eliminated Players"
                emptyMessage="No eliminated players"
                colorClass="bg-red-100 text-red-800"
                isAdmin={isAdmin}
                removePlayer={removePlayer}
                actions={[
                  {
                    label: "Seat",
                    variant: "default",
                    title: "Move player from eliminated to current",
                    onClick: (registration) => updatePlayerStatus(registration.id, 'CURRENT')
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
                    title: "Process a rebuy for this player",
                    disabled: isSubmitting,
                    onClick: (registration) => handleBuyIn(registration, setIsSubmitting)
                  } : null
                ].filter(Boolean)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 