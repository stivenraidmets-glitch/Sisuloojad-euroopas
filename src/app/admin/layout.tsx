import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: Session | null = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.error("Admin layout session error:", e);
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
        <h1 className="text-xl font-semibold">Halduspaneel – sessiooni viga</h1>
        <p className="max-w-md text-center text-muted-foreground">
          Sisselogimise kontroll ebaõnnestus (andmebaas või NEXTAUTH seaded). Kontrolli Vercelis: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL.
        </p>
        <Link
          href="/login?callbackUrl=/admin&error=config"
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Logi sisse
        </Link>
      </div>
    );
  }
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    redirect("/login?callbackUrl=/admin");
  }
  return <>{children}</>;
}
