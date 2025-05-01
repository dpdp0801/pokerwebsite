-- Check if BlindStructure table exists and create if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blindstructure') THEN
        -- Create BlindStructure table
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
        
        -- Log creation
        RAISE NOTICE 'Created BlindStructure table';
    ELSE
        RAISE NOTICE 'BlindStructure table already exists';
    END IF;
    
    -- Check for BlindLevel table
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blindlevel') THEN
        -- Create BlindLevel table
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
        
        -- Add foreign key constraint
        ALTER TABLE "BlindLevel" ADD CONSTRAINT "BlindLevel_structureId_fkey" 
        FOREIGN KEY ("structureId") REFERENCES "BlindStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
        -- Log creation
        RAISE NOTICE 'Created BlindLevel table';
    ELSE
        RAISE NOTICE 'BlindLevel table already exists';
    END IF;
END $$; 