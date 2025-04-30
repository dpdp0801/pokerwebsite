import { useState, useEffect } from 'react';
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

  // Format timer for display
  const formatTimer = () => formatTimerDisplay(timer.minutes, timer.seconds);

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
  }, [blindStructureData, sessionData, isAdmin, blindsLoading, updateBlindLevel]);

  return { timer, formatTimer, blindsLoading, setBlindsLoading };
} 