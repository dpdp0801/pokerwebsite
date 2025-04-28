import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Record() {
  const { data: session } = useSession();
  const [filterType, setFilterType] = useState("all");
  
  // Mock data for user history
  const gameHistory = [
    { id: 1, type: "Tournament", date: "Apr 14, 2023", buyIn: 100, result: "3rd Place", winnings: 300, profit: 200, notes: "Knocked out on the river." },
    { id: 2, type: "Cash Game", date: "Apr 7, 2023", buyIn: 200, result: "Left Early", winnings: 150, profit: -50, notes: "Had to leave after 2 hours." },
    { id: 3, type: "Tournament", date: "Mar 24, 2023", buyIn: 100, result: "Bubble", winnings: 0, profit: -100, notes: "Bubble boy :(" },
    { id: 4, type: "Tournament", date: "Mar 10, 2023", buyIn: 100, result: "1st Place", winnings: 700, profit: 600, notes: "Dominated the final table." },
    { id: 5, type: "Cash Game", date: "Feb 24, 2023", buyIn: 200, result: "Winning Session", winnings: 350, profit: 150, notes: "Great session, hit a straight flush." },
    { id: 6, type: "Tournament", date: "Feb 17, 2023", buyIn: 100, result: "2nd Place", winnings: 400, profit: 300, notes: "Lost heads-up to a bad beat." },
    { id: 7, type: "Cash Game", date: "Feb 3, 2023", buyIn: 200, result: "Break Even", winnings: 200, profit: 0, notes: "Tight table, couldn't get much going." },
    { id: 8, type: "Tournament", date: "Jan 27, 2023", buyIn: 100, result: "5th Place", winnings: 150, profit: 50, notes: "Deep run but lost a flip." },
  ];
  
  // Filter game history based on selected type
  const filteredGames = filterType === "all" 
    ? gameHistory 
    : gameHistory.filter(game => game.type.toLowerCase() === filterType);
  
  // Calculate statistics
  const totalGames = gameHistory.length;
  const tournamentGames = gameHistory.filter(game => game.type === "Tournament").length;
  const cashGames = gameHistory.filter(game => game.type === "Cash Game").length;
  
  const totalProfit = gameHistory.reduce((sum, game) => sum + game.profit, 0);
  const tournamentProfit = gameHistory
    .filter(game => game.type === "Tournament")
    .reduce((sum, game) => sum + game.profit, 0);
  const cashProfit = gameHistory
    .filter(game => game.type === "Cash Game")
    .reduce((sum, game) => sum + game.profit, 0);
  
  const winningGames = gameHistory.filter(game => game.profit > 0).length;
  const winRate = totalGames > 0 ? ((winningGames / totalGames) * 100).toFixed(1) : 0;

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

  return (
    <div className="container py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Your Record</h1>
      
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">${totalProfit}</div>
            <p className="text-muted-foreground text-sm">
              {totalGames} games • {winRate}% win rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">${tournamentProfit}</div>
            <p className="text-muted-foreground text-sm">
              {tournamentGames} tournaments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cash Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">${cashProfit}</div>
            <p className="text-muted-foreground text-sm">
              {cashGames} cash sessions
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
                  <SelectItem value="cash game">Cash Games</SelectItem>
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
                    <TableHead>Buy-In</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Winnings</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>{game.date}</TableCell>
                      <TableCell>
                        <Badge variant={game.type === "Tournament" ? "default" : "outline"}>
                          {game.type}
                        </Badge>
                      </TableCell>
                      <TableCell>${game.buyIn}</TableCell>
                      <TableCell>{game.result}</TableCell>
                      <TableCell>${game.winnings}</TableCell>
                      <TableCell className={
                        game.profit > 0 
                          ? 'text-green-600' 
                          : game.profit < 0 
                            ? 'text-red-600' 
                            : ''
                      }>
                        {game.profit > 0 ? '+' : ''}{game.profit}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{game.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 