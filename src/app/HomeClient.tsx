"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { WheelModal } from "@/components/wheel/WheelModal";

type PenaltyItem = {
  id: string;
  teamName: string;
  title: string;
  status: string;
  createdAt: string;
};

export function HomeClient({
  team1Name,
  team2Name,
  recentPenalties,
}: {
  team1Name: string;
  team2Name: string;
  recentPenalties: PenaltyItem[];
}) {
  const { data: session, status } = useSession();
  const [wheelOpen, setWheelOpen] = useState(false);
  const [showWheelCta, setShowWheelCta] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const hasSpun = (session.user as { hasSpunWheel?: boolean }).hasSpunWheel;
      setShowWheelCta(!hasSpun);
    }
  }, [status, session]);

  return (
    <>
      {showWheelCta && (
        <div className="rounded-lg border bg-primary/10 p-4 text-center">
          <p className="mb-2 font-medium">Sul on üks tasuta keerutus!</p>
          <Button onClick={() => setWheelOpen(true)}>Keeruta ratast</Button>
        </div>
      )}
      <WheelModal
        open={wheelOpen}
        onOpenChange={setWheelOpen}
        onSpun={() => setShowWheelCta(false)}
      />
    </>
  );
}
