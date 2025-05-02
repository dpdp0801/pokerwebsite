-- AlterTable
-- Change data type of date and startTime columns to TEXT
ALTER TABLE "PokerSession"
  ALTER COLUMN "date" SET DATA TYPE TEXT,
  ALTER COLUMN "startTime" SET DATA TYPE TEXT;
