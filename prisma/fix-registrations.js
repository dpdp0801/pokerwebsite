const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database fix...');
    
    // 1. Get all sessions
    const sessions = await prisma.pokerSession.findMany();
    console.log(`Found ${sessions.length} sessions`);
    
    // 2. Get all registrations
    const registrations = await prisma.registration.findMany({
      include: {
        user: true
      }
    });
    console.log(`Found ${registrations.length} registrations`);
    
    if (sessions.length === 0) {
      console.log('No sessions to fix. You need to create a session first.');
      return;
    }
    
    // 3. Find active session
    const activeSession = sessions.find(s => s.status === 'ACTIVE');
    if (!activeSession) {
      console.log('No active session found. Creating one from the most recent session...');
      
      // Activate the most recent session if none is active
      const mostRecentSession = sessions.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];
      
      await prisma.pokerSession.update({
        where: { id: mostRecentSession.id },
        data: { status: 'ACTIVE' }
      });
      
      console.log(`Activated session: ${mostRecentSession.id}`);
    }
    
    // 4. Get the active session (either existing or newly activated)
    const currentActiveSession = activeSession || 
      await prisma.pokerSession.findFirst({ where: { status: 'ACTIVE' } });
    
    console.log(`Working with active session: ${currentActiveSession.id}`);
    
    // 5. Update registrations to CURRENT status if they're in CONFIRMED status
    const sessionsToFix = [currentActiveSession];
    
    for (const session of sessionsToFix) {
      console.log(`Fixing registrations for session ${session.id}`);
      
      // Get registrations for this session
      const sessionRegistrations = registrations.filter(r => r.sessionId === session.id);
      console.log(`Found ${sessionRegistrations.length} registrations for this session`);
      
      // Count current players, waitlisted, etc.
      const confirmedRegs = sessionRegistrations.filter(r => r.status === 'CONFIRMED');
      const waitlistedRegs = sessionRegistrations.filter(r => r.status === 'WAITLISTED');
      
      console.log(`Confirmed: ${confirmedRegs.length}, Waitlisted: ${waitlistedRegs.length}`);
      
      // Update all confirmed registrations to CURRENT status
      let updatedCount = 0;
      for (const reg of confirmedRegs) {
        if (reg.playerStatus !== 'CURRENT') {
          await prisma.registration.update({
            where: { id: reg.id },
            data: { playerStatus: 'CURRENT' }
          });
          updatedCount++;
        }
      }
      
      console.log(`Updated ${updatedCount} registrations to CURRENT status`);
      
      // Update session counts with the correct fields
      try {
        const sessionsRegs = await prisma.registration.findMany({
          where: { sessionId: session.id, status: 'CONFIRMED', playerStatus: 'CURRENT' }
        });
        
        console.log(`Found ${sessionsRegs.length} CURRENT registrations for session`);
        
        // Update session directly in database to avoid field name issues
        await prisma.$executeRaw`
          UPDATE "PokerSession" 
          SET "entries" = ${confirmedRegs.length},
              "updatedAt" = now()
          WHERE "id" = ${session.id}
        `;
        
        console.log(`Updated session entries to ${confirmedRegs.length}`);
      } catch (updateError) {
        console.error('Error updating session counts:', updateError);
      }
    }
    
    console.log('Database fix completed successfully');
  } catch (error) {
    console.error('Error during database fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 