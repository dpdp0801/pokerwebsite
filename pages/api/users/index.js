import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Check authentication and admin role
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch all users with email notification preferences
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          role: true,
          createdAt: true
          // Add other fields you want to include
        },
        orderBy: {
          name: 'asc'
        }
      });

      return res.status(200).json({
        success: true,
        users
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch users', 
        error: error.message 
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
} 