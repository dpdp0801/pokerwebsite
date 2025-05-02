import { format, parse } from 'date-fns';

// Format date for display from YYYY-MM-DD string
export const formatDate = (dateString_YYYY_MM_DD) => {
  if (!dateString_YYYY_MM_DD || typeof dateString_YYYY_MM_DD !== 'string') return "Invalid Date";
  try {
    // Parse YYYY-MM-DD string into a Date object (defaults to local time interpretation)
    const parsedDate = parse(dateString_YYYY_MM_DD, 'yyyy-MM-dd', new Date());
    return format(parsedDate, 'MMM d, yyyy');
  } catch (e) {
    console.error('Error formatting date string:', dateString_YYYY_MM_DD, e);
    return 'Invalid Date';
  }
};

/**
 * Format only the time part from either HH:MM string or ISO date string
 */
export const formatTimeOnly = (timeString) => {
  if (!timeString) return 'TBD';
  
  try {
    let parsedTime;
    
    // Check if this is an ISO date string (contains T and possibly Z)
    if (typeof timeString === 'string' && (timeString.includes('T') || timeString.includes('Z'))) {
      // Parse ISO date string directly
      parsedTime = new Date(timeString);
      
      // For debugging
      console.log('ISO Time parsed:', parsedTime, 'from:', timeString);
      
    } else if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
      // Parse HH:MM format
      parsedTime = parse(timeString, 'HH:mm', new Date());
      
      // For debugging
      console.log('HH:MM Time parsed:', parsedTime, 'from:', timeString);
      
    } else {
      // Try to parse as date directly as fallback
      parsedTime = new Date(timeString);
      
      // For debugging
      console.log('Generic Time parsed:', parsedTime, 'from:', timeString);
    }
    
    // Verify we got a valid date before formatting
    if (!parsedTime || isNaN(parsedTime.getTime())) {
      console.log('Invalid time value:', timeString);
      
      // If timeString is a string with a colon in it, try to extract the time
      if (typeof timeString === 'string' && timeString.includes(':')) {
        const timeParts = timeString.split(':');
        if (timeParts.length >= 2) {
          const hour = parseInt(timeParts[0], 10);
          const minute = parseInt(timeParts[1], 10);
          
          if (!isNaN(hour) && !isNaN(minute)) {
            // Valid hour and minute
            const ampm = hour >= 12 ? 'pm' : 'am';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
          }
        }
      }
      
      return timeString || 'TBD';
    }
    
    return format(parsedTime, 'h:mm a');
  } catch (e) {
    console.error('Error formatting time string:', timeString, e);
    
    // Return the original timeString if it's a string, or TBD as fallback
    return typeof timeString === 'string' ? timeString : 'TBD';
  }
};

// Get initials for avatar
export const getInitials = (name) => {
  if (!name) return "?";
  
  // Extract first and last initials from the name string
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
    
  return initials;
};

// Calculate payout amount
export const calculatePayout = (percentage, buyIn, playerCount) => {
  // Add safety checks
  if (!percentage || !buyIn || !playerCount || playerCount <= 0) {
    return '0.00';
  }
  const totalPrizePool = buyIn * playerCount;
  return (totalPrizePool * (percentage / 100)).toFixed(2);
};

// Format timer for display
export const formatTimerDisplay = (minutes, seconds) => {
  // Prevent negative values
  const displayMinutes = Math.max(0, minutes);
  const displaySeconds = Math.max(0, seconds);
  
  return `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
};

// Check if payouts should be shown
export const shouldShowPayouts = (blindStructureData, currentSession) => {
  // If we don't have blind data or current level, we can't show payouts
  if (!blindStructureData || !currentSession) {
    return false;
  }
  
  // Registration closed is an immediate yes
  if (currentSession.registrationClosed) {
    return true;
  }
  
  // Get current level index
  const currentLevelIndex = currentSession.currentBlindLevel || 0;
  
  // Check if blind structure data has levels
  if (!blindStructureData.levels || blindStructureData.levels.length === 0) {
    return false;
  }
  
  // Find the index of Break 2
  const break2Index = blindStructureData.levels.findIndex(level => 
    level.isBreak && level.breakName === 'B2'
  );
  
  // If Break 2 exists and we're at or past it, show payouts
  if (break2Index !== -1 && currentLevelIndex >= break2Index) {
    return true;
  }
  
  // If no Break 2, check for special actions
  const regCloseIndex = blindStructureData.levels.findIndex(level => 
    level.specialAction && (
      level.specialAction === 'REG_CLOSE' || 
      level.specialAction === 'REG_CLOSE_CHIP_UP_5S'
    )
  );
  
  if (regCloseIndex !== -1 && currentLevelIndex >= regCloseIndex) {
    return true;
  }
  
  // Last fallback - show payouts at level 6 or higher
  if (currentLevelIndex >= 6) {
    return true;
  }
  
  // By default, don't show payouts yet
  return false;
};

// Get next blind level
export const getNextLevel = (blindStructureData, currentSession) => {
  if (!blindStructureData?.levels || currentSession?.currentBlindLevel === undefined) {
    return null;
  }
  
  const currentLevelIndex = currentSession.currentBlindLevel;
  if (currentLevelIndex < blindStructureData.levels.length - 1) {
    return {
      ...blindStructureData.levels[currentLevelIndex + 1],
      levelNumber: (blindStructureData.currentLevel?.level || 0) + 1
    };
  }
  
  return null;
}; 