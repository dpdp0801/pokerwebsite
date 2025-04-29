import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
// Avatar component removed - we're no longer showing individual participants

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState({
    exists: false,
    session: null
  });

  const { data: session } = useSession();
  const isAdmin = session?.role === "ADMIN";
  const router = useRouter();

  // Fetch real session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/session-status');
        const data = await response.json();
        setSessionData(data);
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, []);

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
  const formatTimeOnly = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-6 w-32 bg-muted rounded mb-4"></div>
              <div className="h-4 w-48 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSession = sessionData.session;

  return (
    <div className="container py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <span>{currentSession.type === 'TOURNAMENT' ? 'Tournament' : 'Cash Game'} Status</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              currentSession.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
              'bg-blue-100 text-blue-800'
            }`}>
              {currentSession.status === 'ACTIVE' ? 'Live' : 'Not Started'}
            </span>
          </CardTitle>
          <CardDescription className="text-center">
            {formatDate(currentSession.date)} at {formatTimeOnly(currentSession.startTime)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">{currentSession.title}</h2>
            <p className="text-sm text-muted-foreground">{currentSession.location}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {currentSession.type === 'TOURNAMENT' ? (
              <>
                <div>
                  <p className="text-xl font-medium">${currentSession.buyIn}</p>
                  <p className="text-muted-foreground">Buy-in</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xl font-medium">${currentSession.smallBlind}/${currentSession.bigBlind}</p>
                  <p className="text-muted-foreground">Blinds</p>
                </div>
                
                <div>
                  <p className="text-xl font-medium">${currentSession.minBuyIn}</p>
                  <p className="text-muted-foreground">Min Buy-in</p>
                </div>
              </>
            )}
            
            <div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-xl font-medium">
                  {currentSession.registeredPlayers}/{currentSession.maxPlayers}
                </p>
              </div>
              <p className="text-muted-foreground">Registered Players</p>
            </div>
            
            <div>
              <p className="text-xl font-medium">{currentSession.waitlistedPlayers || 0}</p>
              <p className="text-muted-foreground">Waitlisted</p>
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
                router.push("/admin");
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