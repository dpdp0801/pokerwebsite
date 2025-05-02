import { useState, useEffect, useCallback } from 'react';

export default function useSessionData() {
  const [sessionData, setSessionData] = useState({ exists: false, session: null, blindInfo: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessionData = useCallback(async () => {
    // Don't refetch if already loading
    // if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the new consolidated session endpoint
      // Assuming you might pass an ID later, but for now fetches the single active/relevant session
      // If you need to fetch a specific session by ID (e.g., from URL), you'll need to pass the ID here
      // const response = await fetch(`/api/sessions/${sessionId}`); // Example if ID is needed
      
      // Let's check if there is *any* active or not started session
      // This might need adjustment based on how you identify the "current" session
      const response = await fetch('/api/sessions'); // Need to implement GET /api/sessions to find the one to show
      
      // ---- TEMPORARY HACK: Until GET /api/sessions is implemented properly ----
      // For now, let's hardcode fetching the session ID used previously if we can guess it
      // We need a reliable way to know *which* session to fetch status for.
      // Maybe we look for the *first* session with status ACTIVE or NOT_STARTED?
      // This is complex. Let's assume for now the status page will ONLY work if there's
      // an active session with a KNOWN ID passed via props or context.
      // We need to refactor how the Status page gets the session ID.
      
      // ---- REVERTING to a placeholder ----
      // We'll need to update the Status page to provide the session ID
      // For now, this hook can't fetch without an ID. We'll pass null.
      
      // ---- Let's assume the status page gets the ID and passes it ----
      // The hook should accept the ID as an argument
      /*
      async function fetchSessionData(sessionId) { // Modified signature
          if (!sessionId) {
              setSessionData({ exists: false, session: null, blindInfo: null });
              setLoading(false);
              return;
          }
          setLoading(true);
          setError(null);
          try {
             const response = await fetch(`/api/sessions/${sessionId}`);
             if (!response.ok) {
                 if (response.status === 404) {
                     setSessionData({ exists: false, session: null, blindInfo: null });
                 } else {
                     throw new Error(`HTTP error! status: ${response.status}`);
                 }
             } else {
                 const data = await response.json();
                 setSessionData(data); // data should match structure { exists: true, session: {...}, blindInfo: {...} }
             }
          } catch (e) {
              console.error("Failed to fetch session data:", e);
              setError(e.message);
              setSessionData({ exists: false, session: null, blindInfo: null });
          } finally {
              setLoading(false);
          }
      }
      */
      // For now, we will just return a non-existent session state
      // TODO: Refactor Status page to pass Session ID to this hook
      setSessionData({ exists: false, session: null, blindInfo: null });
      console.warn('useSessionData hook needs sessionId to function correctly after API consolidation.');
      
    } catch (e) {
      console.error("Failed to fetch session data:", e);
      setError(e.message);
      setSessionData({ exists: false, session: null, blindInfo: null });
    } finally {
      setLoading(false);
    }
  }, []); // Removed loading dependency

  // Initial fetch
  useEffect(() => {
    // fetchSessionData(); // Cannot fetch without ID
    setLoading(false); // Indicate loading is finished (as we can't fetch)
  }, [fetchSessionData]);

  return { sessionData, loading, error, fetchSessionData };
} 