import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/lib/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, Search, Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sessions");
  const [createSessionDialog, setCreateSessionDialog] = useState(false);
  const [sessionType, setSessionType] = useState("mtt");
  
  // NOTE: We no longer redirect here. Middleware already protects this page.
  // If the user somehow reaches this page unauthenticated, we'll show a minimal
  // message instead of flashing back and forth.
  
  // Don't render anything until we know the authentication status
  if (status === "loading") {
    return (
      <div className="container py-12 flex justify-center items-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If user is not authenticated or not an admin, show a simple not-authorized message.
  if (status === "unauthenticated" || session?.role !== "ADMIN") {
    return (
      <div className="container py-12 flex justify-center items-center">
        <div className="text-center">
          <p className="text-muted-foreground">You must be an admin to view this page.</p>
        </div>
      </div>
    );
  }
  
  // Check if query params indicate we should open create session dialog
  useEffect(() => {
    // Use a more robust approach to check if we should show the dialog
    const handleQueryAction = () => {
      console.log("Checking query params", router.query);
      if (router.query.action === "create-session") {
        console.log("Opening session dialog from query param");
        setCreateSessionDialog(true);
        // Clean up the URL without triggering a navigation
        router.replace("/admin", undefined, { shallow: true })
          .catch(error => console.error("Error updating URL:", error));
      }
    };
    
    // Only run after router is ready
    if (router.isReady) {
      handleQueryAction();
    }
  }, [router.isReady, router.query, router]);
  
  // Buy-in requests (initially empty; populated via API)
  const [buyInRequests, setBuyInRequests] = useState([]);
  
  // Form state for creating a new session
  const [newSession, setNewSession] = useState({
    type: "mtt",
    date: "",
    time: "",
    buyIn: 100,
    maxPlayers: 9,
    location: "385 S Catalina Ave", // Default location
    // Additional fields for cash games
    bigBlind: 0.5,
    smallBlind: 0.2,
    minBuyIn: 50
  });
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("requestDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add state for all sessions
  const [allSessions, setAllSessions] = useState([]);
  
  // Add state for session deletion confirmation
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  
  // Add state for session editing
  const [editSessionDialog, setEditSessionDialog] = useState(false);
  const [editSessionData, setEditSessionData] = useState(null);
  
  const handleCreateSession = () => {
    console.log("Create Session button clicked");
    console.log("Form data:", newSession);
    
    // Validate form
    if (!newSession.date || !newSession.time || !newSession.maxPlayers) {
      console.log("Validation failed: Missing required fields");
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Type-specific validation
    if (newSession.type === "mtt" && !newSession.buyIn) {
      console.log("Validation failed: Missing buy-in for tournament");
      toast({
        title: "Validation Error",
        description: "Please enter a buy-in amount for the tournament",
        variant: "destructive"
      });
      return;
    }
    
    if (newSession.type === "cash" && (!newSession.smallBlind || !newSession.bigBlind || !newSession.minBuyIn)) {
      console.log("Validation failed: Missing cash game fields");
      toast({
        title: "Validation Error",
        description: "Please enter blinds and minimum buy-in for the cash game",
        variant: "destructive"
      });
      return;
    }
    
    // This would be an API call in a real implementation
    const sessionData = {
      exists: true,
      type: newSession.type,
      status: "not_started",
      ...newSession
    };
    
    console.log("Sending data to API:", sessionData);
    
    // Send data to API
    fetch('/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    })
    .then(response => {
      console.log("API Response status:", response.status);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("API Response data:", data);
      if (data.success) {
        // Add the new session to our list of sessions
        setAllSessions(prevSessions => [data.session, ...prevSessions]);
        setCreateSessionDialog(false);
        
        toast({
          title: "Session Created",
          description: `A new ${newSession.type === 'mtt' ? 'tournament' : 'cash game'} has been created.`
        });
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
        description: "An error occurred while creating the session. Check the console for details.",
        variant: "destructive"
      });
    });
  };
  
  const handleUpdateBuyInStatus = (id, newStatus) => {
    const updatedRequests = buyInRequests.map(request => 
      request.id === id ? { ...request, status: newStatus } : request
    );
    
    setBuyInRequests(updatedRequests);
    
    toast({
      title: "Status Updated",
      description: `Buy-in request has been ${newStatus}.`
    });
  };

  const generatePaymentCode = (playerId, sessionId, timestamp) => {
    const playerIdPart = playerId.substring(0, 3).toUpperCase();
    const timestampPart = new Date(timestamp).getTime().toString().substring(9, 13);
    return `CP-${playerIdPart}-${sessionId}-${timestampPart}`;
  };

  const filteredAndSortedRequests = buyInRequests
    .filter(request => {
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          request.playerName.toLowerCase().includes(query) ||
          request.playerId.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortField === "amount") {
        return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      
      if (sortField === "requestDate") {
        return sortDirection === "asc" 
          ? new Date(a.requestDate) - new Date(b.requestDate) 
          : new Date(b.requestDate) - new Date(a.requestDate);
      }
      
      const aValue = a[sortField]?.toString().toLowerCase() || "";
      const bValue = b[sortField]?.toString().toLowerCase() || "";
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

  const requestsWithPaymentCodes = filteredAndSortedRequests.map(request => ({
    ...request,
    paymentCode: request.status === "approved" ? generatePaymentCode(request.playerId, 1, request.requestDate) : null
  }));

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortableTableHead = ({ field, children }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50" 
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  // Add these helper functions needed for UI
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  // Fetch sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions/manage');
        const data = await response.json();
        
        if (data.success && data.sessions) {
          setAllSessions(data.sessions);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch sessions data',
          variant: 'destructive'
        });
      }
    };
    
    fetchSessions();
  }, [toast]);
  
  // Fetch buy-in requests
  useEffect(() => {
    const fetchBuyInRequests = async () => {
      try {
        const response = await fetch('/api/buyins');
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setBuyInRequests(data.buyInRequests || []);
        }
      } catch (error) {
        console.error('Error fetching buy-in requests:', error);
        // Don't show toast for this - it's normal to have no buy-ins initially
      }
    };
    
    fetchBuyInRequests();
  }, []);
  
  // Update session status
  const updateSessionStatus = async (newStatus, sessionId) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No session ID provided",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/sessions/manage?id=${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the session in our state
        setAllSessions(prev => 
          prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s)
        );
        
        toast({
          title: "Status Updated",
          description: `Session status has been updated to ${newStatus.toLowerCase()}.`
        });
      } else {
        throw new Error(data.message || "Failed to update session status");
      }
    } catch (error) {
      console.error("Error updating session status:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the session status",
        variant: "destructive"
      });
    }
  };

  // Add handler for deleting a session
  const handleDeleteSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/sessions/manage?id=${sessionId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the session from our state
        setAllSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
        
        setDeleteConfirmDialog(false);
        setSessionToDelete(null);
        
        toast({
          title: "Session Deleted",
          description: "The session has been successfully deleted."
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete session",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the session",
        variant: "destructive"
      });
    }
  };
  
  // Add handler for opening the edit dialog
  const handleEditSessionOpen = (session) => {
    // Extract the time from the startTime field
    const startTime = new Date(session.startTime);
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // Set up the edit form data
    setEditSessionData({
      id: session.id,
      title: session.title,
      description: session.description,
      type: session.type.toLowerCase(),
      date: formatDate(session.date),
      time: timeString,
      buyIn: session.buyIn,
      maxPlayers: session.maxPlayers,
      minBuyIn: session.minBuyIn,
      maxBuyIn: session.maxBuyIn,
      location: session.location
    });
    
    setEditSessionDialog(true);
  };
  
  // Add handler for updating a session
  const handleUpdateSession = async () => {
    try {
      if (!editSessionData.id) {
        toast({
          title: "Error",
          description: "Session ID is missing",
          variant: "destructive"
        });
        return;
      }
      
      // Validate form
      if (!editSessionData.date || !editSessionData.time || !editSessionData.maxPlayers) {
        toast({
          title: "Validation Error",
          description: "Please fill out all required fields",
          variant: "destructive"
        });
        return;
      }
      
      const response = await fetch(`/api/sessions/manage?id=${editSessionData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editSessionData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the session in our state
        setAllSessions(prevSessions => 
          prevSessions.map(s => s.id === editSessionData.id ? data.session : s)
        );
        
        setEditSessionDialog(false);
        setEditSessionData(null);
        
        toast({
          title: "Session Updated",
          description: "The session has been successfully updated."
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update session",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating session:", error);
      toast({
        title: "Error",
        description: "An error occurred while updating the session",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="buyins">Buy-ins</TabsTrigger>
        </TabsList>
        
        {/* All Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>All Sessions</CardTitle>
                  <CardDescription>
                    View and manage all poker sessions.
                  </CardDescription>
                </div>
                
                <Button onClick={() => setCreateSessionDialog(true)}>
                  Create New Session
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No sessions found</TableCell>
                      </TableRow>
                    ) : (
                      allSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div>
                              <div>{session.title}</div>
                              <div className="text-xs text-muted-foreground">{session.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>{session.type}</TableCell>
                          <TableCell>
                            {formatDate(session.date)} {formatTime(session.startTime)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              `${
                                session.status === 'NOT_STARTED' ? 'bg-yellow-100 text-yellow-800' :
                                session.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                session.status === 'PAUSED' ? 'bg-blue-100 text-blue-800' :
                                session.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`
                            }>
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {session.status === 'NOT_STARTED' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8"
                                  onClick={() => updateSessionStatus('ACTIVE', session.id)}
                                >
                                  Start
                                </Button>
                              )}
                              
                              {session.status === 'ACTIVE' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8"
                                  onClick={() => updateSessionStatus('COMPLETED', session.id)}
                                >
                                  End
                                </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8"
                                onClick={() => handleEditSessionOpen(session)}
                              >
                                Edit
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSessionToDelete(session.id);
                                  setDeleteConfirmDialog(true);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Buy-ins Management Tab */}
        <TabsContent value="buyins">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Manage Buy-ins</CardTitle>
                  <CardDescription>
                    View and manage player buy-in requests for the current session.
                  </CardDescription>
                </div>
                
                {allSessions.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search player..."
                        className="pl-8 max-w-[200px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-1">
                          <Filter className="h-4 w-4" />
                          <span>Status: {statusFilter === "all" ? "All" : statusFilter}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("approved")}>Approved</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>Cancelled</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!allSessions.length ? (
                <p className="text-center py-6 text-muted-foreground">No active session.</p>
              ) : (
                <div>
                  <div className="rounded-md border mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableTableHead field="playerName">Player</SortableTableHead>
                          <SortableTableHead field="requestDate">Request Date</SortableTableHead>
                          <SortableTableHead field="amount">Amount</SortableTableHead>
                          <SortableTableHead field="status">Status</SortableTableHead>
                          <TableHead>Payment Code</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requestsWithPaymentCodes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">No buy-in requests found</TableCell>
                          </TableRow>
                        ) : (
                          requestsWithPaymentCodes.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div>
                                  <div>{request.playerName}</div>
                                  <div className="text-xs text-muted-foreground">{request.playerId}</div>
                                </div>
                              </TableCell>
                              <TableCell>{request.requestDate}</TableCell>
                              <TableCell>${request.amount}</TableCell>
                              <TableCell>
                                <Badge className={
                                  `${
                                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                  }`
                                }>
                                  {request.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {request.paymentCode && (
                                  <div className="font-mono text-xs bg-gray-100 p-1 rounded">
                                    {request.paymentCode}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {request.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8"
                                      onClick={() => handleUpdateBuyInStatus(request.id, 'approved')}
                                    >
                                      Approve
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8"
                                      onClick={() => handleUpdateBuyInStatus(request.id, 'cancelled')}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
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
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                type="text" 
                value={newSession.location}
                onChange={(e) => setNewSession({...newSession, location: e.target.value})}
              />
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
      
      {/* Edit Session Dialog */}
      <Dialog open={editSessionDialog} onOpenChange={setEditSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>
              Update the poker session details.
            </DialogDescription>
          </DialogHeader>
          
          {editSessionData && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input 
                  id="editTitle" 
                  type="text" 
                  value={editSessionData.title}
                  onChange={(e) => setEditSessionData({...editSessionData, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Input 
                  id="editDescription" 
                  type="text" 
                  value={editSessionData.description || ''}
                  onChange={(e) => setEditSessionData({...editSessionData, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editDate">Date</Label>
                  <Input 
                    id="editDate" 
                    type="date" 
                    value={editSessionData.date}
                    onChange={(e) => setEditSessionData({...editSessionData, date: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editTime">Time</Label>
                  <Input 
                    id="editTime" 
                    type="time" 
                    value={editSessionData.time}
                    onChange={(e) => setEditSessionData({...editSessionData, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editLocation">Location</Label>
                <Input 
                  id="editLocation" 
                  type="text" 
                  value={editSessionData.location}
                  onChange={(e) => setEditSessionData({...editSessionData, location: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editBuyIn">Buy-in Amount ($)</Label>
                <Input 
                  id="editBuyIn" 
                  type="number" 
                  min="1"
                  value={editSessionData.buyIn}
                  onChange={(e) => setEditSessionData({...editSessionData, buyIn: Number(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editMaxPlayers">Maximum Players</Label>
                <Input 
                  id="editMaxPlayers" 
                  type="number" 
                  min="2"
                  value={editSessionData.maxPlayers}
                  onChange={(e) => setEditSessionData({...editSessionData, maxPlayers: Number(e.target.value)})}
                />
              </div>
              
              {editSessionData.type === "cash" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editMinBuyIn">Minimum Buy-in</Label>
                    <Input 
                      id="editMinBuyIn" 
                      type="number" 
                      min="1"
                      value={editSessionData.minBuyIn}
                      onChange={(e) => setEditSessionData({...editSessionData, minBuyIn: Number(e.target.value)})}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditSessionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSession}>
              Update Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Delete Dialog */}
      <Dialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteSession(sessionToDelete)}>
              Delete Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}