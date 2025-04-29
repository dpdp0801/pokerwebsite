import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/lib/hooks/use-toast";

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState({
    exists: false,
    session: null
  });

  const { data: session } = useSession();
  const isAdmin = session?.role === "ADMIN";
  const router = useRouter();
  const { toast } = useToast();

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

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Remove player from registration or waitlist
  const removePlayer = async (registrationId) => {
    if (!isAdmin) return;
    
    if (window.confirm("Are you sure you want to remove this player?")) {
      try {
        const response = await fetch(`/api/registration?id=${registrationId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          toast({
            title: "Player Removed",
            description: "The player has been removed successfully.",
          });
          
          // Refresh the session data
          const updatedResponse = await fetch('/api/session-status');
          const updatedData = await updatedResponse.json();
          setSessionData(updatedData);
        } else {
          const data = await response.json();
          throw new Error(data.error || "Failed to remove player");
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err.message || "An error occurred while removing the player",
          variant: "destructive",
        });
      }
    }
  };

  const PlayerList = ({ players, title, emptyMessage, colorClass }) => {
    if (!players || players.length === 0) {
      return (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <div className="border rounded-md overflow-hidden">
          <ul className="divide-y">
            {players.map((registration) => (
              <li key={registration.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={registration.user.image} alt={registration.user.name} />
                    <AvatarFallback className={colorClass}>
                      {getInitials(registration.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{registration.user.name}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removePlayer(registration.id)}
                    title="Remove player"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
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
  const registrations = currentSession.registrations || { confirmed: [], waitlisted: [] };

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
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-center">
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
              <div className="flex items-center justify-center gap-1">
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
          
          {isAdmin && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-lg mb-3">Participants</h3>
              
              <PlayerList 
                players={registrations.confirmed}
                title="Registered Players"
                emptyMessage="No players have registered yet"
                colorClass="bg-green-100 text-green-800"
              />
              
              <PlayerList 
                players={registrations.waitlisted}
                title="Waitlist"
                emptyMessage="No players on the waitlist"
                colorClass="bg-yellow-100 text-yellow-800"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 