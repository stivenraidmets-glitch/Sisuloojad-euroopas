import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const handler = NextAuth(authOptions);

function wrappedHandler(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!process.env.NEXTAUTH_SECRET?.trim()) {
    return NextResponse.json(
      { error: "NEXTAUTH_SECRET is not set. Add it in Vercel → Settings → Environment Variables." },
      { status: 503 }
    );
  }
  return handler(req, context);
}

export { wrappedHandler as GET, wrappedHandler as POST };
