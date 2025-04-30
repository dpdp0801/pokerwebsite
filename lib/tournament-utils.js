// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Format time for display
export const formatTimeOnly = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
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