import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/lib/hooks/use-toast";
import { Component } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

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
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Session management dialogs
  const [createSessionDialog, setCreateSessionDialog] = useState(false);
  const [editSessionDialog, setEditSessionDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editSessionData, setEditSessionData] = useState(null);
  
  // Form state for session creation
  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    type: "TOURNAMENT",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "19:00",
    buyIn: 100,
    maxPlayers: 9,
    location: "385 S Catalina Ave, Apt 315",
    // Additional fields for cash games
    bigBlind: 0.5,
    smallBlind: 0.2,
    minBuyIn: 50
  });
  
  // Buy-in management 
  const [buyInRequests, setBuyInRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("requestDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  
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
  
  // Add useEffect to check for query parameters to open create session dialog
  useEffect(() => {
    let isMounted = true;
    
    function handleQueryParams() {
      try {
        if (router.isReady && router.query.action === "create-session" && isMounted) {
          setCreateSessionDialog(true);
          // Clean up URL without triggering navigation
          router.replace("/admin", undefined, { shallow: true })
            .catch(error => console.error("Error updating URL:", error));
        }
      } catch (err) {
        console.error("Error handling query params:", err);
      }
    }
    
    handleQueryParams();
    
    return function cleanup() {
      isMounted = false;
    };
  }, [router.isReady, router.query, router]);
  
  // Load buy-in requests
  useEffect(() => {
    let isMounted = true;
    
    function fetchBuyInRequests() {
      try {
        fetch('/api/buyins')
          .then(res => {
            if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (isMounted) {
              if (data.success) {
                setBuyInRequests(data.buyInRequests || []);
              } else {
                console.warn("No buy-in requests data in API response");
                setBuyInRequests([]);
              }
            }
          })
          .catch(err => {
            console.error("Error fetching buy-in requests:", err);
            if (isMounted) {
              setBuyInRequests([]);
            }
          });
      } catch (err) {
        console.error("Error in fetchBuyInRequests:", err);
      }
    }
    
    fetchBuyInRequests();
    
    return function cleanup() {
      isMounted = false;
    };
  }, []);
  
  // Load users
  useEffect(() => {
    let isMounted = true;
    
    function fetchUsers() {
      try {
        fetch('/api/users')
          .then(res => {
            if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (isMounted) {
              if (data.success) {
                setUsers(data.users || []);
              } else {
                console.warn("No users data in API response");
                setUsers([]);
              }
            }
          })
          .catch(err => {
            console.error("Error fetching users:", err);
            if (isMounted) {
              setUsers([]);
            }
          });
      } catch (err) {
        console.error("Error in fetchUsers:", err);
      }
    }
    
    fetchUsers();
    
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
  
  // Form handling
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSession(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select and radio changes
  const handleSelectChange = (name, value) => {
    setNewSession(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle navigation to create session
  const handleCreateSessionClick = () => {
    setCreateSessionDialog(true);
  };
  
  // Create a new session
  const handleCreateSession = () => {
    // Validate form
    if (!newSession.date || !newSession.time || !newSession.maxPlayers) {
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Type-specific validation
    if (newSession.type === "TOURNAMENT" && !newSession.buyIn) {
      toast({
        title: "Validation Error",
        description: "Please enter a buy-in amount for the tournament",
        variant: "destructive"
      });
      return;
    }
    
    if (newSession.type === "CASH_GAME" && (!newSession.smallBlind || !newSession.bigBlind || !newSession.minBuyIn)) {
      toast({
        title: "Validation Error",
        description: "Please enter blinds and minimum buy-in for the cash game",
        variant: "destructive"
      });
      return;
    }
    
    // Auto-generate session title based on type
    let generatedTitle = '';
    if (newSession.type === "TOURNAMENT") {
      generatedTitle = `$${newSession.buyIn} buy-in 9-max NLH Tournament`;
    } else {
      generatedTitle = `$${newSession.smallBlind}/$${newSession.bigBlind} 9-max NLH Cash Game`;
    }
    
    // Convert string number values to actual numbers
    const processedData = {
      ...newSession,
      title: generatedTitle,
      status: "NOT_STARTED",
      maxPlayers: parseInt(newSession.maxPlayers, 10),
      buyIn: parseFloat(newSession.buyIn),
      smallBlind: newSession.smallBlind ? parseFloat(newSession.smallBlind) : undefined,
      bigBlind: newSession.bigBlind ? parseFloat(newSession.bigBlind) : undefined,
      minBuyIn: newSession.minBuyIn ? parseFloat(newSession.minBuyIn) : undefined
    };
    
    // Send data to API
    fetch('/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processedData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Add the new session to our list
        setSessions(prevSessions => [data.session, ...prevSessions]);
        setCreateSessionDialog(false);
        
        toast({
          title: "Session Created",
          description: `A new ${newSession.type === 'TOURNAMENT' ? 'tournament' : 'cash game'} has been created.`
        });
        
        // Reset form
        setNewSession({
          title: "",
          description: "",
          type: "TOURNAMENT",
          date: format(new Date(), "yyyy-MM-dd"),
          time: "19:00",
          buyIn: 100,
          maxPlayers: 9,
          location: "385 S Catalina Ave, Apt 315",
          bigBlind: 0.5,
          smallBlind: 0.2,
          minBuyIn: 50
        });
      } else {
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
        description: "An error occurred while creating the session",
        variant: "destructive"
      });
    });
  };
  
  // Session Actions: Start, complete, or cancel a session
  const updateSessionStatus = async (sessionId, newStatus) => {
    try {
      const response = await fetch(`/api/sessions/transition`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          status: newStatus
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the session in our state
        setSessions(prev => 
          prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s)
        );
        
        toast({
          title: "Status Updated",
          description: `Session status has been updated to ${newStatus.toLowerCase()}.`
        });
        return true;
      } else {
        throw new Error(data.error || "Failed to update session status");
      }
    } catch (error) {
      console.error("Error updating session status:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the session status",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Delete a session
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      const response = await fetch(`/api/sessions/manage?id=${sessionToDelete}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Remove the session from our state
        setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionToDelete));
        
        setDeleteConfirmDialog(false);
        setSessionToDelete(null);
        
        toast({
          title: "Session Deleted",
          description: "The session has been successfully deleted."
        });
      } else {
        throw new Error(data.error || "Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while deleting the session",
        variant: "destructive"
      });
    }
  };
  
  // Open edit session dialog
  const handleEditSessionOpen = (session) => {
    setEditSessionData({
      id: session.id,
      title: session.title || "",
      description: session.description || "",
      type: session.type,
      date: format(new Date(session.date || new Date()), "yyyy-MM-dd"),
      time: session.startTime ? format(new Date(session.startTime), "HH:mm") : "19:00",
      buyIn: session.buyIn || 100,
      maxPlayers: session.maxPlayers || 9,
      location: session.location || "385 S Catalina Ave, Apt 315",
      bigBlind: session.bigBlind || 0.5,
      smallBlind: session.smallBlind || 0.2,
      minBuyIn: session.minBuyIn || 50
    });
    
    setEditSessionDialog(true);
  };
  
  // Update session
  const handleUpdateSession = async () => {
    if (!editSessionData || !editSessionData.id) {
      toast({
        title: "Error",
        description: "Session ID is missing",
        variant: "destructive"
      });
      return;
    }
    
    // Validate form
    if (!editSessionData.title || !editSessionData.date || !editSessionData.time) {
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Convert string number values to actual numbers
      const processedData = {
        ...editSessionData,
        maxPlayers: editSessionData.maxPlayers ? parseInt(editSessionData.maxPlayers, 10) : undefined,
        buyIn: editSessionData.buyIn ? parseFloat(editSessionData.buyIn) : undefined,
        smallBlind: editSessionData.smallBlind ? parseFloat(editSessionData.smallBlind) : undefined,
        bigBlind: editSessionData.bigBlind ? parseFloat(editSessionData.bigBlind) : undefined,
        minBuyIn: editSessionData.minBuyIn ? parseFloat(editSessionData.minBuyIn) : undefined
      };
      
      const response = await fetch(`/api/sessions/manage?id=${editSessionData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the session in our state
        setSessions(prevSessions => 
          prevSessions.map(s => s.id === editSessionData.id ? data.session : s)
        );
        
        setEditSessionDialog(false);
        setEditSessionData(null);
        
        toast({
          title: "Session Updated",
          description: "The session has been successfully updated."
        });
      } else {
        throw new Error(data.error || "Failed to update session");
      }
    } catch (error) {
      console.error("Error updating session:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the session",
        variant: "destructive"
      });
    }
  };
  
  // Handle Edit Session Form Changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditSessionData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEditSelectChange = (name, value) => {
    setEditSessionData(prev => ({ ...prev, [name]: value }));
  };
  
  // Format date for display
  const formatSessionDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Get status badge color
  const getStatusBadge = (status) => {
    const statusColors = {
      NOT_STARTED: "bg-blue-100 text-blue-800",
      ACTIVE: "bg-green-100 text-green-800",
      COMPLETED: "bg-gray-100 text-gray-800",
      CANCELLED: "bg-red-100 text-red-800"
    };
    
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  // Update buy-in request status
  const handleUpdateBuyInStatus = async (id, newStatus) => {
    try {
      const response = await fetch('/api/buyins', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: newStatus
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the request in our state
        setBuyInRequests(prev => 
          prev.map(request => request.id === id ? { ...request, status: newStatus } : request)
        );
        
        toast({
          title: "Status Updated",
          description: `Buy-in request has been ${newStatus.toLowerCase()}.`
        });
      } else {
        throw new Error(data.error || "Failed to update buy-in status");
      }
    } catch (error) {
      console.error("Error updating buy-in status:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the status",
        variant: "destructive"
      });
    }
  };
  
  // Filter and sort buy-in requests
  const filteredBuyInRequests = buyInRequests
    .filter(request => {
      // Filter by status
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const userNameLower = (request.user?.name || "").toLowerCase();
        const userEmailLower = (request.user?.email || "").toLowerCase();
        
        return userNameLower.includes(query) || userEmailLower.includes(query);
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by date (most recent first by default)
      if (sortField === "createdAt") {
        return sortDirection === "asc" 
          ? new Date(a.createdAt) - new Date(b.createdAt) 
          : new Date(b.createdAt) - new Date(a.createdAt);
      }
      
      // Sort by amount
      if (sortField === "buyInAmount") {
        return sortDirection === "asc" 
          ? a.buyInAmount - b.buyInAmount 
          : b.buyInAmount - a.buyInAmount;
      }
      
      // Sort by other string fields
      const aValue = String(a[sortField] || "").toLowerCase();
      const bValue = String(b[sortField] || "").toLowerCase();
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  
  // Get badge color for buy-in status
  const getBuyInStatusBadge = (status) => {
    const statusColors = {
      CONFIRMED: "bg-green-100 text-green-800",
      WAITLISTED: "bg-yellow-100 text-yellow-800",
      CANCELLED: "bg-red-100 text-red-800",
      PAID: "bg-blue-100 text-blue-800",
      UNPAID: "bg-gray-100 text-gray-800"
    };
    
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Render the main dashboard
  return (
    <ErrorBoundary>
      <div className="container py-12">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="buyins">Buy-ins</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>
          
          {/* Sessions tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Sessions</CardTitle>
                  <Button size="sm" onClick={handleCreateSessionClick}>
                    Create New Session
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-center py-4">No sessions found.</p>
                ) : (
                  <div className="space-y-4">
                    {sessions.map(session => (
                      <div key={session.id} className="p-4 border rounded-md shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-lg">{session.title || 'Untitled Session'}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {formatSessionDate(session.date)} at {session.startTime ? format(new Date(session.startTime), "h:mm a") : "TBD"}
                            </div>
                            <div className="flex items-center mt-1">
                              <Badge className={getStatusBadge(session.status)}>
                                {session.status.replace(/_/g, " ")}
                              </Badge>
                              <span className="text-sm text-gray-500 ml-2">
                                {session.type === "TOURNAMENT" ? "Tournament" : "Cash Game"}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {session.status === "NOT_STARTED" && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => updateSessionStatus(session.id, "ACTIVE")}
                                >
                                  Start
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditSessionOpen(session)}
                                >
                                  Edit
                                </Button>
                              </>
                            )}
                            
                            {session.status === "ACTIVE" && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => updateSessionStatus(session.id, "COMPLETED")}
                                >
                                  Complete
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateSessionStatus(session.id, "CANCELLED")}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            
                            {/* Add delete button for any session status */}
                            <Button 
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSessionToDelete(session.id);
                                setDeleteConfirmDialog(true);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        {session.description && (
                          <p className="text-sm mt-2">{session.description}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Location: {session.location || "TBD"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Buy-ins tab */}
          <TabsContent value="buyins">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Buy-in Requests</CardTitle>
                  <div className="flex space-x-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Search players"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-[200px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBuyInRequests.length === 0 ? (
                  <p className="text-center py-4">
                    {buyInRequests.length === 0 
                      ? "No buy-in requests yet." 
                      : "No buy-in requests match your filters."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredBuyInRequests.map(buyIn => (
                      <div key={buyIn.id} className="p-4 border rounded-md shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {buyIn.user?.name || 'Unknown User'} 
                              <span className="text-gray-500 text-sm ml-2">
                                ({buyIn.user?.email})
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              <Badge className={getBuyInStatusBadge(buyIn.status)}>
                                {buyIn.status}
                              </Badge>
                              <Badge className={`${getBuyInStatusBadge(buyIn.paymentStatus)} ml-2`} variant="outline">
                                {buyIn.paymentStatus}
                              </Badge>
                              <span className="text-sm text-gray-500 ml-2">
                                {formatCurrency(buyIn.buyInAmount)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Session: {buyIn.session?.title || 'Unknown Session'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Requested: {formatDate(buyIn.createdAt)}
                            </div>
                            {buyIn.paymentCode && (
                              <div className="text-xs font-mono bg-gray-100 p-1 rounded mt-1">
                                Code: {buyIn.paymentCode}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {buyIn.paymentStatus === "UNPAID" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateBuyInStatus(buyIn.id, "PAID")}
                              >
                                Mark Paid
                              </Button>
                            )}
                            {buyIn.status === "WAITLISTED" && (
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateBuyInStatus(buyIn.id, "CONFIRMED")}
                              >
                                Confirm
                              </Button>
                            )}
                            {buyIn.status !== "CANCELLED" && (
                              <Button 
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUpdateBuyInStatus(buyIn.id, "CANCELLED")}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Accounts tab */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>User Accounts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center py-4">No user accounts found.</p>
                ) : (
                  <div className="space-y-4">
                    {users.map(user => (
                      <div key={user.id} className="p-4 border rounded-md shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {user.name || 'Unnamed User'}
                              {user.role === "ADMIN" && (
                                <Badge className="ml-2 bg-purple-100 text-purple-800">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <div>Created: {formatDate(user.createdAt)}</div>
                              <div className="ml-4">Email verified: {user.emailVerified ? 'Yes' : 'No'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Create Session Dialog */}
        <Dialog open={createSessionDialog} onOpenChange={setCreateSessionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Session Type</Label>
                <RadioGroup 
                  value={newSession.type} 
                  onValueChange={(value) => handleSelectChange("type", value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TOURNAMENT" id="tournament" />
                    <Label htmlFor="tournament">Tournament</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CASH_GAME" id="cash" />
                    <Label htmlFor="cash">Cash Game</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    name="date" 
                    type="date"
                    value={newSession.date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input 
                    id="time" 
                    name="time" 
                    type="time"
                    value={newSession.time}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  name="location" 
                  value={newSession.location}
                  onChange={handleInputChange}
                  placeholder="Address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Max Players</Label>
                <Input 
                  id="maxPlayers" 
                  name="maxPlayers" 
                  type="number"
                  value={newSession.maxPlayers}
                  onChange={handleInputChange}
                  min={2}
                />
              </div>
              
              {newSession.type === "TOURNAMENT" && (
                <div className="space-y-2">
                  <Label htmlFor="buyIn">Buy-in Amount ($)</Label>
                  <Input 
                    id="buyIn" 
                    name="buyIn" 
                    type="number"
                    value={newSession.buyIn}
                    onChange={handleInputChange}
                    min={0}
                    step={10}
                  />
                </div>
              )}
              
              {newSession.type === "CASH_GAME" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smallBlind">Small Blind ($)</Label>
                      <Input 
                        id="smallBlind" 
                        name="smallBlind" 
                        type="number"
                        value={newSession.smallBlind}
                        onChange={handleInputChange}
                        min={0}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bigBlind">Big Blind ($)</Label>
                      <Input 
                        id="bigBlind" 
                        name="bigBlind" 
                        type="number"
                        value={newSession.bigBlind}
                        onChange={handleInputChange}
                        min={0}
                        step={0.2}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minBuyIn">Minimum Buy-in ($)</Label>
                    <Input 
                      id="minBuyIn" 
                      name="minBuyIn" 
                      type="number"
                      value={newSession.minBuyIn}
                      onChange={handleInputChange}
                      min={0}
                      step={10}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateSessionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSession}>
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Session Dialog */}
        <Dialog open={editSessionDialog} onOpenChange={setEditSessionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Session</DialogTitle>
            </DialogHeader>
            {editSessionData && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Session Title</Label>
                  <Input 
                    id="edit-title" 
                    name="title" 
                    value={editSessionData.title}
                    onChange={handleEditInputChange}
                    placeholder="Weekly Tournament"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Input 
                    id="edit-description" 
                    name="description" 
                    value={editSessionData.description}
                    onChange={handleEditInputChange}
                    placeholder="Details about the session"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Date</Label>
                    <Input 
                      id="edit-date" 
                      name="date" 
                      type="date"
                      value={editSessionData.date}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-time">Time</Label>
                    <Input 
                      id="edit-time" 
                      name="time" 
                      type="time"
                      value={editSessionData.time}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input 
                    id="edit-location" 
                    name="location" 
                    value={editSessionData.location}
                    onChange={handleEditInputChange}
                    placeholder="Address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-maxPlayers">Max Players</Label>
                  <Input 
                    id="edit-maxPlayers" 
                    name="maxPlayers" 
                    type="number"
                    value={editSessionData.maxPlayers}
                    onChange={handleEditInputChange}
                    min={2}
                  />
                </div>
                
                {editSessionData.type === "TOURNAMENT" && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-buyIn">Buy-in Amount ($)</Label>
                    <Input 
                      id="edit-buyIn" 
                      name="buyIn" 
                      type="number"
                      value={editSessionData.buyIn}
                      onChange={handleEditInputChange}
                      min={0}
                      step={10}
                    />
                  </div>
                )}
                
                {editSessionData.type === "CASH_GAME" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-smallBlind">Small Blind ($)</Label>
                        <Input 
                          id="edit-smallBlind" 
                          name="smallBlind" 
                          type="number"
                          value={editSessionData.smallBlind}
                          onChange={handleEditInputChange}
                          min={0}
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-bigBlind">Big Blind ($)</Label>
                        <Input 
                          id="edit-bigBlind" 
                          name="bigBlind" 
                          type="number"
                          value={editSessionData.bigBlind}
                          onChange={handleEditInputChange}
                          min={0}
                          step={0.2}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-minBuyIn">Minimum Buy-in ($)</Label>
                      <Input 
                        id="edit-minBuyIn" 
                        name="minBuyIn" 
                        type="number"
                        value={editSessionData.minBuyIn}
                        onChange={handleEditInputChange}
                        min={0}
                        step={10}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditSessionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSession}>
                Update Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the session and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSession}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Admin Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-md shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Database Setup</h3>
                  <p className="text-sm text-gray-500">Initialize tournament structures and tables</p>
                </div>
                <Link href="/admin/setup-database">
                  <Button size="sm" variant="outline">Setup Database</Button>
                </Link>
              </div>
              
              <div className="p-4 border rounded-md shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Tournament Structures</h3>
                  <p className="text-sm text-gray-500">View and manage blind levels and payout structures</p>
                </div>
                <Link href="/admin/seed-structures">
                  <Button size="sm" variant="outline">Manage Structures</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}