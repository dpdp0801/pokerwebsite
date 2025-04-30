import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    // Get current user session
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = session.user.id;
    
    // GET request - fetch user settings
    if (req.method === "GET") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          venmoId: true,
          emailNotifications: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({
        name: user.name || "",
        venmoId: user.venmoId || "",
        emailNotifications: user.emailNotifications !== null ? user.emailNotifications : true
      });
    }
    
    // PUT request - update user settings
    if (req.method === "PUT") {
      const { name, venmoId, emailNotifications } = req.body;
      
      // Validate the data
      if (name && typeof name !== "string") {
        return res.status(400).json({ message: "Invalid name" });
      }
      
      if (venmoId && typeof venmoId !== "string") {
        return res.status(400).json({ message: "Invalid Venmo ID" });
      }
      
      // Update the user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          venmoId: venmoId || null,
          emailNotifications: typeof emailNotifications === "boolean" ? emailNotifications : undefined
        }
      });
      
      return res.status(200).json({
        name: updatedUser.name,
        venmoId: updatedUser.venmoId || "",
        emailNotifications: updatedUser.emailNotifications !== null ? updatedUser.emailNotifications : true
      });
    }
    
    // Method not allowed
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Error handling user settings:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
} 