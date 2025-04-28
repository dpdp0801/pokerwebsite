import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  if (!sessionData.exists) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Current Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground text-lg">No session is currently ongoing</p>
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
            <CardTitle className="text-center">Tournament Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 text-center">
                <p className="text-2xl font-bold">
                  {sessionData.status === 'ongoing' ? formatTime(sessionData.timer) : 'Paused'}
                </p>
                <p className="text-muted-foreground">Time Remaining</p>
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
                <p className="text-xl font-medium">{sessionData.seats.open}/{sessionData.seats.total}</p>
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
      </div>
    );
  }

  if (sessionData.type === 'cash') {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Cash Game Status</CardTitle>
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
                <p className="text-xl font-medium">{sessionData.seats.open}/{sessionData.seats.total}</p>
                <p className="text-muted-foreground">Available Seats</p>
              </div>
              
              <div>
                <p className="text-xl font-medium">{sessionData.waitlist}</p>
                <p className="text-muted-foreground">Waitlist</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
} 