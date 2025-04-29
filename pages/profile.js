import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Profile() {
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (status === "authenticated") {
      fetchProfileData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);
  
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      
      if (!res.ok) {
        throw new Error("Failed to fetch profile data");
      }
      
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Format time for display
  const formatDisplayTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  if (!session) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Not Signed In</h2>
            <p className="text-muted-foreground">Please sign in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="container py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2 text-muted-foreground">Loading profile data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2 text-red-600">Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Use empty defaults if data isn't available yet
  const stats = profileData?.stats || {
    totalGames: 0,
    tournaments: 0,
    cashGames: 0,
    totalBuyIns: 0,
    totalWinnings: 0,
    profit: 0,
    avgFinish: "N/A",
    firstPlace: 0
  };
  
  const upcomingGames = profileData?.upcomingGames || [];
  const currentBuyInRequests = profileData?.currentBuyInRequests || [];

  return (
    <div className="container py-12 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Your Profile</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Total Games</dt>
                <dd className="text-2xl font-semibold">{stats.totalGames}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Net Profit</dt>
                <dd className={`text-2xl font-semibold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${stats.profit}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tournaments</dt>
                <dd>{stats.tournaments}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cash Games</dt>
                <dd>{stats.cashGames}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Avg. Tournament Finish</dt>
                <dd>{stats.avgFinish}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">1st Place Finishes</dt>
                <dd>{stats.firstPlace}</dd>
              </div>
            </dl>
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/record">View Full Game History</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Buy-In Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {currentBuyInRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No pending buy-in requests
              </p>
            ) : (
              <div className="space-y-4">
                {currentBuyInRequests.map((request) => (
                  <div key={request.id} className="border p-3 rounded-md">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-medium">{request.session.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        request.paymentStatus === "PAID" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {request.paymentStatus}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Buy-in: ${request.buyInAmount}
                    </p>
                    {request.paymentStatus === "UNPAID" && request.paymentCode && (
                      <p className="text-xs mt-2 font-mono">Code: {request.paymentCode}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Games</CardTitle>
          <CardDescription>
            Sessions you've registered for that haven't started yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingGames.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No upcoming games found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingGames.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>{reg.session.type === "TOURNAMENT" ? "Tournament" : "Cash Game"}</TableCell>
                    <TableCell>{reg.session.title}</TableCell>
                    <TableCell>{formatDisplayDate(reg.session.date)}</TableCell>
                    <TableCell>{formatDisplayTime(reg.session.startTime)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        reg.status === "CONFIRMED" 
                          ? "bg-green-100 text-green-800" 
                          : reg.status === "WAITLISTED"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {reg.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 