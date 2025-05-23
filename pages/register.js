import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Register() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [paymentCode, setPaymentCode] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [buyInAmount, setBuyInAmount] = useState(100);

  // Fetch available sessions
  useEffect(() => {
    if (status === "authenticated") {
      fetchAvailableSessions();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const fetchAvailableSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions/available");
      
      if (!res.ok) {
        throw new Error("Failed to fetch available sessions");
      }
      
      const data = await res.json();
      
      // Get all available sessions
      const openSessions = data.sessions || [];
      
      setAvailableSessions(openSessions);
      
      // Set first session as selected if any exist
      if (openSessions.length > 0) {
        setSelectedSessionId(openSessions[0].id);
        setSelectedSession(openSessions[0]);
        setBuyInAmount(openSessions[0].type === "TOURNAMENT" ? 
          openSessions[0].buyIn : 
          openSessions[0].minBuyIn || 100);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
      toast({
        title: "Error",
        description: "Failed to load available sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update selected session when ID changes
  useEffect(() => {
    if (selectedSessionId) {
      const session = availableSessions.find(s => s.id === selectedSessionId);
      if (session) {
        setSelectedSession(session);
        setBuyInAmount(session.type === "TOURNAMENT" ? 
          session.buyIn : 
          session.minBuyIn || 100);
      }
    }
  }, [selectedSessionId, availableSessions]);

  // Check if user is authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      toast({
        title: "Authentication Required",
        description: "You must be signed in to register",
        variant: "destructive",
      });
      // Redirect to home page
      router.push("/");
    }
  }, [status, router, toast]);

  const cancelWaitlistRegistration = async () => {
    if (!registrationId) {
      toast({
        title: "Error",
        description: "Registration ID not found",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm("Are you sure you want to remove yourself from the waitlist?")) {
      try {
        const response = await fetch(`/api/registration?id=${registrationId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          toast({
            title: "Waitlist Entry Cancelled",
            description: "You have been removed from the waitlist successfully.",
          });
          // Redirect to home page or reload
          router.push('/');
        } else {
          const data = await response.json();
          throw new Error(data.error || "Failed to cancel waitlist registration");
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err.message || "An error occurred while cancelling your registration",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is signed in
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to register for the event",
        variant: "destructive",
      });
      return;
    }

    // Check if a session is selected
    if (!selectedSessionId || !selectedSession) {
      toast({
        title: "Session Required",
        description: "Please select a session to register for",
        variant: "destructive",
      });
      return;
    }
    
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Set the buy-in amount based on session type
      const finalBuyInAmount = selectedSession.type === "TOURNAMENT" 
        ? selectedSession.buyIn 
        : selectedSession.minBuyIn;
        
      // Submit registration to API
      const response = await fetch('/api/registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          buyInAmount: Number(finalBuyInAmount)
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRegistrationSubmitted(true);
        setPaymentCode(data.paymentCode);
        setRegistrationId(data.id);
        toast({
          title: "Registration Success",
          description: "Your registration has been submitted successfully",
        });
      } else if (data.error === "Already registered") {
        // Handle already registered case without showing error
        setRegistrationSubmitted(true);
        toast({
          title: "Already Registered",
          description: "You are already registered for this session",
        });
        
        // Update the selected session to reflect registration
        setSelectedSession({
          ...selectedSession,
          alreadyRegistered: true
        });
      } else {
        throw new Error(data.error || "Failed to register");
      }
    } catch (err) {
      console.error("Error submitting registration:", err);
      toast({
        title: "Registration Failed",
        description: err.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  // Show loading state while checking authentication
  if (status === "loading" || loading) {
    return (
      <div className="container py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2 text-muted-foreground">Loading registration...</p>
      </div>
    );
  }

  // If not authenticated, user will be redirected via the useEffect
  if (!session) {
    return (
      <div className="container py-12 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              You must be signed in to register for poker events.
            </p>
            <Button 
              className="w-full" 
              onClick={() => signIn('google')}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (availableSessions.length === 0) {
    return (
      <div className="container py-12 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              There are currently no open sessions to register for. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>
            Session Registration
          </CardTitle>
          <CardDescription>
            Register for an upcoming poker session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Player Information */}
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input 
                  id="name" 
                  defaultValue={session?.user?.name || ''} 
                  disabled 
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  defaultValue={session?.user?.email || ''} 
                  disabled 
                  className="mt-1"
                />
              </div>
              
              {/* Session Selection */}
              <div>
                <Label htmlFor="session">Select Session</Label>
                <Select 
                  value={selectedSessionId} 
                  onValueChange={setSelectedSessionId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.title} - {formatDate(session.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Session Details */}
              {selectedSession && (
                <div className="border p-3 rounded-md bg-muted/30">
                  <h3 className="font-medium mb-2">Session Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{' '}
                      {selectedSession.type === "TOURNAMENT" ? "Tournament" : "Cash Game"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>{' '}
                      {formatDate(selectedSession.date)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>{' '}
                      {formatTime(selectedSession.startTime)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{' '}
                      {selectedSession.location}
                    </div>
                    {selectedSession.maxPlayers && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Seats:</span>{' '}
                        <span className={selectedSession.seatsAvailable <= 3 ? "text-orange-600 font-medium" : ""}>
                          {selectedSession.seatsAvailable > 0 
                            ? `${selectedSession.seatsAvailable} of ${selectedSession.maxPlayers} available`
                            : "No seats available - waitlist only"}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Waitlist or seats information */}
                  {selectedSession.wouldBeWaitlisted ? (
                    <div className="mt-3 bg-yellow-50 p-2 rounded text-sm border border-yellow-200">
                      <p className="font-medium text-yellow-800">Waitlist Notice</p>
                      <p className="text-yellow-700 text-xs mt-1">
                        This session is at capacity. Your registration will be placed on the waitlist, and you'll 
                        be notified if a spot becomes available.
                      </p>
                    </div>
                  ) : null}
                  
                  {selectedSession.alreadyRegistered && (
                    <div className="mt-3 bg-red-50 p-2 rounded text-sm border border-red-200">
                      <p className="font-medium text-red-800">Already Registered</p>
                      <p className="text-red-700 text-xs mt-1">
                        You are already registered for this session.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Buy-In Amount (only for tournaments and not on waitlist) */}
              {selectedSession && 
               selectedSession.type === "TOURNAMENT" && 
               !selectedSession.wouldBeWaitlisted && (
                <div>
                  <Label htmlFor="buyIn">Buy-In Amount ($)</Label>
                  <Input 
                    id="buyIn" 
                    value={selectedSession.buyIn} 
                    disabled 
                    className="mt-1"
                  />
                </div>
              )}
              
              {/* Cash Game Policy */}
              {selectedSession && selectedSession.type === "CASH_GAME" && !selectedSession.wouldBeWaitlisted && (
                <div>
                  {/* Intentionally empty div for spacing */}
                </div>
              )}

              {/* Waitlist Policy (both tournament and cash game) */}
              {selectedSession && selectedSession.wouldBeWaitlisted && (
                <div className="border rounded-md p-3 bg-muted/30">
                  <p className="text-sm">
                    By joining the waitlist, you agree to our <Link href="/policy" className="text-primary hover:underline">policies</Link>.
                    No payment is required until a spot becomes available.
                  </p>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={isSubmitting || (selectedSession?.alreadyRegistered)}
            >
              {isSubmitting 
                ? 'Processing...' 
                : selectedSession?.alreadyRegistered
                  ? 'Already Registered'
                  : 'Submit Registration'
              }
            </Button>
          </form>
          
          {registrationSubmitted && (
            <div className="mt-8">
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-800">Registration Submitted!</AlertTitle>
                <AlertDescription className="text-green-700">
                  {selectedSession?.wouldBeWaitlisted 
                    ? "Your registration has been added to the waitlist. We'll contact you if a spot becomes available."
                    : ""}
                </AlertDescription>
              </Alert>
              
              {selectedSession?.wouldBeWaitlisted && (
                <div className="space-y-6 border rounded-md p-4">
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={cancelWaitlistRegistration}
                    >
                      Remove from Waitlist
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 