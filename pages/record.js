import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function Record() {
  const { data: session, status } = useSession();
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  
  // Fetch game history from API
  useEffect(() => {
    if (status === "authenticated") {
      fetchGameHistory();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);
  
  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      
      if (!res.ok) {
        throw new Error("Failed to fetch game history data");
      }
      
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      console.error("Error fetching game history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  if (status === "loading" || loading) {
    return (
      <div className="container py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2 text-muted-foreground">Loading record data...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Not Signed In</h2>
            <p className="text-muted-foreground">Please sign in to view your record.</p>
          </CardContent>
        </Card>
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
  
  // Use profile data or empty defaults
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
  
  const gameHistory = profileData?.gameHistory || [];
  
  // Filter game history based on selected type
  const filteredGames = filterType === "all" 
    ? gameHistory 
    : gameHistory.filter(game => 
        game.session.type.toLowerCase() === (filterType === "tournament" ? "tournament" : "cash_game")
      );
  
  // Calculate win rate from actual data
  const winningGames = gameHistory.filter(game => game.winnings > game.buyIn).length;
  const winRate = gameHistory.length > 0 ? ((winningGames / gameHistory.length) * 100).toFixed(1) : 0;

  return (
    <div className="container py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Your Record</h1>
      
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">${stats.profit}</div>
            <p className="text-muted-foreground text-sm">
              {stats.totalGames} games • {winRate}% win rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">${stats.tournaments > 0 ? stats.profit : 0}</div>
            <p className="text-muted-foreground text-sm">
              {stats.tournaments} tournaments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cash Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">${stats.cashGames > 0 ? stats.profit : 0}</div>
            <p className="text-muted-foreground text-sm">
              {stats.cashGames} cash sessions
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Game History</CardTitle>
              <CardDescription>
                Detailed record of your poker sessions
              </CardDescription>
            </div>
            
            <div className="w-full md:w-48">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="tournament">Tournaments</SelectItem>
                  <SelectItem value="cash_game">Cash Games</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGames.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No games found</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Buy-In</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Winnings</TableHead>
                    <TableHead>Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game) => {
                    const profit = game.winnings - game.buyIn;
                    return (
                      <TableRow key={game.id}>
                        <TableCell>{formatDate(game.session.date)}</TableCell>
                        <TableCell>
                          <Badge variant={game.session.type === "TOURNAMENT" ? "default" : "outline"}>
                            {game.session.type === "TOURNAMENT" ? "Tournament" : "Cash Game"}
                          </Badge>
                        </TableCell>
                        <TableCell>{game.session.title}</TableCell>
                        <TableCell>${game.buyIn}</TableCell>
                        <TableCell>
                          {game.session.type === "TOURNAMENT" 
                            ? game.position 
                              ? `${game.position}${getOrdinalSuffix(game.position)} Place` 
                              : "Unknown"
                            : game.notes || "Cash Game"}
                        </TableCell>
                        <TableCell>${game.winnings}</TableCell>
                        <TableCell className={
                          profit > 0 
                            ? 'text-green-600' 
                            : profit < 0 
                              ? 'text-red-600' 
                              : ''
                        }>
                          {profit > 0 ? '+' : ''}{profit}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get ordinal suffix for numbers
function getOrdinalSuffix(i) {
  const j = i % 10,
        k = i % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
} 