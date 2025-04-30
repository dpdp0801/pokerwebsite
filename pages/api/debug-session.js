import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // Get current user session
    const session = await getServerSession(req, res, authOptions);
    
    // Ensure user is authenticated and is admin
    if (!session?.user?.isAdmin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Get raw data directly from database
    const activeSession = await prisma.pokerSession.findFirst({
      where: {
        status: {
          in: ['NOT_STARTED', 'ACTIVE']
        },
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    if (!activeSession) {
      return res.status(404).json({ error: "No active session found" });
    }
    
    // Get all registrations for this session from database
    const registrations = await prisma.registration.findMany({
      where: {
        sessionId: activeSession.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });
    
    // Prepare the debug data
    const debugData = {
      timestamp: new Date().toISOString(),
      session: activeSession,
      registrations: registrations.map(reg => ({
        id: reg.id,
        userName: reg.user?.name || "Unknown",
        status: reg.status,
        playerStatus: reg.playerStatus,
        isRebuy: reg.isRebuy,
        rebuys: reg.rebuys,
        createdAt: reg.createdAt
      }))
    };
    
    // Save debug data to a file
    const debugFilePath = path.join(process.cwd(), 'public', 'debug', 'session-debug.json');
    fs.writeFileSync(debugFilePath, JSON.stringify(debugData, null, 2));
    
    return res.status(200).json({ 
      message: "Debug data saved successfully",
      debugUrl: "/debug/session-debug.json",
      data: debugData
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
} 