import { useToast } from "@/lib/hooks/use-toast";
import { getNextLevel } from '@/lib/tournament-utils';

// This hook primarily provides the blind structure data derived from sessionData
// and the function to update the level on the server.
export default function useBlindStructure(sessionData, fetchSessionData) {
  // Directly derive data from props. No internal state needed for this part.
  const blindStructureData = sessionData?.blindInfo || { levels: [], currentLevelIndex: 0, currentLevel: null };
  const serverLevelIndex = sessionData?.session?.currentBlindLevel ?? 0;
  const { toast } = useToast();
  
  // Keep the update function as it interacts with the server
  const updateBlindLevel = async (levelIndex) => {
    if (!sessionData?.session?.id) {
        console.error('Cannot update blind level without session ID.');
        toast({ title: "Error", description: "Session not found.", variant: "destructive"});
        return;
    }
    const sessionId = sessionData.session.id;
    
    // Note: blindsLoading state is removed from this hook, manage in calling component or timer hook
    try {
      console.log(`Requesting level change to ${levelIndex} for session ${sessionId}`);
      // Perhaps add a loading state indicator here if needed externally?
      
      const response = await fetch(`/api/sessions/${sessionId}/blinds`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelIndex }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update blind level');
      }
      
      // Trigger a refetch of the main session data
      await fetchSessionData(sessionId); 
      
      toast({ title: "Blind Level Updated", description: "Level updated successfully." });

    } catch (error) {
      console.error("Error updating level:", error);
      toast({ title: "Error", description: error.message || "Error updating level", variant: "destructive" });
    } finally {
       // Manage loading state externally if needed
    }
  };

  // getNextBlindLevel can be derived directly if needed, passing data
  // const getNextBlindLevel = () => { ... }; 

  return {
    blindStructureData, // Contains levels array and server confirmed index/level
    serverLevelIndex,   // Explicitly return the server's index
    updateBlindLevel    // Function to update server state
    // No displayedLevelIndex from this hook anymore
  };
} 