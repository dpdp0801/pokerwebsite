/* Prisma migration to add firstName and lastName fields to the User table */

ALTER TABLE "User"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName"  TEXT; 