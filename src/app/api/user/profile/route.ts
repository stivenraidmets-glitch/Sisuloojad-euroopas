import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const NAME_MAX = 100;
const EMAIL_MAX = 255;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id?: string }).id },
      select: { name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      name: user.name ?? "",
      email: user.email,
    });
  } catch (e) {
    console.error("Profile GET error:", e);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name =
      body.name !== undefined
        ? (typeof body.name === "string" ? body.name.trim().slice(0, NAME_MAX) : "")
        : undefined;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, EMAIL_MAX) : undefined;

    const data: { name?: string | null; email?: string } = {};
    if (name !== undefined) data.name = name || null;
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Palun sisesta kehtiv e-maili aadress." },
          { status: 400 }
        );
      }
      const existing = await prisma.user.findUnique({
        where: { email },
      });
      if (existing && existing.id !== (session.user as { id: string }).id) {
        return NextResponse.json(
          { error: "See e-mail on juba kasutusel." },
          { status: 400 }
        );
      }
      data.email = email;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Muuda vähemalt üht välja." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: (session.user as { id: string }).id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Profile PATCH error:", e);
    return NextResponse.json({ error: "Profiili uuendamine ebaõnnestus." }, { status: 500 });
  }
}
