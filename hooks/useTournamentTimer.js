import { useState, useEffect, useRef } from 'react';
import { formatTimerDisplay } from '@/lib/tournament-utils';

export default function useTournamentTimer(
  blindStructureData, 
  serverLevelIndex,
  sessionStartTime,
  sessionStatus,
  isAdmin, 
  updateBlindLevel
) {
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0 });
  const [timerInterval, setTimerInterval] = useState(null);
  const [blindsLoading, setBlindsLoading] = useState(false);
  const [displayedLevelIndex, setDisplayedLevelIndex] = useState(serverLevelIndex ?? 0);
  const hasAdvancedLevelRef = useRef(false);

  // Format timer for display
  const formatTimer = () => formatTimerDisplay(timer.minutes, timer.seconds);

  // Sync internal display index with server index when server index changes
  useEffect(() => {
    if (serverLevelIndex !== displayedLevelIndex) {
      console.log(`[Timer Sync Effect] Server level (${serverLevelIndex}) differs from display (${displayedLevelIndex}). Syncing display.`);
      setDisplayedLevelIndex(serverLevelIndex);
      hasAdvancedLevelRef.current = false; // Reset advance lock when server confirms level change
    }
  }, [serverLevelIndex]);

  // Start/manage timer based on displayedLevelIndex
  useEffect(() => {
    if (!sessionStatus || !sessionStartTime) {
      if (timerInterval) clearInterval(timerInterval); setTimerInterval(null);
      setTimer({ minutes: 0, seconds: 0 });
      return; 
    }

    const levelForTimer = blindStructureData?.levels?.[displayedLevelIndex];
    
    if (levelForTimer && sessionStatus === 'ACTIVE') {
      if (timerInterval) clearInterval(timerInterval); setTimerInterval(null);
      
      const isSyncedWithServer = displayedLevelIndex === serverLevelIndex;
      const levelDuration = levelForTimer.duration;
      let startTime = sessionStartTime ? new Date(sessionStartTime) : new Date();
      
      // Estimate start time if display is ahead (optimistic update)
      if (!isSyncedWithServer && displayedLevelIndex > serverLevelIndex) {
        const prevLevelIndex = displayedLevelIndex - 1;
        const prevLevel = blindStructureData?.levels?.[prevLevelIndex];
        if (prevLevel && sessionStartTime) {
          const prevLevelDurationMs = (prevLevel.duration || 0) * 60 * 1000;
          startTime = new Date(new Date(sessionStartTime).getTime() + prevLevelDurationMs);
        } else { startTime = new Date(); }
      } else if (!sessionStartTime) { startTime = new Date(); }

      const now = new Date();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = levelDuration * 60;
      let remainingSeconds = totalSeconds - elapsedSeconds;
      
      // --- Initial Check for Admin Auto-Advance --- 
      if (isSyncedWithServer && remainingSeconds <= 0 && isAdmin && !hasAdvancedLevelRef.current) {
        console.log(`[Timer] Initial time <= 0 for synced level ${displayedLevelIndex}. Attempting admin advance.`);
        hasAdvancedLevelRef.current = true; 
        setTimeout(async () => {
          try {
            setBlindsLoading(true);
            await updateBlindLevel(displayedLevelIndex + 1);
          } catch (error) {
            console.error("[Timer] Error initial advance:", error);
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

            const nextLevelIndex = displayedLevelIndex + 1;
            const nextLevel = blindStructureData?.levels?.[nextLevelIndex];

            if (nextLevel) {
              console.log(`[Timer] Interval hit 0 for display level ${displayedLevelIndex}. Advancing display to ${nextLevelIndex}.`);
              setDisplayedLevelIndex(nextLevelIndex);
              const nextDuration = nextLevel.duration || 0;
              setTimer({ minutes: nextDuration, seconds: 0 });
            } else {
              console.log(`[Timer] Interval hit 0, no next level found.`);
            }
            
            if (isAdmin && !hasAdvancedLevelRef.current && !blindsLoading && isSyncedWithServer) {
              console.log(`[Timer] Admin detected timer end for synced level ${displayedLevelIndex}. Triggering backend update.`);
              hasAdvancedLevelRef.current = true; 
              setTimeout(async () => {
                try {
                  setBlindsLoading(true);
                  await updateBlindLevel(displayedLevelIndex + 1);
                } catch (error) {
                  console.error("[Timer] Error interval advance:", error);
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
      if (timerInterval) clearInterval(timerInterval); setTimerInterval(null);
      setTimer({ minutes: 0, seconds: 0 });
    } 
  }, [blindStructureData, sessionStatus, sessionStartTime, isAdmin, updateBlindLevel, displayedLevelIndex, serverLevelIndex]);

  return { timer, formatTimer, blindsLoading, setBlindsLoading, displayedLevelIndex };
} 