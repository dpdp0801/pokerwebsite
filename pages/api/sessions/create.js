import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

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
        location,
      } = req.body;

      console.log("Received session data:", {
        type, date, time, buyIn, maxPlayers,
        smallBlind, bigBlind, minBuyIn, location
      });

      // Validate required fields
      if (!type || !date || !time || !maxPlayers) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: type, date, time, and maxPlayers are required."
        });
      }

      // Convert date and time strings to the final startTime Date object
      let startTimeDate;
      try {
        const [year, month, day] = date.split('-').map(n => parseInt(n, 10));
        const [hours, minutes] = time.split(':').map(n => parseInt(n, 10));
        
        // Create date object using the specific date and time
        // This assumes the server's local timezone is appropriate or consistent
        // If dealing with multiple timezones, use UTC or a library like date-fns-tz
        startTimeDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

        if (isNaN(startTimeDate.getTime())) {
             throw new Error('Invalid date or time resulted in NaN.');
        }
        
        console.log(`Parsed date ${date} and time ${time} into startTimeDate:`, 
                     startTimeDate.toISOString(), 
                     "Local string:", startTimeDate.toString());
      } catch (error) {
        console.error("Error parsing date/time:", error);
        return res.status(400).json({ 
          success: false, 
          message: `Invalid date or time format. Use YYYY-MM-DD and HH:MM. Error: ${error.message}` 
        });
      }
      
      // Set the 'date' field (used for sorting/display) to the start of the day 
      // in the *same timezone* as the startTimeDate for consistency.
      const dateOnly = new Date(startTimeDate);
      dateOnly.setHours(0, 0, 0, 0);
      
      console.log("Setting date field (for sorting/display) to:", 
                   dateOnly.toISOString(),
                   "Local string:", dateOnly.toString());

      // Validate specific fields based on type
      if (type.toUpperCase() === 'TOURNAMENT' && !buyIn) {
        return res.status(400).json({ 
          success: false, 
          message: "buyIn is required for tournament sessions."
        });
      }
      if (type.toUpperCase() === 'CASH_GAME' && (!smallBlind || !bigBlind || !minBuyIn)) {
        return res.status(400).json({ 
          success: false, 
          message: "smallBlind, bigBlind, and minBuyIn are required for cash game sessions."
        });
      }

      // Prepare session data based on type
      const sessionData = {
        title: type.toUpperCase() === 'TOURNAMENT' 
          ? `$${buyIn} buy-in 9-max NLH Tournament`
          : `$${smallBlind}/$${bigBlind} 9-max NLH Cash Game`,
        description: `9-max ${type.toUpperCase() === 'TOURNAMENT' ? 'tournament' : 'cash game'}`,
        type: type.toUpperCase(),
        date: dateOnly,
        startTime: startTimeDate,
        location: location || '385 S Catalina Ave, Apt 315',
        status: 'NOT_STARTED',
        maxPlayers: parseInt(maxPlayers, 10),
      };

      // Add type-specific fields
      if (type.toUpperCase() === 'TOURNAMENT') {
        sessionData.buyIn = parseInt(buyIn, 10);
      } else {
        sessionData.buyIn = parseInt(minBuyIn, 10);
        sessionData.minBuyIn = parseInt(minBuyIn, 10);
        sessionData.maxBuyIn = parseInt(minBuyIn, 10) * 2;
        sessionData.smallBlind = parseFloat(smallBlind);
        sessionData.bigBlind = parseFloat(bigBlind);
        sessionData.description = `$${smallBlind}/$${bigBlind} blinds, 9-max cash game`;
      }

      console.log("Prepared session data for database:", sessionData);

      // Create the session in the database
      try {
        console.log("Creating session with values:");
        console.log("Date (for sorting):", sessionData.date.toISOString());
        console.log("StartTime:", sessionData.startTime.toISOString());
        
        const createdSession = await prisma.pokerSession.create({
          data: {
            title: sessionData.title,
            description: sessionData.description,
            type: sessionData.type,
            date: sessionData.date,
            startTime: sessionData.startTime,
            location: sessionData.location,
            status: sessionData.status,
            maxPlayers: sessionData.maxPlayers,
            buyIn: sessionData.buyIn,
            minBuyIn: sessionData.minBuyIn,
            maxBuyIn: sessionData.maxBuyIn,
            smallBlind: sessionData.smallBlind,
            bigBlind: sessionData.bigBlind
          },
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