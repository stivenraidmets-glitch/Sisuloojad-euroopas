"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SEGMENTS = [
  { label: "10 krediiti", type: "CREDITS", value: 10 },
  { label: "Mitte midagi", type: "NOTHING", value: 0 },
  { label: "25 krediiti", type: "CREDITS", value: 25 },
  { label: "Tasuta paus!", type: "FREE_PENALTY", value: 0 },
  { label: "Mitte midagi", type: "NOTHING", value: 0 },
  { label: "10 krediiti", type: "CREDITS", value: 10 },
];

type WheelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpun: () => void;
};

export function WheelModal({ open, onOpenChange, onSpun }: WheelModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ type: string; value: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();

  const spin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await fetch("/api/wheel/spin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Spin failed");

      const outcome = data.result as { type: string; value: number };
      const segmentIndex = SEGMENTS.findIndex(
        (s) => s.type === outcome.type && s.value === outcome.value
      );
      const segmentAngle = 360 / SEGMENTS.length;
      const targetSegment = segmentIndex >= 0 ? segmentIndex : 0;
      const extraRotations = 5 * 360;
      const finalRotation = rotation + extraRotations + (SEGMENTS.length - targetSegment) * segmentAngle;
      setRotation(finalRotation);

      setTimeout(() => {
        setResult(outcome);
        setSpinning(false);
        onSpun();
        if (outcome.type === "CREDITS") {
          toast({ title: `Sa võitsid ${outcome.value} krediiti!` });
        } else if (outcome.type === "FREE_PENALTY") {
          toast({ title: "Sa võitsid tasuta 15 min pausi!" });
        } else {
          toast({ title: "Rohkem õnne järgmisel korral!" });
        }
      }, 5000);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Keerutus ebaõnnestus",
        variant: "destructive",
      });
      setSpinning(false);
    }
  }, [spinning, rotation, onSpun, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={!spinning} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keeruta ratast</DialogTitle>
          <DialogDescription>
            Üks keerutus kontole. Võida krediite või tasuta karistus!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative h-48 w-48">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary bg-muted"
              style={{
                background: `conic-gradient(${SEGMENTS.map(
                  (s, i) =>
                    `hsl(${200 + i * 40}, 70%, 45%) ${(i * 360) / SEGMENTS.length}deg ${((i + 1) * 360) / SEGMENTS.length}deg`
                ).join(", ")})`,
              }}
              animate={{ rotate: rotation }}
              transition={{ duration: 5, ease: "easeOut" }}
            />
            <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow" />
          </div>
          <AnimatePresence>
            {result && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-lg font-medium"
              >
                {result.type === "CREDITS" && `Sa võitsid ${result.value} krediiti!`}
                {result.type === "FREE_PENALTY" && "Sa võitsid tasuta karistuse!"}
                {result.type === "NOTHING" && "Seekord midagi ei tulnud!"}
              </motion.p>
            )}
          </AnimatePresence>
          <Button
            onClick={spin}
            disabled={spinning}
            size="lg"
          >
            {spinning ? "Keerutab…" : "Keeruta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
