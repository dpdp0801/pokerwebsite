import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Create a custom adapter based on the PrismaAdapter that handles special fields
const customPrismaAdapter = {
  ...PrismaAdapter(prisma),
  createUser: async (data) => {
    // Remove non-schema properties before passing to Prisma
    const { isNewUser, ...userData } = data;
    
    // Call the original adapter method with clean data
    return await prisma.user.create({ data: userData });
  },
};

export const authOptions = {
  dangerousEmailAccountLinking: true,   // auto-link same-email accounts
  adapter: customPrismaAdapter,
  debug: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Admin Password",
      credentials: { password: { label: "Password", type: "password" } },
      async authorize(cred) {
        if (cred?.password === process.env.ADMIN_PASSWORD) {
          // Create or get admin user
          let adminUser = await prisma.user.findFirst({
            where: { email: "admin@catalinapoker.com" }
          });
          
          if (!adminUser) {
            adminUser = await prisma.user.create({
              data: {
                email: "admin@catalinapoker.com",
                name: "Admin",
                role: "ADMIN",
              }
            });
          }
          
          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: "ADMIN",
          };
        }
        return null;
      },
    }),
  ],

  pages: {
    error: '/',
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Rely on default cookie settings (NextAuth will automatically use
  // `__Secure-` prefixes in production environments when appropriate.)
  useSecureCookies: true,

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("Sign-in callback triggered", { user, account, profile });
      
      // Check if this might be a new account
      if (account?.provider === 'google' && account?.providerAccountId) {
        try {
          // Check if this user already has a complete profile (venmoId)
          const dbUser = await prisma.user.findFirst({
            where: { 
              email: user.email 
            },
            select: {
              id: true,
              venmoId: true,
              _count: {
                select: { 
                  sessions: true 
                }
              }
            }
          });
          
          // If user exists but has no venmoId or this is their first session,
          // mark them as needing to complete profile
          if (dbUser) {
            if (!dbUser.venmoId || dbUser._count.sessions === 0) {
              user.isNewUser = true;
            }
          } else {
            // Brand new user
            user.isNewUser = true;
            
            // If user has first/last name from Google, use it
            if (profile?.given_name) {
              user.firstName = profile.given_name;
            }
            if (profile?.family_name) {
              user.lastName = profile.family_name;
            }
          }
        } catch (error) {
          console.error("Error checking new user status:", error);
        }
      }
      
      // no manual upsert; let the PrismaAdapter handle user + account creation
      return true;
    },
    
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback triggered", { url, baseUrl });
      
      // Check if the URL contains a newUser flag that the signIn callback added
      const isNewUserRedirect = url.includes('?newUser=true');
      
      if (isNewUserRedirect) {
        // Redirect new users to complete their profile
        return `${baseUrl}/settings?new=true`;
      }
      
      // Honor the intended URL instead of always redirecting to home
      // This is important for maintaining admin session state
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
    
    async jwt({ token, user }) {
      console.log("JWT callback triggered", { token, user });
      
      // Attach role once at login
      if (user?.role) token.role = user.role;
      else if (!token.role) token.role = "PLAYER";
      
      // Handle new user flag for redirecting to settings
      if (user?.isNewUser) {
        token.isNewUser = true;
      }
      
      // If we have user data (during sign in), add the database ID to the token
      if (user?.id) {
        token.userId = user.id;
      } else if (!token.userId) {
        // If no userId in token yet, look it up from the database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          });
          
          if (dbUser) {
            token.userId = dbUser.id;
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      console.log("Session callback triggered", { session, token });
      
      // Add role and userId to the session
      session.role = token.role;
      session.user.id = token.userId;
      session.user.role = token.role;
      session.user.isAdmin = token.role === "ADMIN";
      
      // Fetch fresh user data from the database to ensure firstName and lastName are available
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
          select: { 
            firstName: true,
            lastName: true
          }
        });
        
        if (dbUser) {
          // Add firstName and lastName to session
          session.user.firstName = dbUser.firstName;
          session.user.lastName = dbUser.lastName;
        }
      } catch (error) {
        console.error("Error fetching user data for session:", error);
      }
      
      // If this is a new user, add redirect info to the URL
      if (token.isNewUser) {
        session.newUser = true;
      }
      
      return session;
    },
  },
  
  events: {
    async signIn(message) {
      console.log("signIn event", message);
    },
    async signOut(message) {
      console.log("signOut event", message);
    },
    async createUser(message) {
      console.log("createUser event", message);
    },
    async error(message) {
      console.error("NextAuth error event", message);
    },
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}; 