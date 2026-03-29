import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { SiteLoadingGate } from "@/components/layout/SiteLoadingGate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sisuloojad Euroopas",
  description:
    "Sisuloojad Euroopas – jälgi tiime kaardil reaalajas, hääleta, osta karistusi ja keeruta loosratast.",
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
          <SiteLoadingGate>
            <div className="flex h-screen flex-col md:flex-row">{children}</div>
          </SiteLoadingGate>
        </Providers>
      </body>
    </html>
  );
}
