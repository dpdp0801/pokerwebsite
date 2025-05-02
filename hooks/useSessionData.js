import { useState, useEffect, useCallback } from 'react';

export default function useSessionData() {
  const [sessionData, setSessionData] = useState({ exists: false, session: null, blindInfo: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Function to fetch details for a specific session ID
  const fetchSessionDetails = useCallback(async (sessionId) => {
    if (!sessionId) {
      setSessionData({ exists: false, session: null, blindInfo: null });
      setError(null); // Clear previous errors
      setLoading(false);
      return;
    }
    
    console.log(`Fetching details for session: ${sessionId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Session ${sessionId} not found.`);
          setSessionData({ exists: false, session: null, blindInfo: null });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
      } else {
        const data = await response.json();
        // Ensure data structure matches expectations
        if (data && data.exists && data.session && data.blindInfo) {
             setSessionData(data);
        } else {
             console.error('Received invalid session data structure:', data);
             throw new Error('Invalid data structure received from API.');
        }
      }
    } catch (e) {
      console.error("Failed to fetch session details:", e);
      setError(e.message);
      setSessionData({ exists: false, session: null, blindInfo: null });
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies managed via useCallback

  // Function to find the current active/not-started session ID
  const findCurrentSessionId = useCallback(async () => {
    console.log('Finding current session ID...');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sessions'); // Hits GET /api/sessions/index.js
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.sessionId) {
        console.log(`Found session ID: ${data.sessionId}`);
        setCurrentSessionId(data.sessionId);
        await fetchSessionDetails(data.sessionId);
      } else {
        console.log('No current session ID found.');
        setCurrentSessionId(null);
        setSessionData({ exists: false, session: null, blindInfo: null });
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to find current session ID:", e);
      setError(e.message);
      setCurrentSessionId(null);
      setSessionData({ exists: false, session: null, blindInfo: null });
      setLoading(false);
    }
  }, [fetchSessionDetails]);

  // Initial fetch to find the current session ID
  useEffect(() => {
    findCurrentSessionId();
  }, [findCurrentSessionId]);

  // Exposed fetch function (can be used for manual refresh)
  // Now accepts an optional ID for targeted refresh
  const fetchSessionData = useCallback(async (sessionIdToRefresh = null) => {
      const idToUse = sessionIdToRefresh || currentSessionId;
      if (idToUse) {
         await fetchSessionDetails(idToUse);
      } else {
         // If no ID known, try finding it again
         await findCurrentSessionId();
      }
  }, [currentSessionId, fetchSessionDetails, findCurrentSessionId]);

  return { sessionData, loading, error, fetchSessionData };
} 