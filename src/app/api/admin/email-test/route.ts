import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Admin-only: test Resend API key. GET /api/admin/email-test
 * Parses API key from EMAIL_SERVER and verifies it works.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const server = process.env.EMAIL_SERVER?.trim();
    if (!server) {
      return NextResponse.json({
        ok: false,
        error: "EMAIL_SERVER is not set in Vercel",
      });
    }

    // Parse API key from smtp://resend:KEY@smtp.resend.com:465
    let apiKey = "";
    try {
      const url = new URL(server);
      apiKey = url.password || "";
    } catch {
      return NextResponse.json({
        ok: false,
        error: "EMAIL_SERVER format invalid. Expected: smtp://resend:API_KEY@smtp.resend.com:465",
      });
    }
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: "API key missing in EMAIL_SERVER (password part)",
      });
    }

    const from = process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Resend test – Alustame Nullist",
        html: "<p>See on test. E-mail töötab!</p>",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: data.message || data.error || `Resend API ${res.status}: ${JSON.stringify(data)}`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Test email sent! Check your inbox.",
      id: data.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Email test error:", e);
    return NextResponse.json({
      ok: false,
      error: message,
    });
  }
}
