import { useToast } from "@/lib/hooks/use-toast";
import { useState } from "react";

export const usePlayerService = (fetchSessionData) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Update player status
  const updatePlayerStatus = async (registrationId, newStatus, isRebuy = false) => {
    try {
      console.log(`Updating player status: ${registrationId} to ${newStatus}`);
      
      // Show loading indicator
      setIsUpdating(true);
      
      const response = await fetch('/api/player-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId,
          status: newStatus,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update player status');
      }
      
      // Force refresh to get the updated data
      await fetchSessionData();
      
      toast({
        title: 'Success',
        description: `Player status updated to ${newStatus}`,
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update player status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update player status',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
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
        
        // First update player status to ensure they're current/active
        const statusResponse = await fetch('/api/player-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId: registration.id,
            status: 'ACTIVE'
          }),
        });
        
        if (!statusResponse.ok) {
          const errorData = await statusResponse.json();
          throw new Error(errorData.message || "Failed to update player status");
        }
        
        // Now increment the rebuy count
        const response = await fetch('/api/tournament-rebuy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId: registration.id
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

  // Handle cash game buy-in
  const handleCashGameBuyIn = async (registration, amount, setIsSubmitting) => {
    console.log(`Processing cash game buy-in for: ${registration.user.name}, amount: $${amount}`);
    
    if (!amount || isNaN(parseInt(amount))) {
      toast({
        title: "Error",
        description: "Please enter a valid buy-in amount",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Disable buy-in button to prevent double clicks
      if (setIsSubmitting) setIsSubmitting(true);
      
      const response = await fetch('/api/cash-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'buyin',
          registrationId: registration.id,
          amount: parseInt(amount)
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("Cash game buy-in processed successfully:", result);
        toast({
          title: "Buy-In Processed",
          description: `Added $${amount} buy-in for ${registration.user.name}`,
        });
        
        // Give database time to process
        setTimeout(async () => {
          await fetchSessionData();
          if (setIsSubmitting) setIsSubmitting(false);
        }, 1000);
        return true;
      } else {
        console.error("Error processing cash game buy-in:", result);
        toast({
          title: "Error",
          description: `Failed to process buy-in: ${result.message || 'Unknown error'}`,
          variant: "destructive",
        });
        if (setIsSubmitting) setIsSubmitting(false);
        return false;
      }
    } catch (error) {
      console.error("Exception in handleCashGameBuyIn:", error);
      toast({
        title: "Error",
        description: `Error: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      if (setIsSubmitting) setIsSubmitting(false);
      return false;
    }
  };

  // Handle cash-out
  const handleCashOut = async (registration, amount, setIsSubmitting) => {
    console.log(`Processing cash-out for: ${registration.user.name}, amount: $${amount}`);
    
    if (!amount || isNaN(parseInt(amount))) {
      toast({
        title: "Error",
        description: "Please enter a valid cash-out amount",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Disable cash-out button to prevent double clicks
      if (setIsSubmitting) setIsSubmitting(true);
      
      const response = await fetch('/api/cash-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cashout',
          registrationId: registration.id,
          amount: parseInt(amount)
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("Cash-out processed successfully:", result);
        
        // Calculate profit/loss
        const netProfit = result.registration.netProfit;
        const profitText = netProfit >= 0 ? `profit of $${netProfit}` : `loss of $${Math.abs(netProfit)}`;
        
        toast({
          title: "Cash-Out Processed",
          description: `${registration.user.name} cashed out $${amount} with a ${profitText}`,
        });
        
        // Give database time to process
        setTimeout(async () => {
          await fetchSessionData();
          if (setIsSubmitting) setIsSubmitting(false);
        }, 1000);
        return true;
      } else {
        console.error("Error processing cash-out:", result);
        toast({
          title: "Error",
          description: `Failed to process cash-out: ${result.message || 'Unknown error'}`,
          variant: "destructive",
        });
        if (setIsSubmitting) setIsSubmitting(false);
        return false;
      }
    } catch (error) {
      console.error("Exception in handleCashOut:", error);
      toast({
        title: "Error",
        description: `Error: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      if (setIsSubmitting) setIsSubmitting(false);
      return false;
    }
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
      console.log(`Seating player from waitlist: ${registrationId}`);
      
      // Update the registration status in the database
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
        
        // Refresh the session data with a slight delay
        setTimeout(async () => {
          await fetchSessionData();
        }, 500);
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
    updatePlayerStatus,
    handleBuyIn,
    handleCashGameBuyIn,
    handleCashOut,
    stopRegistration,
    seatFromWaitlist
  };
}; 