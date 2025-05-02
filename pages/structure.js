import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns"; // Keep format if needed for other things, remove parseISO if not used
import fs from 'fs'; // Import fs for file reading
import path from 'path'; // Import path for file path

// This function runs at build time
export async function getStaticProps() {
  let blindStructureData = null;
  let payoutStructuresData = [];

  try {
    const dataDirectory = path.join(process.cwd(), 'data');
    const configFilePath = path.join(dataDirectory, 'tournamentConfig.json');
    
    if (fs.existsSync(configFilePath)) {
        const fileContents = fs.readFileSync(configFilePath, 'utf8');
        const config = JSON.parse(fileContents);
        // Basic validation
        if (config && typeof config === 'object' && config.blindStructure && config.payoutStructures) {
             blindStructureData = config.blindStructure;
             payoutStructuresData = config.payoutStructures;
        } else {
            console.error("[StructurePage/getStaticProps] Invalid config file format.");
        }
    } else {
        console.error(`[StructurePage/getStaticProps] Config file not found: ${configFilePath}`);
    }
  } catch (error) {
      console.error(`[StructurePage/getStaticProps] Error reading/parsing config file:`, error);
      // Keep data as null/empty array on error
  }

  // Ensure blindStructureData is not null before processing levels
  let processedLevels = [];
  if (blindStructureData && Array.isArray(blindStructureData.levels)) {
      let regularLevelCount = 0;
      let breakCount = 0;
      processedLevels = blindStructureData.levels.map(level => {
        if (level.isBreak) {
          breakCount++;
          let specialDescription = '';
          if (level.specialAction) {
            if (level.specialAction.includes('CHIP_UP_1S')) { specialDescription += 'Chip up 1s\n'; }
            if (level.specialAction.includes('CHIP_UP_5S')) { specialDescription += 'Chip up 5s\n'; }
            if (level.specialAction.includes('REG_CLOSE')) { specialDescription += 'Registration Closes\n'; }
          } else {
            // Default break descriptions (adjust if needed)
            if (breakCount === 1) { specialDescription = 'Chip up 1s'; }
            else if (breakCount === 2) { specialDescription = 'Chip up 5s\nRegistration Closes'; }
          }
          return { ...level, displayLevel: level.breakName || 'Break', specialDescription };
        } else {
          regularLevelCount++;
          return { ...level, displayLevel: regularLevelCount, specialDescription: '' };
        }
      });
  } else {
       console.error("[StructurePage/getStaticProps] No valid blind structure data found to process levels.");
       // Ensure blindStructureData passed to props is at least an empty object if it was null
       if (!blindStructureData) blindStructureData = { levels: [] }; 
  }

  return {
    props: {
      // Ensure blindStructure always has a levels array, even if empty
      blindStructure: { ...(blindStructureData || {}), levels: processedLevels },
      payoutStructures: payoutStructuresData
    },
  };
}

// Create a more compact display of positions
const displayPlaces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Format the place name (1st, 2nd, 3rd, etc.)
const getPlaceName = (place) => {
  switch(place) {
    case 1: return '1st Place';
    case 2: return '2nd Place';
    case 3: return '3rd Place';
    default: return `${place}th Place`;
  }
};

export default function StructurePage({ blindStructure, payoutStructures }) {

  // Filter places based on actual payout data
  const actualDisplayPlaces = displayPlaces.filter(place => {
    return payoutStructures.some(structure => 
      structure.tiers?.some(tier => tier.position === place)
    );
  });

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
              <p className="text-muted-foreground">No rake</p>
            </div>
            <div>
              <h3 className="font-medium">Starting Stack</h3>
              <p className="text-muted-foreground">{blindStructure?.startingStack.toLocaleString()} chips</p>
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
                    {blindStructure?.levels.map((level, index) => (
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
            {payoutStructures.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entries</TableHead>
                      {actualDisplayPlaces.map(place => (
                        <TableHead key={place} className="text-center">{getPlaceName(place)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutStructures.map((structure) => (
                      <TableRow key={structure.id || structure.name}> {/* Add a key */}
                        <TableCell className="font-medium">{structure.name.replace("Players", "Entries")}</TableCell>
                        {actualDisplayPlaces.map(place => {
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