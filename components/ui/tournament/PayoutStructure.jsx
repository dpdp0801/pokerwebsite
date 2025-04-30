import React from 'react';
import { Award } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Helper function to calculate payout
const calculatePayout = (percentage, buyIn, playerCount) => {
  // Add safety checks
  if (!percentage || !buyIn || !playerCount || playerCount <= 0) {
    return '0.00';
  }
  const totalPrizePool = buyIn * playerCount;
  return (totalPrizePool * (percentage / 100)).toFixed(2);
};

export default function PayoutStructure({ 
  shouldShowPayouts, 
  payoutStructure, 
  currentSession, 
  isAdmin 
}) {
  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="font-medium text-lg mb-3 text-center flex items-center justify-center">
        <Award className="h-5 w-5 mr-1 text-amber-500" />
        Payout Structure
      </h3>
      
      {payoutStructure ? (
        <>
          <div className="mb-2 text-center text-sm text-muted-foreground">
            Based on {currentSession.totalEntries || 0} entries - 
            Total Prize Pool: ${(currentSession.buyIn * (currentSession.totalEntries || 0)).toLocaleString()}
          </div>
          <div className="border rounded-md overflow-hidden mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Place</TableHead>
                  {(payoutStructure.tiers || []).map((tier) => (
                    <TableHead key={tier.id} className="text-center">
                      {tier.position}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payoutStructure.tiers || []).length > 0 ? (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">Percentage</TableCell>
                      {payoutStructure.tiers.map((tier) => (
                        <TableCell key={tier.id} className="text-center">
                          {tier.percentage}%
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Payout</TableCell>
                      {payoutStructure.tiers.map((tier) => (
                        <TableCell key={tier.id} className="text-center font-medium">
                          ${calculatePayout(
                            tier.percentage, 
                            currentSession.buyIn, 
                            currentSession.totalEntries || currentSession.registeredPlayers || 0
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={payoutStructure.tiers?.length || 1} className="text-center py-4 text-muted-foreground">
                      Payout information will appear when entries are registered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted-foreground">No payout structure available yet.</p>
        </div>
      )}
    </div>
  );
} 