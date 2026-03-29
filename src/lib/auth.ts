import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import { verifyPassword } from "./password";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "E-mail ja parool",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Parool", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            hasSpunWheel: true,
            passwordHash: true,
          },
        });
        if (!user?.passwordHash) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          hasSpunWheel: user.hasSpunWheel,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      let dbUser: { id: string; email: string; name: string | null; hasSpunWheel: boolean } | null = null;
      if (user?.email) {
        dbUser = await prisma.user.findUnique({
          where: (user as { id?: string }).id
            ? { id: (user as { id: string }).id }
            : { email: user.email },
          select: { id: true, email: true, name: true, hasSpunWheel: true },
        });
      } else if (token.userId) {
        dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { id: true, email: true, name: true, hasSpunWheel: true },
        });
      }
      if (dbUser) {
        token.userId = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.name ?? null;
        token.hasSpunWheel = dbUser.hasSpunWheel;
        token.isAdmin = ADMIN_EMAILS.includes(dbUser.email.toLowerCase());
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { hasSpunWheel?: boolean }).hasSpunWheel = token.hasSpunWheel as boolean;
        (session.user as { name?: string | null }).name = (token.name as string | null) ?? null;
        (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};
