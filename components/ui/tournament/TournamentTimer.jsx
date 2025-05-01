import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function TournamentTimer({
  formatTimer,
  blindStructureData,
  isAdmin,
  blindsLoading,
  currentSession,
  updateBlindLevel
}) {
  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="font-medium text-lg mb-3 text-center">Timer</h3>
      
      {/* Timer Display - Always visible */}
      <div className="text-center mb-6">
        <div className="text-8xl font-bold mb-1">{formatTimer()}</div>
      </div>
      
      {/* Admin Controls */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-3">
          {isAdmin && (
            <div className="flex items-center space-x-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!blindsLoading) {
                    try {
                      await updateBlindLevel(Math.max(0, (currentSession.currentBlindLevel || 0) - 1));
                    } finally {
                      // The setting of loading state is handled in the parent component
                    }
                  }
                }}
                disabled={blindsLoading || currentSession.currentBlindLevel === undefined || currentSession.currentBlindLevel === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>Previous</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!blindsLoading) {
                    try {
                      await updateBlindLevel((currentSession.currentBlindLevel || 0) + 1);
                    } finally {
                      // The setting of loading state is handled in the parent component
                    }
                  }
                }}
                disabled={blindsLoading || currentSession.currentBlindLevel === undefined || currentSession.currentBlindLevel >= (blindStructureData?.totalLevels - 1)}
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Level Information */}
      {blindStructureData?.currentLevel ? (
        blindStructureData.currentLevel.isBreak ? (
          <BreakDisplay currentLevel={blindStructureData.currentLevel} />
        ) : (
          <LevelDisplay currentLevel={blindStructureData.currentLevel} />
        )
      ) : (
        <div className="bg-background border rounded-md p-4">
          <div className="text-center font-medium text-base text-muted-foreground mb-2">
            Waiting for blind structure data...
          </div>
        </div>
      )}
    </div>
  );
}

// Break display component
function BreakDisplay({ currentLevel }) {
  // Ensure currentLevel is not null
  if (!currentLevel) {
    return (
      <div className="bg-blue-50 p-4 rounded-md text-center mb-4">
        <h4 className="font-medium text-blue-800">Loading break data...</h4>
      </div>
    );
  }
  
  return (
    <div className="bg-blue-50 p-4 rounded-md text-center mb-4">
      <h4 className="font-medium text-blue-800">
        {currentLevel.breakName || 'Break'} - {currentLevel.duration} minutes
      </h4>
      {currentLevel.specialAction && (
        <p className="text-sm text-blue-700 mt-1">
          {currentLevel.specialAction === 'CHIP_UP_1S' && 'Chip Up 1s'}
          {currentLevel.specialAction === 'CHIP_UP_5S' && 'Chip Up 5s'}
          {currentLevel.specialAction === 'REG_CLOSE' && 'Registration Closes'}
          {currentLevel.specialAction === 'REG_CLOSE_CHIP_UP_5S' && (
            <>Registration Closes<br />Chip Up 5s</>
          )}
        </p>
      )}
    </div>
  );
}

// Level display component
function LevelDisplay({ currentLevel }) {
  // Ensure currentLevel is not null
  if (!currentLevel) {
    return (
      <div className="bg-background border rounded-md p-4">
        <div className="text-center font-medium text-base text-muted-foreground mb-2">
          Loading level data...
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-background border rounded-md p-4">
      {/* Current Level */}
      <div className="text-center font-medium text-base text-muted-foreground mb-2">
        Current Level: {currentLevel.level || 1}
      </div>
      <div className="grid grid-cols-3 gap-4 items-center my-3">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Small Blind</p>
          <p className="text-6xl font-bold">{currentLevel.smallBlind || '—'}</p>
        </div>
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Big Blind</p>
          <p className="text-6xl font-bold">{currentLevel.bigBlind || '—'}</p>
        </div>
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Ante</p>
          <p className="text-6xl font-bold">{currentLevel.ante || '—'}</p>
        </div>
      </div>
    </div>
  );
} 