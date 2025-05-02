import { useState, useEffect } from 'react';

export default function useSessionData() {
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState({
    exists: false,
    session: null
  });
  
  // Fetch session data
  const fetchSessionData = async (initialLoad = false) => {
    try {
      // Only show loading state on initial load
      if (initialLoad) {
        setLoading(true);
      }
      
      const response = await fetch('/api/session-status');
      const data = await response.json();
      
      // Update the session data state without causing a flash
      setSessionData(prevData => {
        // If it's the first load or session existence changed
        if (initialLoad || prevData.exists !== data.exists) {
          return data;
        }
        
        // For subsequent loads, if the session exists, merge
        // the new data with the existing data to avoid UI flickering
        if (data.exists && prevData.exists) {
          return {
            exists: true,
            session: {
              ...prevData.session,
              ...data.session,
              // Keep the same objects for these unless they've actually changed
              // This prevents unnecessary re-renders
              registrations: {
                current: data.session.registrations.current,
                waitlist: data.session.registrations.waitlist,
                eliminated: data.session.registrations.eliminated,
                itm: data.session.registrations.itm
              }
            }
          };
        }
        
        return data;
      });
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      // Only update loading state on initial load
      if (initialLoad) {
        setLoading(false);
      }
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSessionData(true);
    
    // Set up polling to refresh data every 10 seconds
    const intervalId = setInterval(() => {
      fetchSessionData(false);
    }, 10000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return { 
    loading, 
    sessionData, 
    fetchSessionData
  };
} 