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

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState({
    exists: false,
    session: null
  });
  const [blindStructureData, setBlindStructureData] = useState(null);
  const [blindsLoading, setBlindsLoading] = useState(false);
  const [payoutStructure, setPayoutStructure] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0 });
  const [timerInterval, setTimerInterval] = useState(null);

  const { data: session } = useSession();
  // Check for admin role in multiple possible locations
  const isAdmin = 
    session?.user?.isAdmin === true || 
    session?.role === "ADMIN" || 
    session?.user?.role === "ADMIN";
  const router = useRouter();
  const { toast } = useToast();

  // Fetch real session data
  useEffect(() => {
    fetchSessionData(true);
    
    // Set up polling to refresh data every 5 seconds
    const intervalId = setInterval(() => {
      fetchSessionData(false);
    }, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const fetchSessionData = async (initialLoad = false) => {
    try {
      // Only show loading state on initial load
      if (initialLoad) {
        setLoading(true);
      }
      
      const response = await fetch('/api/session-status');
      const data = await response.json();
      
      // Update the session data state without causing a flash
      setSessionData(prevData => {
        // If it's the first load or session existence changed
        if (initialLoad || prevData.exists !== data.exists) {
          return data;
        }
        
        // For subsequent loads, if the session exists, merge
        // the new data with the existing data to avoid UI flickering
        if (data.exists && prevData.exists) {
          return {
            exists: true,
            session: {
              ...prevData.session,
              ...data.session,
              // Keep the same objects for these unless they've actually changed
              // This prevents unnecessary re-renders
              registrations: {
                current: data.session.registrations.current,
                waitlisted: data.session.registrations.waitlisted,
                eliminated: data.session.registrations.eliminated,
                inTheMoney: data.session.registrations.inTheMoney
              }
            }
          };
        }
        
        return data;
      });
      
      // If active tournament, fetch blind structure and payout structure
      if (data.exists && data.session.type === 'TOURNAMENT' && data.session.status === 'ACTIVE') {
        fetchBlindStructureIfNeeded(data.session.id, data.session.currentBlindLevel);
        fetchPayoutStructureIfNeeded(data.session.totalEntries || data.session.registeredPlayers);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      // Only update loading state on initial load
      if (initialLoad) {
        setLoading(false);
      }
    }
  };

  // Start timer for blind levels
  useEffect(() => {
    if (blindStructureData?.currentLevel && sessionData.exists && sessionData.session.status === 'ACTIVE') {
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
      }

      // Get level start time and duration
      const levelDuration = blindStructureData.currentLevel.duration;
      const startTime = sessionData.session.levelStartTime 
        ? new Date(sessionData.session.levelStartTime)
        : new Date(); // Fallback to now if no start time

      // Set initial timer based on elapsed time
      const now = new Date();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = levelDuration * 60;
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
      
      const initialMinutes = Math.floor(remainingSeconds / 60);
      const initialSeconds = remainingSeconds % 60;
      
      // Initialize timer with remaining time
      setTimer({ 
        minutes: initialMinutes, 
        seconds: initialSeconds
      });
      
      // If timer is already at zero, don't start a new interval
      if (initialMinutes <= 0 && initialSeconds <= 0 && isAdmin) {
        // Auto-advance to the next level for admin
        setTimeout(async () => {
          try {
            setBlindsLoading(true);
            await updateBlindLevel((sessionData.session.currentBlindLevel || 0) + 1);
          } catch (error) {
            console.error("Error advancing to next level:", error);
          } finally {
            setBlindsLoading(false);
          }
        }, 500);
        return;
      }
      
      // Start a new interval
      const interval = setInterval(() => {
        setTimer(prevTimer => {
          // If we're already at 0:00, don't update the timer - stay at 0:00
          if (prevTimer.minutes === 0 && prevTimer.seconds === 0) {
            return prevTimer;
          }
          
          // Calculate new time
          let newSeconds = prevTimer.seconds - 1;
          let newMinutes = prevTimer.minutes;
          
          if (newSeconds < 0) {
            newSeconds = 59;
            newMinutes = newMinutes - 1;
          }
          
          // Check if timer is finished
          if (newMinutes <= 0 && newSeconds <= 0) {
            // Stop at 00:00
            newMinutes = 0;
            newSeconds = 0;
            
            // Auto-advance to the next level if we're admin
            if (isAdmin && !blindsLoading) {
              // Clear the interval to prevent multiple calls
              clearInterval(interval);
              setTimerInterval(null);
              
              // Use setTimeout to give a small delay before advancing
              setTimeout(async () => {
                try {
                  setBlindsLoading(true);
                  await updateBlindLevel((sessionData.session.currentBlindLevel || 0) + 1);
                } catch (error) {
                  console.error("Error advancing to next level:", error);
                } finally {
                  setBlindsLoading(false);
                }
              }, 500);
            }
          }
          
          return { minutes: newMinutes, seconds: newSeconds };
        });
      }, 1000);
      
      setTimerInterval(interval);
      
      // Cleanup interval on unmount
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [blindStructureData, sessionData, isAdmin, blindsLoading]);
  
  // Format timer for display
  const formatTimer = () => {
    const { minutes, seconds } = timer;
    
    // Prevent negative values
    const displayMinutes = Math.max(0, minutes);
    const displaySeconds = Math.max(0, seconds);
    
    return `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
  };

  // Only fetch blind structure if it's not loaded or has changed
  const fetchBlindStructureIfNeeded = async (sessionId, currentLevel) => {
    // Skip if already loading
    if (blindsLoading) return;
    
    // Skip if we already have the data and the level hasn't changed
    if (
      blindStructureData && 
      blindStructureData.sessionId === sessionId &&
      blindStructureData.currentLevelIndex === currentLevel
    ) {
      return;
    }
    
    try {
      // Don't set loading state to avoid UI flicker
      const response = await fetch(`/api/blinds/current?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blind structure');
      }
      
      const data = await response.json();
      
      // Keep the next level function using the same data
      const nextLevelData = getNextLevel();
      
      setBlindStructureData({
        ...data,
        sessionId, // Store the sessionId for future comparisons
        currentLevelIndex: currentLevel // Store the current level for future comparisons
      });
    } catch (error) {
      console.error('Error fetching blind structure:', error);
    }
  };
  
  // Only fetch payout structure if it's not loaded or entries have changed
  const fetchPayoutStructureIfNeeded = async (playerCount) => {
    // Skip if already loading
    if (payoutLoading) return;
    
    // Skip if we already have the data and the player count hasn't changed significantly
    if (
      payoutStructure && 
      payoutStructure.playerCount === playerCount
    ) {
      return;
    }
    
    try {
      // Don't set loading state to avoid UI flicker
      const entryCount = Math.max(playerCount || 0, 0);
      const response = await fetch(`/api/payout-structures/get-by-entries?entries=${entryCount}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payout structure');
      }
      
      const data = await response.json();
      setPayoutStructure({
        ...data,
        playerCount // Store the player count for future comparisons
      });
    } catch (error) {
      console.error('Error fetching payout structure:', error);
      // Initialize with an empty structure on error
      setPayoutStructure({
        id: "default",
        name: "No entries yet",
        minEntries: 0,
        maxEntries: 0,
        tiers: [],
        playerCount
      });
    }
  };

  // Update blind level (admin only)
  const updateBlindLevel = async (levelIndex) => {
    if (!isAdmin || !sessionData.exists) return;
    
    try {
      console.log(`Requesting level change to ${levelIndex}`);
      
      // Clear existing timer interval
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // Set loading state first to prevent multiple clicks
      setBlindsLoading(true);
      
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update blind level');
      }
      
      const responseData = await response.json();
      console.log("API response:", responseData);
      
      // Reset timer state to avoid negative numbers
      setTimer({ minutes: 0, seconds: 0 }); 
      
      // Refresh the session data and blind structure data
      await fetchSessionData();
      
      // Refresh blind structure data
      await fetchBlindStructureIfNeeded(sessionData.session.id, sessionData.session.currentBlindLevel);
      
      toast({
        title: "Blind Level Updated",
        description: "The current blind level has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating level:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the blind level",
        variant: "destructive",
      });
    } finally {
      setBlindsLoading(false);
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
    
    // Extract first and last initials from the name string
    const initials = name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
      
    return initials;
  };

  // Calculate payout amount
  const calculatePayout = (percentage, buyIn, playerCount) => {
    // Add safety checks
    if (!percentage || !buyIn || !playerCount || playerCount <= 0) {
      return '0.00';
    }
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

  // Get next blind level
  const getNextLevel = () => {
    if (!blindStructureData?.levels || sessionData?.session?.currentBlindLevel === undefined) {
      return null;
    }
    
    const currentLevelIndex = sessionData.session.currentBlindLevel;
    if (currentLevelIndex < blindStructureData.levels.length - 1) {
      return {
        ...blindStructureData.levels[currentLevelIndex + 1],
        levelNumber: (blindStructureData.currentLevel?.level || 0) + 1
      };
    }
    
    return null;
  };

  // Add function to stop registration
  const stopRegistration = async () => {
    if (!isAdmin) return;
    
    if (window.confirm("Are you sure you want to stop registration? This will prevent new players from registering.")) {
      try {
        const response = await fetch('/api/sessions/stop-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionData.session.id
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Registration Stopped",
            description: "New registrations have been disabled for this session.",
          });
          
          // Refresh the session data
          const updatedResponse = await fetch('/api/session-status');
          const updatedData = await updatedResponse.json();
          setSessionData(updatedData);
        } else {
          const data = await response.json();
          throw new Error(data.error || "Failed to stop registration");
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err.message || "An error occurred while stopping registration",
          variant: "destructive",
        });
      }
    }
  };

  // Mark player as no-show
  const markNoShow = async (registrationId, userId) => {
    if (!isAdmin) return;
    
    if (window.confirm("Are you sure you want to mark this player as a no-show?")) {
      try {
        const response = await fetch('/api/registration/no-show', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Player Marked as No-Show",
            description: "The player has been marked as a no-show.",
          });
          
          // Refresh the session data
          const updatedResponse = await fetch('/api/session-status');
          const updatedData = await updatedResponse.json();
          setSessionData(updatedData);
        } else {
          const data = await response.json();
          throw new Error(data.error || "Failed to mark player as no-show");
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err.message || "An error occurred",
          variant: "destructive",
        });
      }
    }
  };

  // Update player status
  const updatePlayerStatus = async (registrationId, newStatus, isRebuy = false) => {
    if (!isAdmin) return;
    
    try {
      if (newStatus === 'ELIMINATED') {
        const response = await fetch('/api/player-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId,
            newStatus,
            playerStatus: 'ELIMINATED',
            isRebuy
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Status Updated",
            description: "Player has been eliminated",
          });
          
          // Refresh the session data
          await fetchSessionData();
          return true;
        } else {
          const errorData = await response.json();
          console.error("Error eliminating player:", errorData);
          toast({
            title: "Error",
            description: errorData.message || "Failed to eliminate player",
            variant: "destructive"
          });
          return false;
        }
      } else if (newStatus === 'WAITLIST') {
        // The API expects WAITLISTED not WAITLIST
        const response = await fetch(`/api/player-status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId,
            newStatus: 'WAITLISTED',  // Change to match expected API value
            playerStatus: 'REGISTERED',
            isRebuy: false
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Status Updated",
            description: "Player has been moved to waitlist",
          });
          
          // Refresh the session data
          await fetchSessionData();
          return true;
        } else {
          const errorData = await response.json();
          console.error("Error moving to waitlist:", errorData);
          toast({
            title: "Error",
            description: errorData.message || "Failed to move player to waitlist",
            variant: "destructive"
          });
          return false;
        }
      } else {
        // For other status changes use the standard endpoint
        const response = await fetch('/api/player-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId,
            newStatus,
            playerStatus: newStatus === 'CURRENT' ? 'CURRENT' : 
                          newStatus === 'ITM' ? 'ITM' : 'REGISTERED',
            isRebuy: isRebuy
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Status Updated",
            description: `Player has been moved to ${newStatus === 'ITM' ? 'in the money' : newStatus.toLowerCase()}`,
          });
          
          // Refresh the session data
          await fetchSessionData();
          return true;
        } else {
          const errorData = await response.json();
          console.error("Error updating status:", errorData);
          toast({
            title: "Error",
            description: errorData.message || "Failed to update player status",
            variant: "destructive"
          });
          return false;
        }
      }
    } catch (err) {
      console.error("Exception in updatePlayerStatus:", err);
      toast({
        title: "Error",
        description: err.message || "An error occurred while updating the player status",
        variant: "destructive",
      });
      return false;
    }
  };

  // Enhance the PlayerList component to display rebuy count
  const PlayerList = ({ players, title, emptyMessage, colorClass, actions = [] }) => {
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
                      {registration.user.firstName || registration.user.lastName ? 
                        `${registration.user.firstName?.[0] || ''}${registration.user.lastName?.[0] || ''}`.toUpperCase() :
                        getInitials(registration.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {(registration.user.firstName || registration.user.lastName) ? 
                        `${registration.user.firstName || ''} ${registration.user.lastName || ''}`.trim() : 
                        registration.user.name}
                    </p>
                    {isAdmin && registration.user.venmoId && (
                      <p className="text-xs text-muted-foreground">Venmo: {registration.user.venmoId}</p>
                    )}
                    {(registration.rebuys !== undefined && registration.rebuys >= 0) && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                        {registration.rebuys + 1} {registration.rebuys === 0 ? 'buy-in' : 'buy-ins'}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex space-x-1">
                    {actions.map((action, index) => (
                      <Button 
                        key={index}
                        size="sm"
                        variant={action.variant || "outline"}
                        onClick={() => action.onClick(registration)}
                        title={action.title}
                        disabled={action.disabled}
                      >
                        {action.icon && <action.icon className="h-4 w-4 mr-1" />}
                        {action.label}
                      </Button>
                    ))}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removePlayer(registration.id)}
                      title="Remove player"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
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
  const nextLevel = getNextLevel();

  const shouldShowPayouts = () => {
    // If we don't have blind data or current level, we can't show payouts
    if (!blindStructureData || !currentSession) {
      return false;
    }
    
    // Get current level index
    const levelIndex = currentSession.currentBlindLevel;
    
    // Check if we're at or after break 2
    // Break 2 should be around level 8-9 in the sequence
    if (levelIndex >= 8) {
      return true;
    }
    
    // Check if the current level has special actions related to break 2
    const currentLevel = blindStructureData.currentLevel;
    if (currentLevel?.specialAction) {
      // These actions indicate we're at break 2 or later
      if (currentLevel.specialAction === 'CHIP_UP_5S' || 
          currentLevel.specialAction === 'REG_CLOSE' ||
          currentLevel.specialAction === 'REG_CLOSE_CHIP_UP_5S') {
        return true;
      }
    }
    
    // Check if registration has already closed by seeing if we're past any level with REG_CLOSE
    const regCloseIndex = blindStructureData.levels?.findIndex(l => 
      l.specialAction === 'REG_CLOSE' || 
      l.specialAction === 'REG_CLOSE_CHIP_UP_5S'
    );
    
    if (regCloseIndex !== -1 && regCloseIndex < levelIndex) {
      return true;
    }
    
    // By default, don't show payouts yet
    return false;
  };

  const handleBuyIn = async (registration) => {
    if (!isAdmin) return;
    
    console.log(`Attempting rebuy for: ${registration.user.name}, ID: ${registration.id}`);
    
    if (confirm(`Confirm rebuy for ${registration.user.name}?`)) {
      try {
        // Disable buy-in button to prevent double clicks
        setIsSubmitting(true);
        
        console.log(`Sending rebuy request for registration ${registration.id}`);
        
        const response = await fetch('/api/player-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId: registration.id,
            isRebuy: true
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log("Rebuy processed successfully:", result);
          toast({
            title: "Rebuy Processed",
            description: `Processed rebuy for ${registration.user.name}`,
          });
          
          // Give database more time to process the rebuy
          setTimeout(async () => {
            console.log("Refreshing session data after rebuy");
            await fetchSessionData();
            setIsSubmitting(false);
          }, 1000);
        } else {
          console.error("Error processing rebuy:", result);
          toast({
            title: "Error",
            description: `Failed to process rebuy: ${result.message || 'Unknown error'}`,
            variant: "destructive",
          });
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error("Exception in handleBuyIn:", error);
        toast({
          title: "Error",
          description: `Error: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
    }
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
          </div>
          
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
                onClick={stopRegistration}
                disabled={currentSession.registrationClosed}
                className={currentSession.registrationClosed ? "opacity-50" : ""}
              >
                {currentSession.registrationClosed ? "Registration Closed" : "Stop Registration"}
              </Button>
            </div>
          )}
          
          {/* Show timer and blind info for active tournaments */}
          {isTournament && isActive && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-lg mb-3 text-center">Timer</h3>
              
              {/* Timer Display - Always visible */}
              <div className="text-center mb-6">
                <div className="text-5xl font-bold mb-1">{formatTimer()}</div>
                <div className="text-sm text-muted-foreground">
                  {blindStructureData?.currentLevel?.isBreak 
                    ? "Break" 
                    : `Level ${blindStructureData?.currentLevel?.level || 1}`}
                </div>
              </div>
              
              {/* Admin Controls */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center space-x-3">
                  {isAdmin && (
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          if (!blindsLoading) {
                            try {
                              setBlindsLoading(true);
                              await updateBlindLevel(Math.max(0, (currentSession.currentBlindLevel || 0) - 1));
                            } finally {
                              setBlindsLoading(false);
                            }
                          }
                        }}
                        disabled={blindsLoading || currentSession.currentBlindLevel === undefined || currentSession.currentBlindLevel === 0}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        <span>Previous</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          if (!blindsLoading) {
                            try {
                              setBlindsLoading(true);
                              await updateBlindLevel((currentSession.currentBlindLevel || 0) + 1);
                            } finally {
                              setBlindsLoading(false);
                            }
                          }
                        }}
                        disabled={blindsLoading || currentSession.currentBlindLevel === undefined || currentSession.currentBlindLevel >= (blindStructureData?.totalLevels - 1)}
                      >
                        <span>Next</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Level Information */}
              {blindStructureData?.currentLevel?.isBreak ? (
                <div className="bg-blue-50 p-4 rounded-md text-center mb-4">
                  <h4 className="font-medium text-blue-800">
                    {blindStructureData.currentLevel.breakName || 'Break'} - {blindStructureData.currentLevel.duration} minutes
                  </h4>
                  {blindStructureData.currentLevel.specialAction && (
                    <p className="text-sm text-blue-700 mt-1">
                      {blindStructureData.currentLevel.specialAction === 'CHIP_UP_1S' && 'Chip Up 1s'}
                      {blindStructureData.currentLevel.specialAction === 'CHIP_UP_5S' && 'Chip Up 5s'}
                      {blindStructureData.currentLevel.specialAction === 'REG_CLOSE' && 'Registration Closes'}
                      {blindStructureData.currentLevel.specialAction === 'REG_CLOSE_CHIP_UP_5S' && (
                        <>Registration Closes<br />Chip Up 5s</>
                      )}
                    </p>
                  )}
                  
                  {/* Show next level during break */}
                  {nextLevel && (
                    <div className="mt-4 p-3 bg-white rounded border">
                      <div className="text-center font-medium text-muted-foreground mb-2 flex items-center justify-center">
                        <ChevronDown className="h-4 w-4 mr-1" />
                        <span>Next: Level {nextLevel.levelNumber}</span>
                      </div>
                      {!nextLevel.isBreak ? (
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Small Blind</p>
                            <p className="text-xl font-medium">{nextLevel?.smallBlind || '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Big Blind</p>
                            <p className="text-xl font-medium">{nextLevel?.bigBlind || '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Ante</p>
                            <p className="text-xl font-medium">{nextLevel?.ante || '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-1">
                          {nextLevel.duration} minute {nextLevel.breakName || 'Break'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-background border rounded-md p-4">
                  {/* Current Level */}
                  <div className="text-center font-medium text-base text-muted-foreground mb-2">
                    Current Level: {blindStructureData?.currentLevel?.level || 1}
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center my-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Small Blind</p>
                      <p className="text-2xl font-bold">{blindStructureData?.currentLevel?.smallBlind || '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Big Blind</p>
                      <p className="text-2xl font-bold">{blindStructureData?.currentLevel?.bigBlind || '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Ante</p>
                      <p className="text-2xl font-bold">{blindStructureData?.currentLevel?.ante || '—'}</p>
                    </div>
                  </div>

                  {/* Next Level */}
                  {nextLevel ? (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-center text-sm text-muted-foreground mb-2 flex items-center justify-center">
                        <ChevronDown className="h-3 w-3 mr-1" />
                        <span>
                          {nextLevel?.isBreak 
                            ? `Next: ${nextLevel.breakName || 'Break'}`
                            : `Next: Level ${nextLevel?.levelNumber || (blindStructureData?.currentLevel?.level || 1) + 1}`
                          }
                        </span>
                      </div>
                      {!nextLevel.isBreak ? (
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Small Blind</p>
                            <p className="text-xl font-medium">{nextLevel?.smallBlind || '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Big Blind</p>
                            <p className="text-xl font-medium">{nextLevel?.bigBlind || '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Ante</p>
                            <p className="text-xl font-medium">{nextLevel?.ante || '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-1 text-sm">
                          {nextLevel.duration} minute {nextLevel.breakName || 'Break'}
                          {nextLevel.specialAction && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {nextLevel.specialAction === 'CHIP_UP_1S' && 'Chip Up 1s'}
                              {nextLevel.specialAction === 'CHIP_UP_5S' && 'Chip Up 5s'}
                              {nextLevel.specialAction === 'REG_CLOSE' && 'Registration Closes'}
                              {nextLevel.specialAction === 'REG_CLOSE_CHIP_UP_5S' && (
                                <>Registration Closes, Chip Up 5s</>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-center text-sm text-muted-foreground">
                        <span>This is the final level</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {isAdmin && (
                <div className="text-center mt-4">
                  <Link href="/structure" className="text-sm text-primary hover:underline inline-flex items-center">
                    <span>View Full Structure</span>
                  </Link>
                </div>
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
              
              {shouldShowPayouts() ? (
                // Show payout structure after/during 2nd break or registration closed
                payoutStructure ? (
                  <>
                    <div className="mb-2 text-center text-sm text-muted-foreground">
                      Based on {currentSession.totalEntries || 0} entries - 
                      Total Prize Pool: ${(currentSession.buyIn * (currentSession.totalEntries || 0)).toLocaleString()}
                    </div>
                    <div className="border rounded-md overflow-hidden mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/3">Place</TableHead>
                            {(payoutStructure.tiers || []).map((tier) => (
                              <TableHead key={tier.id} className="text-center">
                                {tier.position}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(payoutStructure.tiers || []).length > 0 ? (
                            <>
                              <TableRow>
                                <TableCell className="font-medium">Percentage</TableCell>
                                {payoutStructure.tiers.map((tier) => (
                                  <TableCell key={tier.id} className="text-center">
                                    {tier.percentage}%
                                  </TableCell>
                                ))}
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Payout</TableCell>
                                {payoutStructure.tiers.map((tier) => (
                                  <TableCell key={tier.id} className="text-center font-medium">
                                    ${calculatePayout(tier.percentage, currentSession.buyIn, currentSession.totalEntries || currentSession.registeredPlayers || 0)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={payoutStructure.tiers?.length || 1} className="text-center py-4 text-muted-foreground">
                                Payout information will appear when entries are registered.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No payout structure available yet.</p>
                  </div>
                )
              ) : (
                // Registration is still open and we're not yet at break 2
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Payouts will be displayed after the 2nd break or when registration closes.</p>
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
                players={currentSession.registrations.current}
                title="Current Players"
                emptyMessage="No active players currently at the table"
                colorClass="bg-green-100 text-green-800"
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
                    onClick: handleBuyIn
                  } : null
                ].filter(Boolean)}
              />
              
              {isTournament && currentSession.registrations.inTheMoney && currentSession.registrations.inTheMoney.length > 0 && (
                <PlayerList 
                  players={currentSession.registrations.inTheMoney}
                  title="In the Money"
                  emptyMessage="No players in the money yet"
                  colorClass="bg-amber-100 text-amber-800"
                  actions={[]}
                />
              )}
              
              <PlayerList 
                players={currentSession.registrations.waitlisted}
                title="Waitlist"
                emptyMessage="No players on the waitlist"
                colorClass="bg-yellow-100 text-yellow-800"
                actions={[
                  {
                    label: "Seat",
                    variant: "default",
                    title: "Move player from waitlist to current",
                    onClick: (registration) => {
                      fetch(`/api/registration/${registration.id}/confirm`, {
                        method: 'POST'
                      })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          // Move to current immediately instead of registered
                          updatePlayerStatus(registration.id, 'CURRENT');
                          toast({
                            title: "Player Seated",
                            description: `${registration.user.name} has been moved to current players.`
                          });
                        }
                      })
                      .catch(err => {
                        toast({
                          title: "Error",
                          description: "Failed to move player from waitlist",
                          variant: "destructive"
                        });
                      });
                    }
                  }
                ]}
              />
              
              <PlayerList 
                players={currentSession.registrations.eliminated}
                title="Eliminated Players"
                emptyMessage="No eliminated players"
                colorClass="bg-red-100 text-red-800"
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
                    onClick: handleBuyIn
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