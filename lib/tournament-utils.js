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
  
  // Get current level index
  const levelIndex = currentSession.currentBlindLevel;
  
  // Check if we're at or after break 2
  // Break 2 should be around level 8-9 in the sequence
  if (levelIndex >= 8) {
    return true;
  }
  
  // Check if the current level has special actions related to break 2
  const currentLevel = blindStructureData.currentLevel;
  if (currentLevel?.specialAction) {
    // These actions indicate we're at break 2 or later
    if (currentLevel.specialAction === 'CHIP_UP_5S' || 
        currentLevel.specialAction === 'REG_CLOSE' ||
        currentLevel.specialAction === 'REG_CLOSE_CHIP_UP_5S') {
      return true;
    }
  }
  
  // Check if registration has already closed by seeing if we're past any level with REG_CLOSE
  const regCloseIndex = blindStructureData.levels?.findIndex(l => 
    l.specialAction === 'REG_CLOSE' || 
    l.specialAction === 'REG_CLOSE_CHIP_UP_5S'
  );
  
  if (regCloseIndex !== -1 && regCloseIndex < levelIndex) {
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