/**
 * Utility functions for working with poker sessions
 */

/**
 * Format date from ISO string to YYYY-MM-DD
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

/**
 * Format time from ISO string to HH:MM
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted time string
 */
export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Get a formatted status string from a status code
 * @param {string} status - Status code
 * @returns {string} Human-readable status
 */
export function formatStatus(status) {
  if (!status) return '';
  
  const statusMap = {
    'not_started': 'Not Started',
    'active': 'Active',
    'paused': 'Paused',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'NOT_STARTED': 'Not Started',
    'ACTIVE': 'Active',
    'PAUSED': 'Paused',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled'
  };
  
  return statusMap[status] || status;
}

/**
 * Extract smallBlind and bigBlind from title or description
 * @param {string} title - Session title
 * @param {string} description - Session description
 * @returns {object} Object with smallBlind and bigBlind properties
 */
export function extractBlinds(title, description) {
  let smallBlind = 0.25; // Default values
  let bigBlind = 0.5;
  
  try {
    // First try to extract from title
    const titleMatch = title?.match(/\$([0-9.]+)\/\$([0-9.]+)/);
    if (titleMatch && titleMatch.length === 3) {
      smallBlind = parseFloat(titleMatch[1]);
      bigBlind = parseFloat(titleMatch[2]);
    } else {
      // Try to extract from description if title parsing failed
      const descMatch = description?.match(/\$([0-9.]+)\/\$([0-9.]+)/);
      if (descMatch && descMatch.length === 3) {
        smallBlind = parseFloat(descMatch[1]);
        bigBlind = parseFloat(descMatch[2]);
      }
    }
  } catch (err) {
    console.error("Error parsing blinds:", err);
  }
  
  return { smallBlind, bigBlind };
} 