/*
  Warnings:

  - You are about to drop the column `timeString` on the `PokerSession` table. All the data in the column will be lost.

*/
-- Drop the column directly in PostgreSQL
ALTER TABLE "PokerSession" DROP COLUMN "timeString";

-- The SQLite specific table recreation logic below is removed --
-- PRAGMA defer_foreign_keys=ON;
-- PRAGMA foreign_keys=OFF;
-- CREATE TABLE "new_PokerSession" (...);
-- INSERT INTO "new_PokerSession" SELECT ... FROM "PokerSession";
-- DROP TABLE "PokerSession";
-- ALTER TABLE "new_PokerSession" RENAME TO "PokerSession";
-- PRAGMA foreign_keys=ON;
-- PRAGMA defer_foreign_keys=OFF;
