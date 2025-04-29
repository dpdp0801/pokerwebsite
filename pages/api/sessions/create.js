import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/sessions/create called");
  
  // Check request method
  if (req.method !== 'POST') {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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

    console.log("Received session data:", {
      type, date, time, buyIn, maxPlayers,
      smallBlind, bigBlind, minBuyIn
    });

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
      maxPlayers: parseInt(maxPlayers, 10),
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

    console.log("Prepared session data for database:", sessionData);

    // Create the session in the database
    const createdSession = await prisma.pokerSession.create({
      data: sessionData,
    });

    console.log("Session created successfully:", createdSession.id);

    return res.status(200).json({
      success: true,
      message: 'Session created successfully',
      session: createdSession
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create session: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 