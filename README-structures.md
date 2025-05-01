# Tournament Structure System

This document explains how blind levels and payout structures are managed in the poker website.

## File-Based Structure Storage

Tournament structures (blind levels and payout distributions) are stored as static JSON files in the `data/` directory, rather than in the database. This approach:

1. Reduces database load
2. Simplifies deployment
3. Makes structure changes version-controllable
4. Improves performance for frequently accessed data

## File Locations

- **Blind Structure**: `data/blindStructure.json`
- **Payout Structures**: `data/payoutStructures.json`

## Blind Structure Format

The blind structure JSON file contains all information about tournament blind levels, including:

```json
{
  "name": "Standard Structure",
  "description": "Standard tournament blind structure with 20-minute levels",
  "startingStack": 10000,
  "isDefault": true,
  "levels": [
    { "level": 1, "duration": 20, "smallBlind": 1, "bigBlind": 2, "ante": 2, "isBreak": false },
    ...
    { "level": 5, "duration": 10, "isBreak": true, "breakName": "Break 1", "specialAction": "CHIP_UP_1S" },
    ...
  ]
}
```

Special actions during breaks can include:
- `CHIP_UP_1S`: Chip up 1's
- `CHIP_UP_5S`: Chip up 5's
- `REG_CLOSE`: Close registration

## Payout Structure Format

The payout structures JSON file contains an array of payment structure objects, each corresponding to a range of player counts:

```json
[
  {
    "name": "2-10 Players",
    "minEntries": 2,
    "maxEntries": 10,
    "tiers": [
      { "position": 1, "percentage": 65 },
      { "position": 2, "percentage": 35 }
    ]
  },
  ...
]
```

## How It Works

1. The API endpoints in `pages/api/blinds/` and `pages/api/payout-structures/` read data from these files rather than querying the database
2. The `lib/structures.js` file provides utility functions for accessing the structure data
3. The only database interaction is updating the current blind level index for a session (in `PokerSession` table)

## Updating Structures

To update the tournament structures:

1. Modify the appropriate JSON file in the `data/` directory
2. Commit the changes to version control
3. Deploy the changes to production

This approach ensures that all blind levels and payout structures are consistently applied across all tournaments. 