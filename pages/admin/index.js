import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("session");
  const [createSessionDialog, setCreateSessionDialog] = useState(false);
  const [sessionType, setSessionType] = useState("mtt");
  
  // Check if query params indicate we should open create session dialog
  useEffect(() => {
    if (router.query.action === "create-session") {
      setCreateSessionDialog(true);
      // Clean up the URL
      router.replace("/admin", undefined, { shallow: true });
    }
  }, [router]);
  
  // This would come from an API in a real implementation
  const [currentSession, setCurrentSession] = useState({
    exists: false,
    type: null,
    status: null,
    date: "",
    time: "",
    buyIn: 0,
    maxPlayers: 0
  });
  
  // Mock data for buy-in requests
  const [buyInRequests, setBuyInRequests] = useState([
    { id: 1, playerId: "user123", playerName: "John Doe", requestDate: "2023-04-27 14:30", amount: 100, status: "pending" },
    { id: 2, playerId: "user456", playerName: "Jane Smith", requestDate: "2023-04-27 15:15", amount: 100, status: "approved" },
    { id: 3, playerId: "user789", playerName: "Bob Johnson", requestDate: "2023-04-27 16:20", amount: 200, status: "cancelled" },
  ]);
  
  // Form state for creating a new session
  const [newSession, setNewSession] = useState({
    type: "mtt",
    date: "",
    time: "",
    buyIn: 100,
    maxPlayers: 9
  });
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("requestDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleCreateSession = () => {
    // Validate form
    if (!newSession.date || !newSession.time || !newSession.buyIn || !newSession.maxPlayers) {
      toast({
        title: "Validation Error",
        description: "Please fill out all fields",
        variant: "destructive"
      });
      return;
    }
    
    // This would be an API call in a real implementation
    setCurrentSession({
      exists: true,
      type: newSession.type,
      status: "not_started",
      ...newSession
    });
    
    setCreateSessionDialog(false);
    
    toast({
      title: "Session Created",
      description: `A new ${newSession.type === 'mtt' ? 'tournament' : 'cash game'} has been created.`
    });
  };
  
  const handleStartSession = () => {
    setCurrentSession({
      ...currentSession,
      status: "ongoing"
    });
    
    toast({
      title: "Session Started",
      description: `The ${currentSession.type === 'mtt' ? 'tournament' : 'cash game'} has been started.`
    });
  };
  
  const handlePauseSession = () => {
    setCurrentSession({
      ...currentSession,
      status: "paused"
    });
    
    toast({
      title: "Session Paused",
      description: "The tournament has been paused."
    });
  };
  
  const handleResumeSession = () => {
    setCurrentSession({
      ...currentSession,
      status: "ongoing"
    });
    
    toast({
      title: "Session Resumed",
      description: "The tournament has been resumed."
    });
  };
  
  const handleEndSession = () => {
    setCurrentSession({
      exists: false,
      type: null,
      status: null,
      date: "",
      time: "",
      buyIn: 0,
      maxPlayers: 0
    });
    
    toast({
      title: "Session Ended",
      description: "The session has been ended."
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

  if (!session || session.role !== "ADMIN") {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="session">Session Management</TabsTrigger>
          <TabsTrigger value="buyins">Manage Buy-ins</TabsTrigger>
        </TabsList>
        
        {/* Session Management Tab */}
        <TabsContent value="session">
          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>
                Create, start, pause, and end poker sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentSession.exists ? (
                <div className="space-y-6">
                  <div className="bg-muted rounded-md p-4">
                    <h3 className="font-medium text-lg mb-2">Current Session</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span> {currentSession.type === 'mtt' ? 'Tournament' : 'Cash Game'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span> {currentSession.status === 'not_started' ? 'Not Started' : currentSession.status === 'ongoing' ? 'Ongoing' : 'Paused'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span> {currentSession.date}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span> {currentSession.time}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Buy-in:</span> ${currentSession.buyIn}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Players:</span> {currentSession.maxPlayers}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {currentSession.status === 'not_started' && (
                      <Button onClick={handleStartSession}>Start Session</Button>
                    )}
                    
                    {currentSession.status === 'ongoing' && currentSession.type === 'mtt' && (
                      <Button onClick={handlePauseSession}>Pause Tournament</Button>
                    )}
                    
                    {currentSession.status === 'paused' && currentSession.type === 'mtt' && (
                      <Button onClick={handleResumeSession}>Resume Tournament</Button>
                    )}
                    
                    <Button variant="destructive" onClick={handleEndSession}>End Session</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-6">No active session. Create a new poker session to get started.</p>
                  <Button onClick={() => setCreateSessionDialog(true)}>Create New Session</Button>
                </div>
              )}
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
                
                {currentSession.exists && (
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
              {!currentSession.exists ? (
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
    </div>
  );
}