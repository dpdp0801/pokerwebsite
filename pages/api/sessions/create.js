import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Check request method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Check authentication and admin role
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  try {
    const {
      type,
      date,
      time,
      buyIn,
      maxPlayers,
      smallBlind,
      bigBlind,
      minBuyIn
    } = req.body;

    // Convert date and time strings to Date objects
    const dateObj = new Date(date);
    const [hours, minutes] = time.split(':');
    dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10));

    // Prepare session data based on type
    const sessionData = {
      title: type === 'mtt' 
        ? `$${buyIn} NLH Tournament`
        : `$${smallBlind}/$${bigBlind} NLH Cash Game`,
      description: `${maxPlayers}-max ${type === 'mtt' ? 'tournament' : 'cash game'}`,
      type: type.toUpperCase(),
      date: dateObj,
      startTime: dateObj,
      location: '385 S Catalina Ave', // Default location
      status: 'NOT_STARTED',
      maxPlayers,
    };

    // Add type-specific fields
    if (type === 'mtt') {
      sessionData.buyIn = parseInt(buyIn, 10);
    } else {
      // Cash game specific fields
      sessionData.buyIn = parseInt(minBuyIn, 10);
      sessionData.minBuyIn = parseInt(minBuyIn, 10);
      sessionData.maxBuyIn = parseInt(minBuyIn, 10) * 2; // Default max buy-in to 2x min
      sessionData.smallBlind = parseFloat(smallBlind);
      sessionData.bigBlind = parseFloat(bigBlind);
    }

    // Create the session in the database
    const createdSession = await prisma.pokerSession.create({
      data: sessionData,
    });

    return res.status(200).json({
      success: true,
      message: 'Session created successfully',
      session: createdSession
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 