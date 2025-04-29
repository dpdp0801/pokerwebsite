-- AlterTable
ALTER TABLE "PokerSession" ADD COLUMN     "currentBlindLevel" INTEGER;

-- CreateTable
CREATE TABLE "BlindLevel" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "smallBlind" INTEGER,
    "bigBlind" INTEGER,
    "ante" INTEGER,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "breakName" TEXT,
    "specialAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "structureId" TEXT NOT NULL,

    CONSTRAINT "BlindLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindStructure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startingStack" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlindStructure_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BlindLevel" ADD CONSTRAINT "BlindLevel_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "BlindStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
