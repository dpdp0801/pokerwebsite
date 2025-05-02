import { useState, useEffect } from 'react';
import { useToast } from "@/lib/hooks/use-toast";
import { getNextLevel } from '@/lib/tournament-utils';

export default function useBlindStructure(sessionData, fetchSessionData) {
  // Blind structure data now comes directly from sessionData
  const blindStructureData = sessionData?.blindInfo || { levels: [], currentLevelIndex: 0, currentLevel: null };
  const [blindsLoading, setBlindsLoading] = useState(false); // Still needed for update action
  const { toast } = useToast();

  // Fetching is no longer needed here, it's handled by useSessionData
  const fetchBlindStructureIfNeeded = async () => {
    // No-op, data comes from sessionData prop
    return;
  };

  // Update blind level (admin only)
  const updateBlindLevel = async (levelIndex) => {
    // Use sessionData directly from the hook argument
    if (!sessionData?.session?.id) {
        console.error('Cannot update blind level without session ID.');
        toast({ title: "Error", description: "Session not found.", variant: "destructive"});
        return;
    }
    const sessionId = sessionData.session.id;
    
    try {
      console.log(`Requesting level change to ${levelIndex} for session ${sessionId}`);
      setBlindsLoading(true);
      
      // Use the new consolidated API endpoint
      const response = await fetch(`/api/sessions/${sessionId}/blinds`, { // Updated endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ levelIndex }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update blind level');
      }
      
      // Trigger a refetch of the main session data which includes the updated blind info
      await fetchSessionData(); // This function now needs the sessionId
      // TODO: Modify fetchSessionData in useSessionData hook to accept sessionId
      console.warn("Need to update fetchSessionData to accept sessionId");
      await fetchSessionData(sessionId); // Assuming fetchSessionData is updated
      
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

  // Get the next blind level based on current data
  const getNextBlindLevel = () => {
    // Ensure sessionData and blindInfo exist before calculating
    if (!sessionData || !sessionData.blindInfo) return null;
    return getNextLevel(sessionData.blindInfo, sessionData.session);
  };

  return {
    blindStructureData, // This now directly reflects sessionData.blindInfo
    blindsLoading,
    setBlindsLoading,
    fetchBlindStructureIfNeeded, // Keep for compatibility, but it's a no-op
    updateBlindLevel,
    getNextBlindLevel
  };
} 