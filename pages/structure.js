import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Structure() {
  // Mock data for blinds structure
  const blindsStructure = [
    { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 20 },
    { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 20 },
    { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, duration: 20 },
    { level: 4, smallBlind: 100, bigBlind: 200, ante: 25, duration: 20 },
    { level: 5, smallBlind: 150, bigBlind: 300, ante: 25, duration: 20 },
    { level: 6, smallBlind: 200, bigBlind: 400, ante: 50, duration: 20 },
    { level: 7, smallBlind: 300, bigBlind: 600, ante: 75, duration: 20 },
    { level: 8, smallBlind: 400, bigBlind: 800, ante: 100, duration: 20 },
    { level: 9, smallBlind: 500, bigBlind: 1000, ante: 100, duration: 20 },
    { level: 10, smallBlind: 700, bigBlind: 1400, ante: 200, duration: 20 },
  ];

  // Mock data for payout structure
  const payoutStructure = [
    { position: 1, percentage: "50%" },
    { position: 2, percentage: "30%" },
    { position: 3, percentage: "20%" },
  ];

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Tournament Structure</h1>
      
      <div className="space-y-8">
        {/* General Tournament Info */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Rake</h3>
              <p className="text-muted-foreground">No rake (100% of buy-ins go to prize pool)</p>
            </div>
            <div>
              <h3 className="font-medium">Starting Stack</h3>
              <p className="text-muted-foreground">10,000 chips</p>
            </div>
            <div>
              <h3 className="font-medium">Target Duration</h3>
              <p className="text-muted-foreground">~4 hours</p>
            </div>
            <div>
              <h3 className="font-medium">In the Money</h3>
              <p className="text-muted-foreground">Top 3 places (for 9+ players)</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-medium">Re-entry Policy</h3>
              <p className="text-muted-foreground">Unlimited re-entries during registration period. If waitlist exists, eliminated players join the waitlist.</p>
            </div>
          </CardContent>
        </Card>

        {/* Blind Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Blind Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Small Blind</TableHead>
                  <TableHead>Big Blind</TableHead>
                  <TableHead>Ante</TableHead>
                  <TableHead>Duration (minutes)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blindsStructure.map((level) => (
                  <TableRow key={level.level}>
                    <TableCell>{level.level}</TableCell>
                    <TableCell>{level.smallBlind}</TableCell>
                    <TableCell>{level.bigBlind}</TableCell>
                    <TableCell>{level.ante}</TableCell>
                    <TableCell>{level.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payout Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Percentage of Prize Pool</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutStructure.map((position) => (
                  <TableRow key={position.position}>
                    <TableCell>{position.position}</TableCell>
                    <TableCell>{position.percentage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 