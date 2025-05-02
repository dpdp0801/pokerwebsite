import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/player-status called with method:", req.method);
  
  // Only allow POST or PUT methods
  if (req.method !== 'POST' && req.method !== 'PUT') {
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
    const { registrationId, status, newStatus } = req.body;
    
    // Use either status (new API) or newStatus (old API)
    const statusToUse = status || newStatus;
    
    if (!registrationId || !statusToUse) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: registrationId and status are required' 
      });
    }
    
    console.log(`Processing status update: Registration ${registrationId} to ${statusToUse}`);
    
    // Find the registration
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
    
    console.log(`Found registration: ${registrationId}, current status: ${registration.status}, current playerStatus: ${registration.playerStatus}`);
    
    // Map status values based on common patterns
    let dbStatus, dbPlayerStatus;
    
    switch (statusToUse.toUpperCase()) {
      case 'WAITLIST':
        dbStatus = 'WAITLISTED';
        dbPlayerStatus = 'WAITLISTED';
        break;
      case 'WAITLISTED':
        dbStatus = 'WAITLISTED';
        dbPlayerStatus = 'WAITLISTED';
        break;
      case 'ACTIVE':
        dbStatus = 'CONFIRMED';
        dbPlayerStatus = 'CURRENT';
        break;
      case 'FINISHED':
        dbStatus = 'CONFIRMED';
        dbPlayerStatus = 'FINISHED';
        break;
      default:
        dbStatus = statusToUse.toUpperCase();
        dbPlayerStatus = statusToUse.toUpperCase();
    }
    
    console.log(`Mapped status values: dbStatus=${dbStatus}, dbPlayerStatus=${dbPlayerStatus}`);
    
    // Update the registration
    const updatedReg = await prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: dbStatus,
        playerStatus: dbPlayerStatus
      }
    });
    
    console.log(`Updated registration: ${updatedReg.id}, new status: ${updatedReg.status}, new playerStatus: ${updatedReg.playerStatus}`);
    
    return res.status(200).json({
      success: true,
      message: `Player status updated to ${statusToUse}`,
      registration: updatedReg
    });
    
  } catch (error) {
    console.error('Error updating player status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating player status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 