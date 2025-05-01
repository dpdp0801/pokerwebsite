import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, parseISO } from "date-fns";
import { useRouter } from 'next/router';
import Link from "next/link";
import { useToast } from "@/lib/hooks/use-toast";

// Helper function to format date
const formatDate = (dateString) => {
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch (e) {
    return "Invalid date";
  }
};

// Helper function to format time
const formatTime = (dateString) => {
  try {
    return format(parseISO(dateString), "h:mm a");
  } catch (e) {
    return "";
  }
};

// Helper function to get initials
const getInitials = (name) => {
  if (!name) return "?";
  
  // Extract first and last initials from the name string
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
    
  return initials;
};

export default function Results() {
  const { data: session, status } = useSession();
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { toast } = useToast();
  
  // Fetch past sessions
  useEffect(() => {
    if (status === "loading") return;
    
    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    
    const fetchPastSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sessions/past');
        
        if (!response.ok) {
          throw new Error(`Request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setPastSessions(data.sessions);
        } else {
          setError(data.message || "Failed to load past sessions");
        }
      } catch (error) {
        console.error("Error fetching past sessions:", error);
        setError("Failed to fetch past sessions. Please try again later.");
        toast({
          title: "Error",
          description: "Could not load past sessions",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPastSessions();
  }, [status, router, toast]);
  
  // Loading state
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
  
  // Error state
  if (error) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-xl text-red-500 mb-4">Error</h2>
            <p>{error}</p>
            <Button onClick={() => router.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Past Games</h1>
      
      {pastSessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No past games found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pastSessions.map(session => {
            // Find the winner (first ITM player)
            const winner = session.registrations[0]; // We only fetched one ITM player
            
            return (
              <Link 
                href={`/results/${session.id}`} 
                key={session.id}
                className="block"
              >
                <Card className="hover:border-primary hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="font-bold text-lg">{session.title}</h2>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(session.date)}</span>
                          {session.startTime && (
                            <>
                              <Clock className="h-3.5 w-3.5 ml-2" />
                              <span>{formatTime(session.startTime)}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center mt-1.5">
                          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                            {session.type === "TOURNAMENT" ? "Tournament" : "Cash Game"}
                          </Badge>
                          {session.buyIn > 0 && (
                            <span className="text-sm ml-2 text-green-700">
                              ${session.buyIn} buy-in
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center mt-3 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground mr-1.5" />
                          <span>{session._count?.registrations || 0} players</span>
                        </div>
                      </div>
                      
                      {winner && (
                        <div className="flex flex-col items-center">
                          <div className="text-xs font-medium text-amber-700 mb-1 flex items-center">
                            <Trophy className="h-3.5 w-3.5 mr-1 text-amber-500" />
                            <span>Winner</span>
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={winner.user?.image} alt={winner.user?.name} />
                            <AvatarFallback className="bg-amber-100 text-amber-800">
                              {winner.user?.firstName || winner.user?.lastName 
                                ? `${winner.user.firstName?.[0] || ''}${winner.user.lastName?.[0] || ''}`.toUpperCase() 
                                : getInitials(winner.user?.name || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="mt-1 text-xs font-medium text-center">
                            {winner.user?.firstName && winner.user?.lastName
                              ? `${winner.user.firstName} ${winner.user.lastName}`
                              : winner.user?.name || 'Unknown'}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
} 