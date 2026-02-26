import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";

const isDevLoginEnabled = process.env.ENABLE_DEV_LOGIN === "1";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    ...(isDevLoginEnabled
      ? [
          CredentialsProvider({
            name: "Dev login",
            credentials: {
              email: { label: "Email", type: "text" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (
                credentials?.email === "test@test.com" &&
                credentials?.password === "dev"
              ) {
                let user = await prisma.user.findUnique({
                  where: { email: "test@test.com" },
                });
                if (!user) {
                  user = await prisma.user.create({
                    data: {
                      email: "test@test.com",
                      creditsBalance: 0,
                      hasSpunWheel: false,
                    },
                  });
                }
                return { id: user.id, email: user.email!, hasSpunWheel: user.hasSpunWheel };
              }
              return null;
            },
          }),
        ]
      : []),
    ...(process.env.EMAIL_SERVER
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM ?? "noreply@localhost",
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        const pending = await prisma.pendingSignup.findUnique({
          where: { email: user.email },
        });
        const nameToSet = pending?.name ?? user.name ?? null;

        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: nameToSet,
              image: user.image ?? null,
              creditsBalance: 0,
              hasSpunWheel: false,
            },
          });
        } else if (nameToSet) {
          await prisma.user.update({
            where: { email: user.email },
            data: { name: nameToSet },
          });
        }

        if (pending) {
          await prisma.pendingSignup.delete({ where: { email: user.email } }).catch(() => {});
        }
      }
      return true;
    },
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { hasSpunWheel?: boolean }).hasSpunWheel = token.hasSpunWheel as boolean;
        (session.user as { name?: string | null }).name = (token.name as string | null) ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await prisma.user.update({
        where: { email: user.email! },
        data: { creditsBalance: 0, hasSpunWheel: false },
      });
    },
  },
};
