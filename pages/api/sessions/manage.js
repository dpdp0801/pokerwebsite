import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/sessions/manage called with method:", req.method);
  
  try {
    // Check authentication and admin role
    const session = await getServerSession(req, res, authOptions);
    console.log("User session:", session ? { 
      user: session.user?.email, 
      role: session.role 
    } : "No session");
    
    if (!session || session.role !== 'ADMIN') {
      console.log("Not authorized. Session role:", session?.role);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // DELETE - Delete a session
    if (req.method === 'DELETE') {
      try {
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ success: false, message: 'Session ID is required' });
        }
        
        // Check if session exists
        const existingSession = await prisma.pokerSession.findUnique({
          where: { id }
        });
        
        if (!existingSession) {
          return res.status(404).json({ success: false, message: 'Session not found' });
        }
        
        // Use a transaction to delete registrations first, then the session
        await prisma.$transaction(async (prisma) => {
          // Delete all registrations associated with this session
          await prisma.registration.deleteMany({
            where: { sessionId: id }
          });
          
          // Delete the session
          await prisma.pokerSession.delete({
            where: { id }
          });
        });
        
        return res.status(200).json({ success: true, message: 'Session deleted successfully' });
      } catch (error) {
        console.error('Error deleting session:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to delete session', 
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // PUT - Update a session
    if (req.method === 'PUT') {
      try {
        const { id } = req.query;
        const updateData = req.body;
        
        if (!id) {
          return res.status(400).json({ success: false, message: 'Session ID is required' });
        }
        
        // Check if session exists
        const existingSession = await prisma.pokerSession.findUnique({
          where: { id }
        });
        
        if (!existingSession) {
          return res.status(404).json({ success: false, message: 'Session not found' });
        }
        
        // Only allow updating certain fields
        const allowedFields = [
          'title', 'description', 'date', 'startTime', 'endTime', 
          'location', 'buyIn', 'minBuyIn', 'maxBuyIn', 'maxPlayers', 'status', 'type',
          'smallBlind', 'bigBlind'
        ];
        
        const filteredData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            // Handle date conversions
            if (['date', 'startTime', 'endTime'].includes(key) && updateData[key]) {
              obj[key] = new Date(updateData[key]);
            } else {
              obj[key] = updateData[key];
            }
            return obj;
          }, {});
        
        // Update the session
        const updatedSession = await prisma.pokerSession.update({
          where: { id },
          data: filteredData
        });
        
        return res.status(200).json({ 
          success: true, 
          message: 'Session updated successfully',
          session: updatedSession
        });
      } catch (error) {
        console.error('Error updating session:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update session', 
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // GET - List all sessions
    if (req.method === 'GET') {
      try {
        const sessions = await prisma.pokerSession.findMany({
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        return res.status(200).json({ 
          success: true, 
          sessions
        });
      } catch (error) {
        console.error('Error fetching sessions:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch sessions', 
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // If none of the above methods match
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Unexpected error in sessions/manage API:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 