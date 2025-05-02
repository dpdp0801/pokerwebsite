import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Static blind structure data
const BLIND_STRUCTURE = {
  name: "Standard Structure",
  description: "Standard tournament blind structure with 20-minute levels",
  startingStack: 300,
  levels: [
    { level: 1, duration: 1, smallBlind: 1, bigBlind: 2, ante: 2, isBreak: false, displayLevel: 1 },
    { level: 2, duration: 1, smallBlind: 1, bigBlind: 3, ante: 3, isBreak: false, displayLevel: 2 },
    { level: 3, duration: 20, smallBlind: 2, bigBlind: 4, ante: 4, isBreak: false, displayLevel: 3 },
    { level: 4, duration: 20, smallBlind: 3, bigBlind: 6, ante: 6, isBreak: false, displayLevel: 4 },
    { level: 5, duration: 10, isBreak: true, displayLevel: "B1", specialDescription: "Chip up 1s" },
    { level: 6, duration: 20, smallBlind: 5, bigBlind: 10, ante: 10, isBreak: false, displayLevel: 5 },
    { level: 7, duration: 20, smallBlind: 10, bigBlind: 15, ante: 15, isBreak: false, displayLevel: 6 },
    { level: 8, duration: 20, smallBlind: 10, bigBlind: 20, ante: 20, isBreak: false, displayLevel: 7 },
    { level: 9, duration: 20, smallBlind: 15, bigBlind: 30, ante: 30, isBreak: false, displayLevel: 8 },
    { level: 10, duration: 10, isBreak: true, displayLevel: "B2*REG_CLOSE", specialDescription: "Chip up 5s\nRegistration Closes" },
    { level: 11, duration: 20, smallBlind: 25, bigBlind: 50, ante: 50, isBreak: false, displayLevel: 9 },
    { level: 12, duration: 20, smallBlind: 25, bigBlind: 75, ante: 75, isBreak: false, displayLevel: 10 },
    { level: 13, duration: 20, smallBlind: 50, bigBlind: 100, ante: 100, isBreak: false, displayLevel: 11 },
    { level: 14, duration: 20, smallBlind: 75, bigBlind: 150, ante: 150, isBreak: false, displayLevel: 12 },
    { level: 15, duration: 10, isBreak: true, displayLevel: "B3", specialDescription: "" },
    { level: 16, duration: 20, smallBlind: 100, bigBlind: 200, ante: 200, isBreak: false, displayLevel: 13 },
    { level: 17, duration: 20, smallBlind: 150, bigBlind: 300, ante: 300, isBreak: false, displayLevel: 14 },
    { level: 18, duration: 20, smallBlind: 200, bigBlind: 400, ante: 400, isBreak: false, displayLevel: 15 },
    { level: 19, duration: 20, smallBlind: 300, bigBlind: 600, ante: 600, isBreak: false, displayLevel: 16 }
  ]
};

