import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Chatbox } from "@/components/chat/Chatbox";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paris → Tallinn võistlus (rahata)",
  description: "Jälgi võistlust kaardil reaalajas. Hääleta, osta sekkumisi, keeruta ratast.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="et" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AnimatedBackground />
          <Header />
          <div className="flex min-h-[calc(100vh-3.5rem)]">
            <main className="min-w-0 flex-1">{children}</main>
            <Chatbox />
          </div>
        </Providers>
      </body>
    </html>
  );
}
