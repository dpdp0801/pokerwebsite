import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { data: session } = useSession();
  const [showDialog, setShowDialog] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [sessionExists, setSessionExists] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  
  useEffect(() => {
    // Make the API call to check session status
    const checkSessionStatus = async () => {
      try {
        const response = await fetch('/api/session-status');
        const data = await response.json();
        setSessionExists(data.exists);
        setSessionData(data.exists ? data.session : null);
      } catch (error) {
        console.error('Error checking session status:', error);
        // If there's an error, assume no session exists
        setSessionExists(false);
        setSessionData(null);
      }
    };
    
    checkSessionStatus();
  }, []);

  // Format date from ISO string
  const formatEventDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Format time from ISO string
  const formatEventTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleRegisterClick = () => {
    // First check if user is authenticated
    if (!session) {
      setShowSignInDialog(true);
      return;
    }
    
    // Then check if poker session exists
    if (!sessionExists) {
      setShowDialog(true);
    } else {
      // If user is authenticated and session exists, proceed to registration page
      window.location.href = "/register";
    }
  };

  // Generate dynamic title based on session type
  const getSessionTitle = () => {
    if (!sessionData) return '';
    
    if (sessionData.type === 'MTT' || sessionData.type === 'TOURNAMENT') {
      return `$${sessionData.buyIn} NLH ${sessionData.maxPlayers}-Max Tournament`;
    } else {
      // Cash game
      return `$${sessionData.smallBlind}/$${sessionData.bigBlind} NLH ${sessionData.maxPlayers}-Max Cash Game`;
    }
  };

  // Get session status badge
  const getStatusBadge = () => {
    if (!sessionData) return null;
    
    let color = "bg-yellow-100 text-yellow-800";
    let label = "Not Started";
    
    if (sessionData.status === 'ACTIVE') {
      color = "bg-green-100 text-green-800";
      label = "In Progress";
    } else if (sessionData.status === 'COMPLETED') {
      color = "bg-gray-100 text-gray-800";
      label = "Completed";
    } else if (sessionData.status === 'CANCELLED') {
      color = "bg-red-100 text-red-800";
      label = "Cancelled";
    }
    
    return <Badge className={color}>{label}</Badge>;
  };

  return (
    <>
      <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 -mt-16">
        {sessionExists && sessionData ? (
          // Content when session exists
          <>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight uppercase">
              {getSessionTitle()}
            </h1>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <p className="text-muted-foreground text-base md:text-lg tracking-wide">
                {formatEventDate(sessionData.date)} · {formatEventTime(sessionData.startTime)} &mdash; {sessionData.location}
              </p>
              {getStatusBadge()}
            </div>
            
            <div className="mt-6 bg-muted/50 p-4 rounded-md max-w-md">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Registered Players:</span>
                <span className="font-medium">{sessionData.registeredPlayers || 0} of {sessionData.maxPlayers}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{
                    width: `${sessionData.maxPlayers 
                      ? Math.min((sessionData.registeredPlayers || 0) / sessionData.maxPlayers * 100, 100) 
                      : 0}%`
                  }}
                />
              </div>
            </div>

            <Button 
              onClick={handleRegisterClick} 
              className="mt-10"
              disabled={sessionData.status === 'COMPLETED' || sessionData.status === 'CANCELLED'}
            >
              Register Now
            </Button>
            
            {sessionData.description && (
              <p className="mt-6 text-sm text-muted-foreground max-w-lg">
                {sessionData.description}
              </p>
            )}
          </>
        ) : (
          // Content when no session exists
          <>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              No Events Scheduled
            </h1>
            <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-md">
              There are no poker events scheduled at this time. Please check back later for upcoming tournaments and cash games.
            </p>
            
            {session?.role === "ADMIN" && (
              <Button 
                onClick={() => window.location.href = "/admin"} 
                className="mt-10"
              >
                Create Session
              </Button>
            )}
          </>
        )}
      </section>

      {/* Dialog for when no session exists */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Active Session</DialogTitle>
            <DialogDescription>
              There is currently no active poker session available for registration. Please check back later or contact the administrator for more information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for when user is not signed in */}
      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You must be signed in to register for poker events. Would you like to sign in now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSignInDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => signIn('google')}>
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}