"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

/** Time progress bar + minimum wait before fade-out (ms) */
const MIN_MS = 2800;
const EXIT_S = 0.55;

type SiteLoadingGateProps = { children: React.ReactNode };

export function SiteLoadingGate({ children }: SiteLoadingGateProps) {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "";
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isHome) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), MIN_MS);
    return () => window.clearTimeout(t);
  }, [isHome]);

  return (
    <>
      {children}
      {isHome && (
        <AnimatePresence>
          {visible && (
            <motion.div
              key="site-loader"
              className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: EXIT_S, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden
            >
              <div className="flex max-w-md flex-col items-center gap-6 px-6 text-center">
                <motion.div
                  className="text-2xl font-bold tracking-tight md:text-3xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  Sisuloojad Euroopas
                </motion.div>
                <p className="text-sm text-muted-foreground md:text-base">
                  Jälgi tiime kaardil reaalajas
                </p>
                <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: MIN_MS / 1000, ease: "linear" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Laadime kaarti ja paneeli…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
