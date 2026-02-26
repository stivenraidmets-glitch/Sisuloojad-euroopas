"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MapPin, LogIn, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl dark:bg-background/70">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Paris → Tallinn võistlus</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/team/1">
            <Button variant="ghost" size="sm">Kozip</Button>
          </Link>
          <Link href="/team/2">
            <Button variant="ghost" size="sm">Stiven ja Sidni</Button>
          </Link>
          <ThemeToggle />
          {status === "loading" ? (
            <span className="text-sm text-muted-foreground">...</span>
          ) : session ? (
            <>
              <span className="max-w-[140px] truncate text-sm text-muted-foreground" title={session.user?.email ?? undefined}>
                {(session.user as { name?: string | null })?.name || session.user?.email}
              </span>
              <Link href="/settings">
                <Button variant="ghost" size="icon" title="Konto seaded">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/api/auth/signout">
                <Button variant="ghost" size="icon" title="Logi välja">
                  <LogOut className="h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button variant="ghost" size="sm">Registreeru</Button>
              </Link>
              <Link href="/login">
                <Button variant="default" size="sm">
                  <LogIn className="mr-1 h-4 w-4" />
                  Logi sisse
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
