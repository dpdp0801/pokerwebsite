import { useToast } from "@/lib/hooks/use-toast";

export const usePlayerService = (fetchSessionData) => {
  const { toast } = useToast();

  // Remove player from registration or waitlist
  const removePlayer = async (registrationId) => {
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
          await fetchSessionData();
          return true;
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
        return false;
      }
    }
    return false;
  };

  // Mark player as no-show
  const markNoShow = async (registrationId) => {
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
          await fetchSessionData();
          return true;
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
        return false;
      }
    }
    return false;
  };

  // Update player status
  const updatePlayerStatus = async (registrationId, newStatus, isRebuy = false) => {
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
            playerStatus: 'WAITLISTED',  // Also set playerStatus to WAITLISTED
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
      } else if (newStatus === 'ACTIVE') {
        // For returning players to active status
        const response = await fetch('/api/player-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId,
            newStatus: 'CONFIRMED',  // Use CONFIRMED for database status
            playerStatus: 'CURRENT',  // But set playerStatus to CURRENT for display
            isRebuy: false
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Status Updated",
            description: "Player has been returned to active players",
          });
          
          // Refresh the session data
          await fetchSessionData();
          return true;
        } else {
          const errorData = await response.json();
          console.error("Error returning player:", errorData);
          toast({
            title: "Error",
            description: errorData.message || "Failed to return player to active status",
            variant: "destructive"
          });
          return false;
        }
      } else {
        // For other status changes use the standard endpoint (ITM, etc)
        const response = await fetch('/api/player-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId,
            newStatus,
            playerStatus: newStatus,  // Always set playerStatus to match newStatus for consistency
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

  // Process rebuy
  const handleBuyIn = async (registration, setIsSubmitting) => {
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
          return true;
        } else {
          console.error("Error processing rebuy:", result);
          toast({
            title: "Error",
            description: `Failed to process rebuy: ${result.message || 'Unknown error'}`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return false;
        }
      } catch (error) {
        console.error("Exception in handleBuyIn:", error);
        toast({
          title: "Error",
          description: `Error: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return false;
      }
    }
    return false;
  };

  // Stop registration for tournament
  const stopRegistration = async (sessionId) => {
    if (window.confirm("Are you sure you want to stop registration? This will prevent new players from registering.")) {
      try {
        const response = await fetch('/api/sessions/stop-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Registration Stopped",
            description: "New registrations have been disabled for this session.",
          });
          
          // Refresh the session data
          await fetchSessionData();
          return true;
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
        return false;
      }
    }
    return false;
  };

  // Move player from waitlist to current
  const seatFromWaitlist = async (registrationId) => {
    try {
      // First update the registration status in the database
      const response = await fetch('/api/player-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId,
          newStatus: 'CONFIRMED',
          playerStatus: 'CURRENT',
          isRebuy: false
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Player Seated",
          description: "Player has been moved to current players"
        });
        
        // Refresh the session data
        await fetchSessionData();
        return true;
      } else {
        throw new Error(data.message || "Failed to seat player");
      }
    } catch (err) {
      console.error("Error seating player:", err);
      toast({
        title: "Error",
        description: "Failed to move player from waitlist",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    removePlayer,
    markNoShow,
    updatePlayerStatus,
    handleBuyIn,
    stopRegistration,
    seatFromWaitlist
  };
}; 