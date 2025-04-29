import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/lib/hooks/use-toast";
import { Component } from "react";

// Error boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Admin Dashboard Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-12">
          <Card>
            <CardContent className="py-8 text-center">
              <h2 className="text-xl text-red-500 mb-4">Something went wrong</h2>
              <p>{this.state.error?.toString()}</p>
              <Button 
                onClick={() => window.location.href = "/admin"} 
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple loading component
function LoadingState() {
  return (
    <div className="container py-12">
      <Card>
        <CardContent className="py-8 text-center">
          <p>Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main admin dashboard
export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  
  // Basic state
  const [activeTab, setActiveTab] = useState("sessions");
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Load sessions function - now outside useEffect to prevent any return value issues
  function loadSessions() {
    setIsLoaded(false);
    fetch('/api/sessions/manage')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSessions(data.sessions || []);
        } else {
          setErrorMessage("Failed to load sessions");
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error("Error loading sessions:", err);
        setErrorMessage("Error connecting to server");
        setIsLoaded(true);
      });
  }
  
  // Fixed useEffect implementation to avoid React Error #310
  useEffect(() => {
    // Ensure we never return anything from the main function
    let isMounted = true;
    
    function fetchData() {
      if (isMounted) {
        loadSessions();
      }
    }
    
    try {
      fetchData(); // call the function directly to avoid returning anything
    } catch (err) {
      console.error("Effect error:", err);
    }
    
    // Only return a cleanup function
    return function cleanup() {
      isMounted = false;
    };
  }, []); 
  
  // Check authentication - move this out of component body
  if (status === "loading") {
    return <LoadingState />;
  }
  
  if (status === "unauthenticated" || session?.role !== "ADMIN") {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-8 text-center">
            <p>You must be logged in as an admin to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (errorMessage) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-xl text-red-500 mb-4">Error</h2>
            <p>{errorMessage}</p>
            <Button onClick={() => loadSessions()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Loading state
  if (!isLoaded) {
    return <LoadingState />;
  }
  
  // Handle navigation to create session
  const handleCreateSessionClick = () => {
    router.push('/admin?action=create-session');
  };
  
  // Render the main dashboard
  return (
    <ErrorBoundary>
      <div className="container py-12">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="buyins">Buy-ins</TabsTrigger>
          </TabsList>
          
          {/* Sessions tab - simplified */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-center py-4">No sessions found.</p>
                ) : (
                  <div className="space-y-4">
                    {sessions.map(session => (
                      <div key={session.id} className="p-4 border rounded-md">
                        <div className="font-medium">{session.title || 'Untitled Session'}</div>
                        <div className="text-sm text-gray-500">
                          Status: {session.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-6 text-center">
                  <Button onClick={handleCreateSessionClick}>
                    Create New Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Buy-ins tab - simplified */}
          <TabsContent value="buyins">
            <Card>
              <CardHeader>
                <CardTitle>Buy-in Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center py-4">No buy-in requests yet.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}