import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/buyins called with method:", req.method);
  
  try {
    // Check authentication - any authenticated user can view 
    // (though admin will see all, regular users only see their own)
    const session = await getServerSession(req, res, authOptions);
    
    // GET - List buy-in requests
    if (req.method === 'GET') {
      try {
        // For now, return an empty array until implemented
        return res.status(200).json({ 
          success: true, 
          buyInRequests: []
        });
      } catch (error) {
        console.error('Error fetching buy-in requests:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch buy-in requests', 
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // POST - Create a new buy-in request
    if (req.method === 'POST') {
      try {
        // Simple validation
        const { sessionId, amount } = req.body;
        
        if (!sessionId || !amount) {
          return res.status(400).json({ 
            success: false, 
            message: 'Session ID and amount are required' 
          });
        }
        
        // TODO: Implement actual creation in database
        
        return res.status(200).json({ 
          success: true, 
          message: 'Buy-in request created',
          buyInRequest: {
            id: 'placeholder-id',
            sessionId,
            amount,
            status: 'pending',
            createdAt: new Date()
          }
        });
      } catch (error) {
        console.error('Error creating buy-in request:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create buy-in request', 
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // If none of the above methods match
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  } catch (error) {
    console.error('Unexpected error in buyins API:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 