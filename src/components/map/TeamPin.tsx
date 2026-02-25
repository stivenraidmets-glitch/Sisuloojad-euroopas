"use client";

import { motion } from "framer-motion";

type TeamPinProps = {
  teamId: number;
  name: string;
  color: string;
  updatedSecondsAgo?: number;
  onClick?: () => void;
};

export function TeamPin({
  teamId,
  name,
  color,
  updatedSecondsAgo,
  onClick,
}: TeamPinProps) {
  return (
    <motion.div
      className="absolute z-10 cursor-pointer"
      initial={false}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onClick={onClick}
    >
      <motion.div
        className="relative flex flex-col items-center"
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="h-8 w-8 rounded-full border-2 border-white shadow-lg"
          style={{ backgroundColor: color }}
        />
        <div className="mt-1 rounded bg-background/95 px-2 py-1 text-xs shadow backdrop-blur">
          <span className="font-medium">{name}</span>
          <span className="block text-muted-foreground">Approx. location</span>
          {updatedSecondsAgo != null && (
            <span className="block text-muted-foreground">
              Updated {updatedSecondsAgo}s ago
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
