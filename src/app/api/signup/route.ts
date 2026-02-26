import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_MAX = 255;
const NAME_MAX = 100;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "E-mail on kohustuslik." },
        { status: 400 }
      );
    }
    if (!username) {
      return NextResponse.json(
        { error: "Kasutajanimi on kohustuslik." },
        { status: 400 }
      );
    }
    if (email.length > EMAIL_MAX) {
      return NextResponse.json(
        { error: "E-mail on liiga pikk." },
        { status: 400 }
      );
    }
    if (username.length > NAME_MAX) {
      return NextResponse.json(
        { error: "Kasutajanimi on liiga pikk." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Palun sisesta kehtiv e-maili aadress." },
        { status: 400 }
      );
    }

    await prisma.pendingSignup.upsert({
      where: { email },
      update: { name: username },
      create: { email, name: username },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Signup API error:", e);
    return NextResponse.json(
      { error: "Registreerumine ebaõnnestus. Proovi hiljem uuesti." },
      { status: 500 }
    );
  }
}
