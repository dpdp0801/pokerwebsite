import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma Client
const prisma = new PrismaClient();

export const authOptions = {
  dangerousEmailAccountLinking: true,   // auto-link same-email accounts
  adapter: PrismaAdapter(prisma),
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
      
      // no manual upsert; let the PrismaAdapter handle user + account creation
      return true;
    },
    
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback triggered", { url, baseUrl });
      
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