import { useState, useEffect, useRef } from 'react';
import { formatTimerDisplay } from '@/lib/tournament-utils';

export default function useTournamentTimer(
  blindStructureData, 
  sessionData, 
  isAdmin, 
  updateBlindLevel
) {
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0 });
  const [timerInterval, setTimerInterval] = useState(null);
  const [blindsLoading, setBlindsLoading] = useState(false);
  const hasAdvancedLevelRef = useRef(false); // Track if advance was triggered for the current level
  const currentLevelIndexRef = useRef(null); // Track the level index this timer instance is for

  // Format timer for display
  const formatTimer = () => formatTimerDisplay(timer.minutes, timer.seconds);

  // Start timer for blind levels
  useEffect(() => {
    // Reset advance tracker when the level index changes externally
    if (sessionData?.session?.currentBlindLevel !== currentLevelIndexRef.current) {
      console.log(`[Timer] Level index changed externally (${currentLevelIndexRef.current} -> ${sessionData.session.currentBlindLevel}). Resetting advance tracker.`);
      hasAdvancedLevelRef.current = false;
      currentLevelIndexRef.current = sessionData.session.currentBlindLevel;
    }

    if (blindStructureData?.currentLevel && sessionData.exists && sessionData.session.status === 'ACTIVE') {
      // Clear any existing interval before setting up a new one
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null); // Ensure state is updated
      }

      const currentLevelIndex = sessionData.session.currentBlindLevel ?? 0;
      currentLevelIndexRef.current = currentLevelIndex; // Store current level

      const levelDuration = blindStructureData.currentLevel.duration;
      const startTime = sessionData.session.levelStartTime 
        ? new Date(sessionData.session.levelStartTime)
        : new Date();

      const now = new Date();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = levelDuration * 60;
      let remainingSeconds = totalSeconds - elapsedSeconds;

      // --- Initial Check --- 
      // If timer is already zero or past, AND we haven't tried advancing this level yet
      if (remainingSeconds <= 0 && isAdmin && !hasAdvancedLevelRef.current) {
        console.log(`[Timer] Initial time is already <= 0 for level ${currentLevelIndex}. Attempting advance.`);
        hasAdvancedLevelRef.current = true; // Mark as attempted
        // Use setTimeout to avoid potential state update issues within useEffect
        setTimeout(async () => {
          try {
            setBlindsLoading(true);
            await updateBlindLevel(currentLevelIndex + 1);
            // Resetting hasAdvancedLevelRef happens when level index changes
          } catch (error) {
            console.error("[Timer] Error advancing level on initial load:", error);
            hasAdvancedLevelRef.current = false; // Allow retry on error
          } finally {
            setBlindsLoading(false);
          }
        }, 50); // Short delay
        // Set timer to 0:00 and don't start interval
        setTimer({ minutes: 0, seconds: 0 });
        return; // Exit effect early
      }
      
      // Ensure remaining seconds isn't negative for timer start
      remainingSeconds = Math.max(0, remainingSeconds);
      const initialMinutes = Math.floor(remainingSeconds / 60);
      const initialSeconds = remainingSeconds % 60;
      
      setTimer({ minutes: initialMinutes, seconds: initialSeconds });

      // --- Interval Logic --- 
      const interval = setInterval(() => {
        setTimer(prevTimer => {
          let newMinutes = prevTimer.minutes;
          let newSeconds = prevTimer.seconds;

          if (newMinutes === 0 && newSeconds === 0) {
            // Already at zero, clear interval and do nothing else here
            // The advance logic is handled below after state update
            clearInterval(interval);
            setTimerInterval(null);
            return prevTimer; 
          }

          newSeconds--;
          if (newSeconds < 0) {
            newSeconds = 59;
            newMinutes--;
          }
          
          // Check if timer is finished *after* decrementing
          if (newMinutes <= 0 && newSeconds <= 0) {
            newMinutes = 0;
            newSeconds = 0;
            clearInterval(interval); // Stop the interval
            setTimerInterval(null);

            // Use a flag to ensure advance is called only once when timer hits zero
            if (isAdmin && !hasAdvancedLevelRef.current && !blindsLoading) {
              console.log(`[Timer] Interval timer hit 0 for level ${currentLevelIndexRef.current}. Attempting advance.`);
              hasAdvancedLevelRef.current = true; // Mark that we are attempting advance for this level
              // Use setTimeout to ensure state update completes before API call
              setTimeout(async () => {
                try {
                  setBlindsLoading(true);
                  await updateBlindLevel((currentLevelIndexRef.current || 0) + 1);
                  // Resetting hasAdvancedLevelRef happens when level index changes
                } catch (error) {
                  console.error("[Timer] Error advancing level from interval:", error);
                  hasAdvancedLevelRef.current = false; // Allow retry on error
                } finally {
                  setBlindsLoading(false);
                }
              }, 50); // Short delay
            }
          }
          return { minutes: newMinutes, seconds: newSeconds };
        });
      }, 1000);
      
      setTimerInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [blindStructureData, sessionData, isAdmin, updateBlindLevel]);

  return { timer, formatTimer, blindsLoading, setBlindsLoading };
} 