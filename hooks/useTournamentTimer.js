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
    // *** Add checks for sessionData existence ***
    if (!sessionData || !sessionData.exists || !sessionData.session) {
        // If no valid session data, clear any existing interval and do nothing
        if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }
        setTimer({ minutes: 0, seconds: 0 }); // Reset timer display
        return; 
    }
    
    // Reset advance tracker when the level index changes externally
    // Now safe to access currentBlindLevel because of the check above
    if (sessionData.session.currentBlindLevel !== currentLevelIndexRef.current) {
      console.log(`[Timer] Level index changed externally (${currentLevelIndexRef.current} -> ${sessionData.session.currentBlindLevel}). Resetting advance tracker.`);
      hasAdvancedLevelRef.current = false;
      currentLevelIndexRef.current = sessionData.session.currentBlindLevel;
    }
    
    // Proceed only if session is ACTIVE and we have blind structure info
    if (blindStructureData?.currentLevel && sessionData.session.status === 'ACTIVE') {
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
      if (remainingSeconds <= 0 && isAdmin && !hasAdvancedLevelRef.current) {
        console.log(`[Timer] Initial time is already <= 0 for level ${currentLevelIndex}. Attempting advance.`);
        hasAdvancedLevelRef.current = true; // Mark as attempted
        setTimeout(async () => {
          try {
            setBlindsLoading(true);
            await updateBlindLevel(currentLevelIndex + 1);
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
      const initialMinutes = Math.floor(remainingSeconds / 60);
      const initialSeconds = remainingSeconds % 60;
      
      setTimer({ minutes: initialMinutes, seconds: initialSeconds });

      // --- Interval Logic --- 
      const interval = setInterval(() => {
        setTimer(prevTimer => {
          let newMinutes = prevTimer.minutes;
          let newSeconds = prevTimer.seconds;

          if (newMinutes === 0 && newSeconds === 0) {
            clearInterval(interval);
            setTimerInterval(null);
            return prevTimer; 
          }

          newSeconds--;
          if (newSeconds < 0) {
            newSeconds = 59;
            newMinutes--;
          }
          
          if (newMinutes <= 0 && newSeconds <= 0) {
            newMinutes = 0;
            newSeconds = 0;
            clearInterval(interval); 
            setTimerInterval(null);

            if (isAdmin && !hasAdvancedLevelRef.current && !blindsLoading) {
               console.log(`[Timer] Interval timer hit 0 for level ${currentLevelIndexRef.current}. Attempting advance.`);
               hasAdvancedLevelRef.current = true; 
               setTimeout(async () => {
                 try {
                   setBlindsLoading(true);
                   await updateBlindLevel((currentLevelIndexRef.current || 0) + 1);
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
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else { 
      // If session not ACTIVE or no blind data, ensure timer is cleared/reset
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setTimer({ minutes: 0, seconds: 0 });
    } 
  }, [blindStructureData, sessionData, isAdmin, updateBlindLevel]);

  return { timer, formatTimer, blindsLoading, setBlindsLoading };
} 