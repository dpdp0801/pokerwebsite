-- AlterTable
ALTER TABLE "PokerSession" ADD COLUMN     "entries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "itmPlayersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "levelStartTime" TIMESTAMP(3),
ADD COLUMN     "registrationClosed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "isRebuy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playerStatus" TEXT NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "wasRegistered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "venmoId" TEXT;

-- CreateTable
CREATE TABLE "PayoutStructure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minEntries" INTEGER NOT NULL,
    "maxEntries" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutTier" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "payoutStructureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayoutTier_payoutStructureId_position_key" ON "PayoutTier"("payoutStructureId", "position");

-- AddForeignKey
ALTER TABLE "PayoutTier" ADD CONSTRAINT "PayoutTier_payoutStructureId_fkey" FOREIGN KEY ("payoutStructureId") REFERENCES "PayoutStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
