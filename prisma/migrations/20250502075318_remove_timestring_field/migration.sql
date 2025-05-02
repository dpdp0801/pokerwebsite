/*
  Warnings:

  - You are about to drop the column `timeString` on the `PokerSession` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PokerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "location" TEXT NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "minBuyIn" INTEGER,
    "maxBuyIn" INTEGER,
    "smallBlind" REAL,
    "bigBlind" REAL,
    "maxPlayers" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "entries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "currentBlindLevel" INTEGER,
    "levelStartTime" DATETIME,
    "registrationClosed" BOOLEAN NOT NULL DEFAULT false,
    "itmPlayersCount" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_PokerSession" ("bigBlind", "buyIn", "createdAt", "currentBlindLevel", "date", "description", "endTime", "entries", "id", "itmPlayersCount", "levelStartTime", "location", "maxBuyIn", "maxPlayers", "minBuyIn", "registrationClosed", "smallBlind", "startTime", "status", "title", "type", "updatedAt") SELECT "bigBlind", "buyIn", "createdAt", "currentBlindLevel", "date", "description", "endTime", "entries", "id", "itmPlayersCount", "levelStartTime", "location", "maxBuyIn", "maxPlayers", "minBuyIn", "registrationClosed", "smallBlind", "startTime", "status", "title", "type", "updatedAt" FROM "PokerSession";
DROP TABLE "PokerSession";
ALTER TABLE "new_PokerSession" RENAME TO "PokerSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
