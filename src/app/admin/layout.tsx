import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest?: string }).digest?.includes("NEXT_REDIRECT") === true
  );
}

const SessionErrorUI = () => (
  <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
    <h1 className="text-xl font-semibold">Admin – session error</h1>
    <p className="max-w-md text-center text-muted-foreground">
      Could not verify login (database or NEXTAUTH config). In Vercel set: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL. Then add ADMIN_EMAILS with your email (e.g. test@test.com) and redeploy.
    </p>
    <Link
      href="/login?callbackUrl=/admin&error=config"
      className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
    >
      Log in
    </Link>
  </div>
);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session: Session | null = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();
    if (!email) {
      redirect("/login?callbackUrl=/admin");
    }
    if (ADMIN_EMAILS.length === 0) {
      return (
        <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
          <h1 className="text-xl font-semibold">Admin – ADMIN_EMAILS not set</h1>
          <p className="max-w-md text-center text-muted-foreground">
            In Vercel (Settings → Environment Variables) add <strong>ADMIN_EMAILS</strong> with your email, e.g. <code className="rounded bg-muted px-1">test@test.com</code>. Then redeploy.
          </p>
          <Link href="/admin" className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">
            Try again
          </Link>
        </div>
      );
    }
    if (!ADMIN_EMAILS.includes(email)) {
      return (
        <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
          <h1 className="text-xl font-semibold">Admin – access denied</h1>
          <p className="max-w-md text-center text-muted-foreground">
            Your email ({email}) is not in the admin list. Add it to <strong>ADMIN_EMAILS</strong> in Vercel (comma-separated), then redeploy.
          </p>
          <Link href="/" className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">
            Back to home
          </Link>
        </div>
      );
    }
    return <>{children}</>;
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    console.error("Admin layout error:", e);
    return <SessionErrorUI />;
  }
}
