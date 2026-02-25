import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";

const isDevLoginEnabled =
  process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_LOGIN === "1";

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
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
              creditsBalance: 0,
              hasSpunWheel: false,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        const dbUser =
          (user as { id?: string }).id
            ? await prisma.user.findUnique({ where: { id: (user as { id: string }).id } })
            : await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token.userId = dbUser.id;
          token.hasSpunWheel = dbUser.hasSpunWheel;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { hasSpunWheel?: boolean }).hasSpunWheel = token.hasSpunWheel as boolean;
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
