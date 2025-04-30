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
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            firstName: true,
            lastName: true,
            name: true,
            venmoId: true
          }
        });
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        console.log("Retrieved user settings:", user);
        
        return res.status(200).json({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          name: user.name || "",
          venmoId: user.venmoId || ""
        });
      } catch (error) {
        console.error("Error fetching user settings:", error);
        return res.status(500).json({ message: "Error fetching user settings", error: error.message });
      }
    }
    
    // PUT request - update user settings
    if (req.method === "PUT") {
      const { firstName, lastName, venmoId } = req.body;
      
      // Validate the data
      if (firstName !== undefined && typeof firstName !== "string") {
        return res.status(400).json({ message: "Invalid first name" });
      }
      
      if (lastName !== undefined && typeof lastName !== "string") {
        return res.status(400).json({ message: "Invalid last name" });
      }
      
      if (venmoId !== undefined && typeof venmoId !== "string") {
        return res.status(400).json({ message: "Invalid Venmo ID" });
      }
      
      console.log("Updating user settings:", { userId, firstName, lastName, venmoId });
      
      // Update the user with proper handling of empty values
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (venmoId !== undefined) updateData.venmoId = venmoId || null;
      
      try {
        // Update the user
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData
        });
        
        console.log("User updated successfully:", updatedUser);
        
        return res.status(200).json({
          firstName: updatedUser.firstName || "",
          lastName: updatedUser.lastName || "",
          name: updatedUser.name || "",
          venmoId: updatedUser.venmoId || ""
        });
      } catch (dbError) {
        console.error("Database error updating user:", dbError);
        return res.status(500).json({ message: "Failed to update user data", error: dbError.message });
      }
    }
    
    // Method not allowed
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Error handling user settings:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
} 