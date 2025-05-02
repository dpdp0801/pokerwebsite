import { useState, useEffect, useCallback } from 'react';

export default function useSessionData() {
  const [sessionData, setSessionData] = useState({ exists: false, session: null, blindInfo: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Function to fetch details for a specific session ID
  const fetchSessionDetails = useCallback(async (sessionId) => {
    if (!sessionId) {
      console.log('[useSessionData] fetchSessionDetails called with no sessionId, resetting.');
      setSessionData({ exists: false, session: null, blindInfo: null });
      setError(null); // Clear previous errors
      setLoading(false);
      return;
    }
    
    console.log(`[useSessionData] Fetching details for session: ${sessionId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      console.log(`[useSessionData] fetch /api/sessions/${sessionId} status: ${response.status}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[useSessionData] Session ${sessionId} not found (404).`);
          setSessionData({ exists: false, session: null, blindInfo: null });
        } else {
          let errorText = `HTTP error! status: ${response.status}`;
          try {
             const errorData = await response.json();
             errorText = errorData.message || errorText;
          } catch {}
          throw new Error(errorText);
        }
      } else {
        const data = await response.json();
        console.log(`[useSessionData] Received data for session ${sessionId}`);
        if (data && data.exists && data.session && data.blindInfo) {
             console.log('[useSessionData] Setting sessionData state.');
             setSessionData(data);
        } else {
             console.error('[useSessionData] Received invalid session data structure:', data);
             throw new Error('Invalid data structure received from API.');
        }
      }
    } catch (e) {
      console.error("[useSessionData] Failed to fetch session details:", e);
      setError(e.message);
      setSessionData({ exists: false, session: null, blindInfo: null });
    } finally {
      console.log('[useSessionData] fetchSessionDetails finished.');
      setLoading(false);
    }
  }, []); // Dependencies managed via useCallback

  // Function to find the current active/not-started session ID
  const findCurrentSessionId = useCallback(async () => {
    console.log('[useSessionData] Finding current session ID...');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sessions'); // Hits GET /api/sessions/index.js
      console.log(`[useSessionData] fetch /api/sessions status: ${response.status}`);
      if (!response.ok) {
        let errorText = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorText = errorData.message || errorText;
        } catch {}
        throw new Error(errorText);
      }
      const data = await response.json();
      if (data && data.sessionId) {
        console.log(`[useSessionData] Found session ID: ${data.sessionId}`);
        setCurrentSessionId(data.sessionId); // Set the state
        await fetchSessionDetails(data.sessionId); // Fetch details immediately
      } else {
        console.log('[useSessionData] No current session ID found.');
        setCurrentSessionId(null);
        setSessionData({ exists: false, session: null, blindInfo: null });
        setLoading(false);
      }
    } catch (e) {
      console.error("[useSessionData] Failed to find current session ID:", e);
      setError(e.message);
      setCurrentSessionId(null);
      setSessionData({ exists: false, session: null, blindInfo: null });
      setLoading(false);
    }
  }, [fetchSessionDetails]);

  // Initial fetch to find the current session ID
  useEffect(() => {
    console.log('[useSessionData] Initial effect running...');
    findCurrentSessionId();
  }, [findCurrentSessionId]);

  // Exposed fetch function (can be used for manual refresh)
  const fetchSessionData = useCallback(async (sessionIdToRefresh = null) => {
      console.log(`[useSessionData] fetchSessionData called, explicit ID: ${sessionIdToRefresh}, current known ID: ${currentSessionId}`);
      const idToUse = sessionIdToRefresh || currentSessionId;
      if (idToUse) {
         console.log(`[useSessionData] Refreshing details for ID: ${idToUse}`);
         await fetchSessionDetails(idToUse);
      } else {
         console.log('[useSessionData] No ID known, attempting to find current session ID again...');
         await findCurrentSessionId();
      }
  }, [currentSessionId, fetchSessionDetails, findCurrentSessionId]);

  console.log('[useSessionData] Hook rendering. Loading:', loading, 'Error:', error, 'Exists:', sessionData.exists);
  return { sessionData, loading, error, fetchSessionData };
} 