import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export default NextAuth({
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
          return {
            id: "admin",
            email: "admin@catalinapoker.com",
            name: "Admin",
            role: "ADMIN",
          };
        }
        return null;
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      // attach role once at login
      if (user?.role) token.role = user.role;
      else if (!token.role) token.role = "PLAYER";
      return token;
    },
    async session({ session, token }) {
      session.role = token.role;
      return session;
    },
  },
});