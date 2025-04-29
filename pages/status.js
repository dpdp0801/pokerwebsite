import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Hourglass, Clock, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Status() {
  // This would come from an API in a real implementation
  const [sessionData, setSessionData] = useState({
    exists: false,
    type: null, // 'mtt' or 'cash'
    status: 'not_started', // 'not_started', 'ongoing', 'paused', 'ended'
    // MTT specific
    blinds: '25/50',
    ante: 0,
    registrationStatus: 'open', // 'open', 'closed'
    timer: 0, // seconds remaining in level
    seats: { total: 18, open: 10 },
    entries: 8,
    waitlist: 2,
    startingStack: 10000,
    // Cash specific
    minBuyIn: 200,
  });

  const { data: session } = useSession();
  const isAdmin = session?.role === "ADMIN";
  const router = useRouter();

  // Simulate timer countdown
  useEffect(() => {
    let interval;
    if (sessionData.exists && sessionData.status === 'ongoing' && sessionData.type === 'mtt') {
      interval = setInterval(() => {
        setSessionData(prev => ({
          ...prev,
          timer: prev.timer > 0 ? prev.timer - 1 : 0
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionData.exists, sessionData.status, sessionData.type]);

  // Format timer as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!sessionData.exists) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span>Current Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground text-lg mb-6">
              No session is currently ongoing
            </p>
            
            {isAdmin && (
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    // Use imperative navigation with prevent-cache parameter
                    router.push({
                      pathname: "/admin",
                      query: { action: "create-session", t: Date.now() }
                    });
                  }}
                >
                  Create Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionData.type === 'mtt') {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <span>Tournament Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                sessionData.status === 'ongoing' ? 'bg-green-100 text-green-800' : 
                sessionData.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-blue-100 text-blue-800'
              }`}>
                {sessionData.status === 'ongoing' ? 'Live' : 
                 sessionData.status === 'paused' ? 'Paused' : 'Not Started'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  {sessionData.status === 'ongoing' ? (
                    <Hourglass className="h-5 w-5 animate-pulse text-primary" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <p className="text-2xl font-bold">
                    {sessionData.status === 'ongoing' ? formatTime(sessionData.timer) : 'Paused'}
                  </p>
                </div>
                <p className="text-muted-foreground">
                  {sessionData.status === 'ongoing' ? 'Time Remaining' : 'Tournament Paused'}
                </p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.blinds}</p>
                <p className="text-muted-foreground">Current Blinds</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.ante > 0 ? sessionData.ante : 'None'}</p>
                <p className="text-muted-foreground">Ante</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.registrationStatus}</p>
                <p className="text-muted-foreground">Registration</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.startingStack.toLocaleString()}</p>
                <p className="text-muted-foreground">Starting Stack</p>
              </div>
              
              <div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xl font-medium">{sessionData.seats.open}/{sessionData.seats.total}</p>
                </div>
                <p className="text-muted-foreground">Available Seats</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.entries}</p>
                <p className="text-muted-foreground">Total Entries</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.waitlist}</p>
                <p className="text-muted-foreground">Waitlist</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isAdmin && (
          <div className="mt-6 border-t pt-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-2">
              Admin Controls
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  router.push({
                    pathname: "/admin",
                    query: { action: "create-session", t: Date.now() }
                  });
                }}
              >
                Manage Session
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (sessionData.type === 'cash') {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <span>Cash Game Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                sessionData.status === 'ongoing' ? 'bg-green-100 text-green-800' : 
                'bg-blue-100 text-blue-800'
              }`}>
                {sessionData.status === 'ongoing' ? 'Live' : 'Not Started'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xl font-medium">{sessionData.blinds}</p>
                <p className="text-muted-foreground">Blinds</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">${sessionData.minBuyIn}</p>
                <p className="text-muted-foreground">Min Buy-in</p>
              </div>
              
              <div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xl font-medium">{sessionData.seats.open}/{sessionData.seats.total}</p>
                </div>
                <p className="text-muted-foreground">Available Seats</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.waitlist}</p>
                <p className="text-muted-foreground">Waitlist</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isAdmin && (
          <div className="mt-6 border-t pt-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-2">
              Admin Controls
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  router.push({
                    pathname: "/admin",
                    query: { action: "create-session", t: Date.now() }
                  });
                }}
              >
                Manage Session
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
} 