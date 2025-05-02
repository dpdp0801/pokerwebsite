import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    // Check that the user is authenticated and an admin
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || session.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (req.method === 'POST') {
      const { action, registrationId, amount } = req.body;
      
      if (!registrationId) {
        return res.status(400).json({ success: false, message: 'Registration ID is required' });
      }
      
      if (!amount || isNaN(parseInt(amount))) {
        return res.status(400).json({ success: false, message: 'Valid amount is required' });
      }

      const amountNum = parseInt(amount);
      
      // Fetch the registration
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { session: true }
      });
      
      if (!registration) {
        return res.status(404).json({ success: false, message: 'Registration not found' });
      }
      
      // Make sure this is a cash game
      if (registration.session.type !== 'CASH_GAME') {
        return res.status(400).json({ 
          success: false, 
          message: 'This operation is only available for cash games' 
        });
      }

      if (action === 'buyin') {
        // Update the registration with the new buy-in amount
        const updatedRegistration = await prisma.registration.update({
          where: { id: registrationId },
          data: {
            buyInTotal: { increment: amountNum },
            playerStatus: 'CURRENT',  // Ensure player is marked as current
            status: 'CONFIRMED'  // Ensure registration status is confirmed
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Buy-in processed successfully',
          registration: updatedRegistration
        });
      } 
      else if (action === 'cashout') {
        // Cash out logic - allow zero as a valid amount
        // Validate amount
        if (isNaN(amountNum) || amountNum < 0) {
          return res.status(400).json({ 
            success: false, 
            message: "Cash-out amount must be a valid number greater than or equal to 0." 
          });
        }

        // Update the registration with the cash-out amount and calculate profit/loss
        const updatedRegistration = await prisma.registration.update({
          where: { id: registrationId },
          data: {
            cashOut: amountNum,
            netProfit: amountNum - registration.buyInTotal,
            playerStatus: 'FINISHED'  // Mark the player as finished
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Cash-out processed successfully',
          registration: updatedRegistration
        });
      }
      else {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid action. Must be "buyin" or "cashout"' 
        });
      }
    }
    
    // If not POST method
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Cash game API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 