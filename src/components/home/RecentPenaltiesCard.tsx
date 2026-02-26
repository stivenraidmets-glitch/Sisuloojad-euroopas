"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PenaltyItem = {
  id: string;
  title: string;
  teamName: string;
  buyerName: string;
  createdAt: string;
};

function formatMinutesAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "praegu";
  if (diff === 1) return "1 min tagasi";
  return `${diff} min tagasi`;
}

export function RecentPenaltiesCard({
  penalties,
}: {
  penalties: PenaltyItem[];
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Viimased karistused</CardTitle>
        <CardDescription>Hiljuti ostetud sekkumised</CardDescription>
      </CardHeader>
      <CardContent>
        {penalties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Karistusi veel pole.</p>
        ) : (
          <ul className="space-y-2">
            {penalties.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex flex-col gap-0.5 text-sm"
              >
                <span className="font-medium">
                  {p.title} → {p.teamName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {p.buyerName} · {formatMinutesAgo(p.createdAt)}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
