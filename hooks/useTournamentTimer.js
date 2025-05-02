import { useState, useEffect, useRef } from 'react';
import { formatTimerDisplay, getNextLevel } from '@/lib/tournament-utils';

export default function useTournamentTimer(
  blindStructureData, 
  sessionData, 
  isAdmin, 
  updateBlindLevel
) {
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0 });
  const [timerInterval, setTimerInterval] = useState(null);
  const [blindsLoading, setBlindsLoading] = useState(false);
  const [displayedLevelIndex, setDisplayedLevelIndex] = useState(sessionData?.session?.currentBlindLevel ?? 0);
  const hasAdvancedLevelRef = useRef(false);
  const currentLevelIndexRef = useRef(sessionData?.session?.currentBlindLevel ?? 0);

  // Format timer for display
  const formatTimer = () => formatTimerDisplay(timer.minutes, timer.seconds);

  // Update displayedLevelIndex when sessionData changes externally
  useEffect(() => {
    const serverLevelIndex = sessionData?.session?.currentBlindLevel ?? 0;
    if (serverLevelIndex !== displayedLevelIndex) {
        console.log(`[Timer] Server level index (${serverLevelIndex}) differs from display index (${displayedLevelIndex}). Syncing display.`);
        setDisplayedLevelIndex(serverLevelIndex);
        currentLevelIndexRef.current = serverLevelIndex; // Sync ref as well
        hasAdvancedLevelRef.current = false; // Reset advance lock when server confirms level change
    }
  }, [sessionData?.session?.currentBlindLevel]);

  // Start/manage timer based on displayedLevelIndex
  useEffect(() => {
    if (!sessionData || !sessionData.exists || !sessionData.session) {
        if (timerInterval) clearInterval(timerInterval); setTimerInterval(null);
        setTimer({ minutes: 0, seconds: 0 });
        return; 
    }

    // Use displayedLevelIndex to get the level details for the timer
    const levelForTimer = blindStructureData?.levels?.[displayedLevelIndex];
    
    // Check if the displayed level exists and session is active
    if (levelForTimer && sessionData.session.status === 'ACTIVE') {
       
      if (timerInterval) clearInterval(timerInterval); setTimerInterval(null);
      
      const serverLevelIndex = sessionData.session.currentBlindLevel ?? 0;
      const isSyncedWithServer = displayedLevelIndex === serverLevelIndex;
      currentLevelIndexRef.current = serverLevelIndex; // Keep ref synced to server state
      const levelDuration = levelForTimer.duration;
      let startTime = sessionData.session.levelStartTime 
        ? new Date(sessionData.session.levelStartTime)
        : new Date();
      
      // If displayed level is AHEAD of server level, estimate start time
      if (!isSyncedWithServer && displayedLevelIndex > serverLevelIndex) {
         console.log("[Timer] Display level is ahead of server. Estimating start time for display timer.");
         // Find the *previous* level's duration to estimate when this level *should* have started
         const prevLevelIndex = displayedLevelIndex - 1;
         const prevLevel = blindStructureData?.levels?.[prevLevelIndex];
         if (prevLevel && sessionData.session.levelStartTime) {
            const prevLevelDurationMs = (prevLevel.duration || 0) * 60 * 1000;
            startTime = new Date(sessionData.session.levelStartTime.getTime() + prevLevelDurationMs);
         } else {
            // Fallback if we can't estimate: just use current time (timer will likely be full duration)
            startTime = new Date(); 
         }
      } else if (!sessionData.session.levelStartTime) {
          // If server start time is missing, use now
          startTime = new Date();
      }

      const now = new Date();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = levelDuration * 60;
      let remainingSeconds = totalSeconds - elapsedSeconds;
      
      // --- Initial Check for Admin Auto-Advance --- 
      // Only advance if synced with server and timer is already 0
      if (isSyncedWithServer && remainingSeconds <= 0 && isAdmin && !hasAdvancedLevelRef.current) {
        console.log(`[Timer] Initial time is already <= 0 for synced level ${displayedLevelIndex}. Attempting admin advance.`);
        hasAdvancedLevelRef.current = true; 
        setTimeout(async () => {
          try {
            setBlindsLoading(true);
            await updateBlindLevel(displayedLevelIndex + 1);
          } catch (error) {
            console.error("[Timer] Error advancing level on initial load:", error);
            hasAdvancedLevelRef.current = false; 
          } finally {
            setBlindsLoading(false);
          }
        }, 50); 
        setTimer({ minutes: 0, seconds: 0 });
        return; 
      }
      
      remainingSeconds = Math.max(0, remainingSeconds);
      setTimer({ minutes: Math.floor(remainingSeconds / 60), seconds: remainingSeconds % 60 });

      // --- Interval Logic --- 
      const interval = setInterval(() => {
        setTimer(prevTimer => {
          let newMinutes = prevTimer.minutes;
          let newSeconds = prevTimer.seconds;

          if (newMinutes === 0 && newSeconds === 0) {
            clearInterval(interval); setTimerInterval(null);
            return prevTimer; 
          }

          newSeconds--;
          if (newSeconds < 0) { newSeconds = 59; newMinutes--; }
          
          if (newMinutes <= 0 && newSeconds <= 0) {
            newMinutes = 0; newSeconds = 0;
            clearInterval(interval); setTimerInterval(null);

            // Find the *next* level details based on the *current displayed* level
            const nextLevelIndex = displayedLevelIndex + 1;
            const nextLevel = blindStructureData?.levels?.[nextLevelIndex];

            if (nextLevel) {
              console.log(`[Timer] Interval hit 0 for display level ${displayedLevelIndex}. Advancing display to level ${nextLevelIndex}.`);
              // Optimistically advance the DISPLAYED level
              setDisplayedLevelIndex(nextLevelIndex);
              // Immediately set timer for the next level
              const nextDuration = nextLevel.duration || 0;
              setTimer({ minutes: nextDuration, seconds: 0 });
            } else {
               console.log(`[Timer] Interval hit 0 for display level ${displayedLevelIndex}, but no next level found.`);
               // Keep timer at 0 if no next level
            }
            
            // Admin still needs to trigger the actual backend update
            if (isAdmin && !hasAdvancedLevelRef.current && !blindsLoading && isSyncedWithServer) {
               console.log(`[Timer] Admin detected timer end for synced level ${displayedLevelIndex}. Attempting backend advance.`);
               hasAdvancedLevelRef.current = true; 
               setTimeout(async () => {
                 try {
                   setBlindsLoading(true);
                   // Update based on the level that just ENDED (which is the displayedLevelIndex)
                   await updateBlindLevel(displayedLevelIndex + 1); 
                 } catch (error) {
                   console.error("[Timer] Error advancing level from interval:", error);
                   hasAdvancedLevelRef.current = false; 
                 } finally {
                   setBlindsLoading(false);
                 }
               }, 50); 
            }
          }
          return { minutes: newMinutes, seconds: newSeconds };
        });
      }, 1000);
      
      setTimerInterval(interval);
      
      return () => { if (interval) clearInterval(interval); };
      
    } else { 
      // If session not ACTIVE or no level data for displayed index, clear timer
      if (timerInterval) clearInterval(timerInterval); setTimerInterval(null);
      setTimer({ minutes: 0, seconds: 0 });
    } 
    // Depend on displayedLevelIndex to restart timer when it changes optimistically
  }, [blindStructureData, sessionData, isAdmin, updateBlindLevel, displayedLevelIndex]);

  // Return the displayed level index for the UI to use
  return { timer, formatTimer, blindsLoading, setBlindsLoading, displayedLevelIndex };
} 