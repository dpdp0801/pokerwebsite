import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { kv } from '@vercel/kv';

export default NextAuth({
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
          // Store admin user in KV
          const admin = {
            id: "admin",
            email: "admin@catalinapoker.com",
            name: "Admin",
            role: "ADMIN"
          };
          await kv.set(`user:${admin.email}`, admin);
          return admin;
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        // Store user in KV if it's a new Google sign-in
        if (user.email && !user.id.startsWith('admin')) {
          await kv.set(`user:${user.email}`, user);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) {
        // Get user data from KV
        const user = await kv.get(`user:${token.email}`);
        if (user) {
          session.user = user;
        }
      }
      return session;
    },
  },
});