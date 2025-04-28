import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Admin Password",
      credentials: { password: { label: "Password", type: "password" } },
      async authorize(creds) {
        if (creds.password === process.env.ADMIN_PASSWORD) {
          // Upsert a single admin row keyed by a fixed email
          const admin = await prisma.user.upsert({
            where: { email: "admin@catalinapoker.com" },
            update: { role: "ADMIN" },
            create: {
              email: "admin@catalinapoker.com",
              name: "Admin",
              role: "ADMIN",
            },
          });
          return admin;
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      session.role = token.role;
      return session;
    },
  },
});