// Static payout structure data
const PAYOUT_STRUCTURES = [
  {
    id: "1",
    name: "2-10 Players",
    minEntries: 2,
    maxEntries: 10,
    tiers: [
      { position: 1, percentage: 65 },
      { position: 2, percentage: 35 }
    ]
  },
  {
    id: "2",
    name: "11-20 Players",
    minEntries: 11,
    maxEntries: 20,
    tiers: [
      { position: 1, percentage: 50 },
      { position: 2, percentage: 30 },
      { position: 3, percentage: 20 }
    ]
  },
  {
    id: "3",
    name: "21-30 Players",
    minEntries: 21,
    maxEntries: 30,
    tiers: [
      { position: 1, percentage: 40 },
      { position: 2, percentage: 27 },
      { position: 3, percentage: 18 },
      { position: 4, percentage: 15 }
    ]
  },
  {
    id: "4",
    name: "31-40 Players",
    minEntries: 31,
    maxEntries: 40,
    tiers: [
      { position: 1, percentage: 38 },
      { position: 2, percentage: 24 },
      { position: 3, percentage: 17 },
      { position: 4, percentage: 12 },
      { position: 5, percentage: 9 }
    ]
  },
  {
    id: "5",
    name: "41-50 Players",
    minEntries: 41,
    maxEntries: 50,
    tiers: [
      { position: 1, percentage: 35 },
      { position: 2, percentage: 22 },
      { position: 3, percentage: 15 },
      { position: 4, percentage: 11 },
      { position: 5, percentage: 9 },
      { position: 6, percentage: 8 }
    ]
  },
  {
    id: "6",
    name: "51-60 Players",
    minEntries: 51,
    maxEntries: 60,
    tiers: [
      { position: 1, percentage: 32 },
      { position: 2, percentage: 20 },
      { position: 3, percentage: 14 },
      { position: 4, percentage: 10 },
      { position: 5, percentage: 8 },
      { position: 6, percentage: 8 },
      { position: 7, percentage: 8 }
    ]
  },
  {
    id: "7",
    name: "61-75 Players",
    minEntries: 61,
    maxEntries: 75,
    tiers: [
      { position: 1, percentage: 30 },
      { position: 2, percentage: 19 },
      { position: 3, percentage: 13 },
      { position: 4, percentage: 10 },
      { position: 5, percentage: 8 },
      { position: 6, percentage: 7 },
      { position: 7, percentage: 7 },
      { position: 8, percentage: 6 }
    ]
  },
  {
    id: "8",
    name: "76-100 Players",
    minEntries: 76,
    maxEntries: 100,
    tiers: [
      { position: 1, percentage: 28 },
      { position: 2, percentage: 17 },
      { position: 3, percentage: 12 },
      { position: 4, percentage: 9 },
      { position: 5, percentage: 7 },
      { position: 6, percentage: 6 },
      { position: 7, percentage: 6 },
      { position: 8, percentage: 5 },
      { position: 9, percentage: 5 },
      { position: 10, percentage: 5 }
    ]
  }
];

export default function Structure() {
  // Create a more compact display of positions
  // Only show key places: 1st, 2nd, 3rd, and optionally 4th-9th if they exist
  const displayPlaces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(place => {
    // Only include places that have payouts in at least one structure
    return PAYOUT_STRUCTURES.some(structure => 
      structure.tiers?.some(tier => tier.position === place)
    );
  });

  // Format the place name (1st, 2nd, 3rd, etc.)
  const getPlaceName = (place) => {
    switch(place) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${place}th Place`;
    }
  };

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Tournament Structure</h1>
      
      <div className="space-y-8">
        {/* Tournament/Cash Game Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament/Cash Game Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Pre-Registration</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                <li>Your reserved seat will be held for 30 minutes after the tournament start time.</li>
                <li>If you haven't arrived within 30 minutes of start time, your seat will be removed.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* General Tournament Info */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Rake</h3>
              <p className="text-muted-foreground">No rake</p>
            </div>
            <div>
              <h3 className="font-medium">Starting Stack</h3>
              <p className="text-muted-foreground">{BLIND_STRUCTURE.startingStack.toLocaleString()} chips</p>
            </div>
            <div>
              <h3 className="font-medium">Target Duration</h3>
              <p className="text-muted-foreground">~4-5 hours</p>
            </div>
            <div>
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
            <div className="my-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Level</th>
                      <th className="border p-2 text-left">Small Blind</th>
                      <th className="border p-2 text-left">Big Blind</th>
                      <th className="border p-2 text-left">Ante</th>
                      <th className="border p-2 text-left">Duration</th>
                      <th className="border p-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BLIND_STRUCTURE.levels.map((level, index) => (
                      <tr key={index} className={level.isBreak ? 'bg-accent/20' : ''}>
                        <td className="border p-2">{level.displayLevel}</td>
                        <td className="border p-2">{level.isBreak ? '-' : level.smallBlind}</td>
                        <td className="border p-2">{level.isBreak ? '-' : level.bigBlind}</td>
                        <td className="border p-2">{level.isBreak ? '-' : (level.ante || '-')}</td>
                        <td className="border p-2">{level.duration} mins</td>
                        <td className="border p-2 whitespace-pre-line">
                          {level.specialDescription ? level.specialDescription : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Structure</CardTitle>
          </CardHeader>
          <CardContent>
            {PAYOUT_STRUCTURES.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entries</TableHead>
                      {displayPlaces.map(place => (
                        <TableHead key={place} className="text-center">{getPlaceName(place)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PAYOUT_STRUCTURES.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell className="font-medium">{structure.name}</TableCell>
                        {displayPlaces.map(place => {
                          const tier = structure.tiers?.find(t => t.position === place);
                          return (
                            <TableCell key={place} className="text-center">
                              {tier ? `${tier.percentage}%` : '—'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No payout structures available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 