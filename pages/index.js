import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/router";

// Import the session creation dialog components directly
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/lib/hooks/use-toast";

export default function Home() {
  const { data: session } = useSession();
  const [showDialog, setShowDialog] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [sessionExists, setSessionExists] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const router = useRouter();
  const { toast } = useToast();
  
  // Added direct creation dialog state
  const [createSessionDialog, setCreateSessionDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    type: "mtt",
    date: "",
    time: "",
    buyIn: 100,
    maxPlayers: 9,
    location: "385 S Catalina Ave",
    bigBlind: 0.5,
    smallBlind: 0.2,
    minBuyIn: 50
  });
  
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
      // Cash game - use the smallBlind/bigBlind values that were extracted in the API
      const smallBlind = sessionData.smallBlind || 0.25;
      const bigBlind = sessionData.bigBlind || 0.5;
      return `$${smallBlind}/$${bigBlind} NLH ${sessionData.maxPlayers}-Max Cash Game`;
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
  
  // Add handleCreateSession function
  const handleCreateSession = () => {
    console.log("Create Session button clicked");
    
    // First, validate the form is filled out properly
    // Prepare a copy of the form data for validation
    const formData = { ...newSession };
    
    // Log full form data for debugging
    console.log("Form data:", formData);
    
    // Validate form
    if (!formData.date || !formData.time || !formData.maxPlayers) {
      console.log("Validation failed: Missing required fields");
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Type-specific validation
    if (formData.type === "mtt" && !formData.buyIn) {
      console.log("Validation failed: Missing buy-in for tournament");
      toast({
        title: "Validation Error",
        description: "Please enter a buy-in amount for the tournament",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.type === "cash" && (!formData.smallBlind || !formData.bigBlind || !formData.minBuyIn)) {
      console.log("Validation failed: Missing cash game fields");
      toast({
        title: "Validation Error",
        description: "Please enter blinds and minimum buy-in for the cash game",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare data for API
    // Make sure all numeric values are actually numbers not strings
    const apiData = {
      type: formData.type,
      date: formData.date,
      time: formData.time,
      maxPlayers: Number(formData.maxPlayers),
      location: formData.location,
      buyIn: formData.type === "mtt" ? Number(formData.buyIn) : undefined,
      smallBlind: formData.type === "cash" ? Number(formData.smallBlind) : undefined,
      bigBlind: formData.type === "cash" ? Number(formData.bigBlind) : undefined,
      minBuyIn: formData.type === "cash" ? Number(formData.minBuyIn) : undefined
    };
    
    console.log("Sending data to API:", apiData);
    
    // Send data to API
    fetch('/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    })
    .then(response => {
      console.log("API Response status:", response.status);
      if (!response.ok) {
        return response.json().then(errData => {
          throw new Error(errData.message || `Server responded with status ${response.status}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log("API Response data:", data);
      if (data.success) {
        setCreateSessionDialog(false);
        
        toast({
          title: "Session Created",
          description: `A new ${formData.type === 'mtt' ? 'tournament' : 'cash game'} has been created.`
        });
        
        // Refresh the page to show the new session
        window.location.reload();
      } else {
        console.error("API error:", data.message);
        toast({
          title: "Error",
          description: data.message || "An error occurred while creating the session",
          variant: "destructive"
        });
      }
    })
    .catch(error => {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while creating the session. Check the console for details.",
        variant: "destructive"
      });
    });
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
                onClick={() => setCreateSessionDialog(true)} 
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
      
      {/* Create Session Dialog */}
      <Dialog open={createSessionDialog} onOpenChange={setCreateSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>
              Set up a new poker tournament or cash game.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sessionType">Session Type</Label>
              <Select 
                value={newSession.type} 
                onValueChange={(value) => setNewSession({...newSession, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtt">Tournament (MTT)</SelectItem>
                  <SelectItem value="cash">Cash Game</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={newSession.date}
                  onChange={(e) => setNewSession({...newSession, date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input 
                  id="time" 
                  type="time" 
                  value={newSession.time}
                  onChange={(e) => setNewSession({...newSession, time: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="buyIn">Buy-in Amount ($)</Label>
              <Input 
                id="buyIn" 
                type="number" 
                min="1"
                value={newSession.buyIn}
                onChange={(e) => setNewSession({...newSession, buyIn: Number(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Maximum Players</Label>
              <Input 
                id="maxPlayers" 
                type="number" 
                min="2"
                value={newSession.maxPlayers}
                onChange={(e) => setNewSession({...newSession, maxPlayers: Number(e.target.value)})}
              />
            </div>
            
            {newSession.type === "cash" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bigBlind">Big Blind</Label>
                  <Input 
                    id="bigBlind" 
                    type="number" 
                    min="0"
                    value={newSession.bigBlind}
                    onChange={(e) => setNewSession({...newSession, bigBlind: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smallBlind">Small Blind</Label>
                  <Input 
                    id="smallBlind" 
                    type="number" 
                    min="0"
                    value={newSession.smallBlind}
                    onChange={(e) => setNewSession({...newSession, smallBlind: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="minBuyIn">Minimum Buy-in</Label>
                  <Input 
                    id="minBuyIn" 
                    type="number" 
                    min="1"
                    value={newSession.minBuyIn}
                    onChange={(e) => setNewSession({...newSession, minBuyIn: Number(e.target.value)})}
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setCreateSessionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession}>
              Create Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}