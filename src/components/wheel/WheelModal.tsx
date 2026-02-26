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

// 4 segments shown on wheel (probabilities handled server-side)
const SEGMENTS = [
  { label: "Mitte midagi", type: "NOTHING", value: 0 },
  { label: "Keeruta uuesti", type: "RESPIN", value: 0 },
  { label: "50% soodustus", type: "HALF_OFF_PENALTY", value: 50 },
  { label: "Tasuta karistus", type: "FREE_PENALTY", value: 0 },
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
          toast({ title: "Sa võitsid tasuta karistuse!" });
        } else if (outcome.type === "HALF_OFF_PENALTY") {
          toast({ title: "Sa võitsid 50% soodustuse järgmisele karistusele!" });
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
          <div className="relative h-52 w-52">
            <motion.div
              className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-primary bg-muted text-center text-sm font-medium"
              style={{
                background: `conic-gradient(from 0deg, hsl(240, 50%, 35%) 0deg 90deg, hsl(280, 50%, 35%) 90deg 180deg, hsl(320, 55%, 38%) 180deg 270deg, hsl(160, 50%, 35%) 270deg 360deg)`,
              }}
              animate={{ rotate: rotation }}
              transition={{ duration: 5, ease: "easeOut" }}
            >
              {/* Segment labels as overlay - 4 quadrants */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-full w-full rounded-full">
                  <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-xs text-white drop-shadow-md">
                    {SEGMENTS[0].label}
                  </span>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-right text-xs text-white drop-shadow-md">
                    {SEGMENTS[1].label}
                  </span>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white drop-shadow-md">
                    {SEGMENTS[2].label}
                  </span>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-white drop-shadow-md">
                    {SEGMENTS[3].label}
                  </span>
                </div>
              </div>
            </motion.div>
            <div className="pointer-events-none absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary shadow-lg" />
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
                {result.type === "HALF_OFF_PENALTY" && "Sa võitsid 50% soodustuse järgmisele karistusele!"}
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
