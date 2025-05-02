import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/tournament-rebuy called with method:", req.method);
  
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  // Admin-only endpoint
  if (!session.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  try {
    // Extract request data
    const { registrationId } = req.body;
    
    if (!registrationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: registrationId is required' 
      });
    }
    
    console.log(`Processing rebuy for registration: ${registrationId}`);
    
    // Find the registration including the session
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { session: true }
    });
    
    if (!registration) {
      return res.status(404).json({ 
        success: false, 
        message: 'Registration not found' 
      });
    }
    
    // Make sure this is a tournament
    if (registration.session.type !== 'TOURNAMENT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Rebuys are only allowed for tournaments' 
      });
    }
    
    console.log(`Found registration: ${registrationId}, session ID: ${registration.sessionId}`);
    
    // Use a transaction to update both the registration and the session
    const result = await prisma.$transaction(async (tx) => {
      // 1. Increment the rebuy count on the registration
      const updatedRegistration = await tx.registration.update({
        where: { id: registrationId },
        data: {
          rebuys: {
            increment: 1
          }
        }
      });
      
      // 2. Increment the total entries on the session
      const updatedSession = await tx.pokerSession.update({
        where: { id: registration.sessionId },
        data: {
          totalEntries: {
            increment: 1
          }
        }
      });
      
      return { registration: updatedRegistration, session: updatedSession };
    });
    
    console.log("Rebuy transaction completed successfully:", {
      registrationRebuys: result.registration.rebuys,
      sessionTotalEntries: result.session.totalEntries
    });
    
    return res.status(200).json({
      success: true,
      message: 'Rebuy processed successfully',
      registration: result.registration,
      session: result.session
    });
    
  } catch (error) {
    console.error('Error processing rebuy:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing rebuy',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 