import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Initialize Prisma client outside of the handler function to reuse connections
const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/sessions/create called");
  
  // Check request method
  if (req.method !== 'POST') {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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

    try {
      const {
        type,
        date,
        time,
        buyIn,
        maxPlayers,
        smallBlind,
        bigBlind,
        minBuyIn,
        location
      } = req.body;

      console.log("Received session data:", {
        type, date, time, buyIn, maxPlayers,
        smallBlind, bigBlind, minBuyIn, location
      });

      // Convert date and time strings to Date objects
      let sessionDate;
      try {
        sessionDate = new Date(date);
        if (isNaN(sessionDate.getTime())) {
          throw new Error("Invalid date format");
        }
        
        // Parse time - make sure it's in HH:MM format
        const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timePattern.test(time)) {
          throw new Error("Invalid time format. Expected HH:MM");
        }
        
        const [hours, minutes] = time.split(':');
        sessionDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      } catch (error) {
        console.error("Error parsing date/time:", error);
        return res.status(400).json({ 
          success: false, 
          message: "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time." 
        });
      }

      // Make sure we have required fields
      if (!type || !date || !time || !maxPlayers) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: type, date, time, and maxPlayers are required."
        });
      }

      // Validate specific fields based on type
      if (type.toLowerCase() === 'mtt' && !buyIn) {
        return res.status(400).json({ 
          success: false, 
          message: "buyIn is required for tournament sessions."
        });
      }

      if (type.toLowerCase() === 'cash' && (!smallBlind || !bigBlind || !minBuyIn)) {
        return res.status(400).json({ 
          success: false, 
          message: "smallBlind, bigBlind, and minBuyIn are required for cash game sessions."
        });
      }

      // Prepare session data based on type
      const sessionData = {
        title: type.toLowerCase() === 'mtt' 
          ? `$${buyIn} NLH Tournament`
          : `$${smallBlind}/$${bigBlind} NLH Cash Game`,
        description: `${maxPlayers}-max ${type.toLowerCase() === 'mtt' ? 'tournament' : 'cash game'}`,
        type: type.toUpperCase(),
        date: sessionDate,
        startTime: sessionDate,
        location: location || '385 S Catalina Ave', // Use provided location or default
        status: 'NOT_STARTED',
        maxPlayers: parseInt(maxPlayers, 10),
      };

      // Add type-specific fields
      if (type.toLowerCase() === 'mtt') {
        sessionData.buyIn = parseInt(buyIn, 10);
      } else {
        // Cash game specific fields - store values in the title/description only since the schema doesn't have smallBlind/bigBlind fields
        sessionData.buyIn = parseInt(minBuyIn, 10);
        sessionData.minBuyIn = parseInt(minBuyIn, 10);
        sessionData.maxBuyIn = parseInt(minBuyIn, 10) * 2; // Default max buy-in to 2x min
        
        // Store blind information in the description instead
        sessionData.description = `$${smallBlind}/$${bigBlind} blinds, ${maxPlayers}-max cash game`;
      }

      console.log("Prepared session data for database:", sessionData);

      // Create the session in the database
      try {
        const createdSession = await prisma.pokerSession.create({
          data: sessionData,
        });

        console.log("Session created successfully:", createdSession.id);

        return res.status(200).json({
          success: true,
          message: 'Session created successfully',
          session: createdSession
        });
      } catch (dbError) {
        console.error('Database error creating session:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error: ' + dbError.message,
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
    } catch (processError) {
      console.error('Error processing request:', processError);
      return res.status(400).json({
        success: false,
        message: 'Invalid request data: ' + processError.message,
        error: process.env.NODE_ENV === 'development' ? processError.message : undefined
      });
    }
  } catch (error) {
    console.error('Unexpected error in session creation:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 