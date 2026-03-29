import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const EMAIL_MAX = 255;
const NAME_MAX = 100;
const PASS_MIN = 8;
const PASS_MAX = 128;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";

    if (!email) {
      return NextResponse.json({ error: "E-mail on kohustuslik." }, { status: 400 });
    }
    if (!username) {
      return NextResponse.json({ error: "Kasutajanimi on kohustuslik." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Parool on kohustuslik." }, { status: 400 });
    }
    if (password.length < PASS_MIN) {
      return NextResponse.json(
        { error: `Parool peab olema vähemalt ${PASS_MIN} tähemärki.` },
        { status: 400 }
      );
    }
    if (password.length > PASS_MAX) {
      return NextResponse.json({ error: "Parool on liiga pikk." }, { status: 400 });
    }
    if (email.length > EMAIL_MAX || username.length > NAME_MAX) {
      return NextResponse.json({ error: "Sisend on liiga pikk." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Palun sisesta kehtiv e-maili aadress." }, { status: 400 });
    }

    if (!process.env.TURNSTILE_SECRET_KEY?.trim() && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Serveris pole Turnstile seadistatud. Võta ühendust administraatoriga." },
        { status: 503 }
      );
    }

    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    const remoteip = forwarded?.split(",")[0]?.trim();

    const humanOk = await verifyTurnstileToken(turnstileToken, remoteip);
    if (!humanOk) {
      return NextResponse.json(
        { error: "Kinnita, et oled inimene (Turnstile). Proovi uuesti." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Selle e-mailiga konto on juba olemas. Logi sisse." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        email,
        name: username,
        creditsBalance: 0,
        hasSpunWheel: false,
        passwordHash,
      },
    });

    await prisma.pendingSignup.deleteMany({ where: { email } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Signup API error:", e);
    return NextResponse.json(
      { error: "Registreerumine ebaõnnestus. Proovi hiljem uuesti." },
      { status: 500 }
    );
  }
}
