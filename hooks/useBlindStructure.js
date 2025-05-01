import { useState } from 'react';
import { useToast } from "@/lib/hooks/use-toast";
import { getNextLevel } from '@/lib/tournament-utils';

export default function useBlindStructure(sessionData, fetchSessionData) {
  const [blindStructureData, setBlindStructureData] = useState(null);
  const [blindsLoading, setBlindsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch blind structure if needed
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
      setBlindsLoading(true);
      const response = await fetch(`/api/blinds/current?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blind structure');
      }
      
      const data = await response.json();
      
      setBlindStructureData({
        ...data,
        sessionId, // Store the sessionId for future comparisons
      });
    } catch (error) {
      console.error('Error fetching blind structure:', error);
    } finally {
      setBlindsLoading(false);
    }
  };

  // Update blind level (admin only)
  const updateBlindLevel = async (levelIndex) => {
    if (!sessionData.exists) return;
    
    try {
      console.log(`Requesting level change to ${levelIndex}`);
      
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
      
      // Refresh the session data and blind structure data
      await fetchSessionData();
      
      // Refresh blind structure data
      await fetchBlindStructureIfNeeded(sessionData.session.id, levelIndex);
      
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
    return getNextLevel(blindStructureData, sessionData.session);
  };

  return {
    blindStructureData,
    blindsLoading,
    setBlindsLoading,
    fetchBlindStructureIfNeeded,
    updateBlindLevel,
    getNextBlindLevel
  };
} 