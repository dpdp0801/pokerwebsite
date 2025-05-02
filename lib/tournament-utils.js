import { format, parseISO, differenceInSeconds } from 'date-fns';

// Format date for display from YYYY-MM-DD string OR ISO string
export const formatDate = (dateInput) => {
  if (!dateInput) return "Invalid Date";
  try {
    // Check if it looks like an ISO string (contains T or Z)
    if (typeof dateInput === 'string' && (dateInput.includes('T') || dateInput.includes('Z'))) {
       return format(parseISO(dateInput), 'MMM d, yyyy');
    } else if (typeof dateInput === 'string') { 
       // Assume YYYY-MM-DD string format
       const [year, month, day] = dateInput.split('-').map(Number);
       const localDate = new Date(year, month - 1, day);
       return format(localDate, 'MMM d, yyyy');
    } else if (dateInput instanceof Date) {
       // Handle if it's already a Date object (less likely from DB)
       return format(dateInput, 'MMM d, yyyy');
    }
    return 'Invalid Date Format';
  } catch (e) {
    console.error('Error formatting date string:', dateInput, e);
    return 'Invalid Date';
  }
};

/**
 * Format only the time part of a date string or use timeString if available
 */
export const formatTimeOnly = (dateTimeString, timeString = null) => {
  if (timeString) { // Prioritize timeString if provided
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const dummyDate = new Date();
      dummyDate.setHours(hours, minutes, 0, 0);
      return format(dummyDate, 'h:mm a');
    } catch (e) {
      console.error('Error formatting timeString in formatTimeOnly:', timeString, e);
      // Fallback to dateTimeString if timeString fails
    }
  }
  if (dateTimeString) { // Fallback to dateTimeString (likely UTC)
    try {
      return format(parseISO(dateTimeString), 'h:mm a');
    } catch (e) {
      console.error('Error formatting dateTimeString in formatTimeOnly:', dateTimeString, e);
      return 'Invalid time';
    }
  }
  return 'TBD'; // If neither is available
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