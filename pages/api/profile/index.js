import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      // Get user with their email
      const user = await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's registrations
      const registrations = await prisma.registration.findMany({
        where: {
          userId: user.id,
        },
        include: {
          session: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get user's game results
      const gameResults = await prisma.gameResult.findMany({
        where: {
          userId: user.id,
        },
        include: {
          session: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Calculate statistics
      const totalGames = gameResults.length;
      const tournaments = gameResults.filter(
        (game) => game.session.type === "TOURNAMENT"
      ).length;
      const cashGames = gameResults.filter(
        (game) => game.session.type === "CASH_GAME"
      ).length;
      
      // Calculate total buy-ins including rebuys and add-ons
      const totalBuyIns = gameResults.reduce(
        (sum, game) => sum + game.buyIn + (game.rebuys * game.session.buyIn) + (game.addOns * game.session.buyIn),
        0
      );
      
      // Calculate total winnings
      const totalWinnings = gameResults.reduce(
        (sum, game) => sum + game.winnings,
        0
      );
      
      // Calculate profit
      const profit = totalWinnings - totalBuyIns;
      
      // Calculate average tournament finish
      const tournamentResults = gameResults.filter(
        (game) => game.session.type === "TOURNAMENT" && game.position !== null
      );
      
      const avgFinish = tournamentResults.length > 0
        ? (tournamentResults.reduce((sum, game) => sum + game.position, 0) / tournamentResults.length).toFixed(1)
        : "N/A";
      
      // Calculate number of first place finishes
      const firstPlace = tournamentResults.filter(
        (game) => game.position === 1
      ).length;

      // Get upcoming games (registrations for sessions that haven't started)
      const upcomingGames = registrations.filter(
        (reg) => reg.session.status === "NOT_STARTED"
      );

      // Get current buy-in requests (registrations for active sessions)
      const currentBuyInRequests = registrations.filter(
        (reg) => reg.session.status === "ACTIVE"
      );

      return res.status(200).json({
        user,
        stats: {
          totalGames,
          tournaments,
          cashGames,
          totalBuyIns,
          totalWinnings,
          profit,
          avgFinish,
          firstPlace,
        },
        upcomingGames,
        currentBuyInRequests,
        gameHistory: gameResults,
      });
    } catch (error) {
      console.error("Error fetching profile data:", error);
      return res.status(500).json({ error: "Failed to fetch profile data" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
} 