import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Profile() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Mock data for user history
  const upcomingGames = [
    { id: 1, type: "Tournament", date: "Apr 28, 2023", time: "7:00 PM", status: "Registered" },
    { id: 2, type: "Cash Game", date: "May 5, 2023", time: "6:30 PM", status: "Waitlisted" },
  ];
  
  const gameHistory = [
    { id: 1, type: "Tournament", date: "Apr 14, 2023", buyIn: 100, result: "3rd Place", winnings: 300 },
    { id: 2, type: "Cash Game", date: "Apr 7, 2023", buyIn: 200, result: "Left Early", winnings: 150 },
    { id: 3, type: "Tournament", date: "Mar 24, 2023", buyIn: 100, result: "Bubble", winnings: 0 },
    { id: 4, type: "Tournament", date: "Mar 10, 2023", buyIn: 100, result: "1st Place", winnings: 700 },
  ];
  
  const stats = {
    totalGames: 12,
    tournaments: 8,
    cashGames: 4,
    totalBuyIns: 1200,
    totalWinnings: 2100,
    profit: 900,
    avgFinish: "3.2",
    firstPlace: 2
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
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Buy-In Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {/* This would be dynamic based on current buy-in requests */}
            <p className="text-muted-foreground text-center py-6">
              No pending buy-in requests
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Games</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming Games</TabsTrigger>
              <TabsTrigger value="history">Game History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="mt-4">
              {upcomingGames.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No upcoming games found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingGames.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>{game.type}</TableCell>
                        <TableCell>{game.date}</TableCell>
                        <TableCell>{game.time}</TableCell>
                        <TableCell>{game.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              {gameHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No game history found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Buy-In</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Winnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameHistory.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>{game.type}</TableCell>
                        <TableCell>{game.date}</TableCell>
                        <TableCell>${game.buyIn}</TableCell>
                        <TableCell>{game.result}</TableCell>
                        <TableCell className={game.winnings > game.buyIn ? 'text-green-600' : game.winnings === 0 ? 'text-red-600' : ''}>
                          ${game.winnings}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 