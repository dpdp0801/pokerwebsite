// This file provides a centralized place to import authOptions
// This prevents relative path issues when importing from different API route depths

// Re-export authOptions to avoid circular dependencies
export { authOptions } from './auth-options';

// Add any other auth utility functions here that don't depend on authOptions 